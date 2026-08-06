import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { UserAccount, Pegawai, Role } from '../types';
import { hashPassword, generateDefaultPassword, sha256, parseBirthDateFromNipOrDate, Storage } from '../lib/storage';
import { TvriSumselLogo } from './TvriSumselLogo';

interface LoginModalProps {
  usersList: UserAccount[];
  pegawaiList: Pegawai[];
  onLoginSuccess: (user: UserAccount, pegawai: Pegawai | null) => void;
  onChangePasswordSubmit?: (userId: string, oldPass: string, newPass: string) => boolean;
  isChangePasswordOnly?: boolean;
  onCloseModal?: () => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  usersList,
  pegawaiList,
  onLoginSuccess,
  onChangePasswordSubmit,
  isChangePasswordOnly = false,
  onCloseModal,
  onShowSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeMsg, setChangeMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInput = username.trim();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMsg('Silakan masukkan Username atau NIP Pegawai.');
      return;
    }

    // 1. Search in Pegawai list (by NIP or ID)
    const matchedPegawai = pegawaiList.find(
      p => p.nip === cleanInput || p.id === cleanInput || (p.nip && p.nip.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
    );

    // 2. Search in User accounts list
    let matchedUser = usersList.find(
      u => u.username === cleanInput || (matchedPegawai && u.employeeId === matchedPegawai.id)
    );

    // If Pegawai exists in DB but UserAccount missing, sync/create UserAccount on the fly
    if (matchedPegawai && !matchedUser) {
      const defaultPass = generateDefaultPassword(matchedPegawai.tanggalLahir, matchedPegawai.nip);
      const newUser: UserAccount = {
        id: `USR_${Date.now()}`,
        employeeId: matchedPegawai.id,
        username: matchedPegawai.nip,
        passwordHash: sha256(defaultPass),
        role: 'PEGAWAI',
        isFirstLogin: true,
        isActive: matchedPegawai.aktif !== false,
        createdAt: new Date().toISOString()
      };
      await Storage.saveUser(newUser);
      matchedUser = newUser;
      console.log(`[AUTH LOGIN] Dynamic UserAccount provisioned for Pegawai ${matchedPegawai.nama} (${matchedPegawai.nip})`);
    }

    // Validation Check A: Neither Pegawai nor UserAccount found
    if (!matchedPegawai && !matchedUser) {
      console.warn(`[AUTH FAIL] Username / NIP "${cleanInput}" tidak ditemukan dalam database.`);
      setErrorMsg(`Username (NIP: ${cleanInput}) tidak ditemukan dalam database TVRI Sumsel.`);
      return;
    }

    // Validation Check B: Pegawai data status is inactive
    if (matchedPegawai && matchedPegawai.aktif === false) {
      console.warn(`[AUTH FAIL] Pegawai ${matchedPegawai.nama} (${matchedPegawai.nip}) berstatus NON-AKTIF.`);
      setErrorMsg(`Akun pegawai ${matchedPegawai.nama} (NIP: ${matchedPegawai.nip}) berstatus non-aktif. Silakan hubungi Admin SDM.`);
      return;
    }

    // Validation Check C: UserAccount status is inactive
    if (matchedUser && !matchedUser.isActive) {
      console.warn(`[AUTH FAIL] UserAccount ${matchedUser.username} berstatus NON-AKTIF.`);
      setErrorMsg(`Akun pengguna untuk NIP ${cleanInput} telah dinonaktifkan. Silakan hubungi Admin SDM.`);
      return;
    }

    if (!matchedUser) {
      setErrorMsg('Gagal memverifikasi akun pengguna. Silakan coba lagi.');
      return;
    }

    // 3. Strictly Verify Password against UserAccount.passwordHash
    const inputHash = hashPassword(cleanPass);
    let isPassValid = matchedUser.passwordHash === inputHash;

    // Legacy unhashed string fallback check
    if (!isPassValid && matchedUser.passwordHash === cleanPass) {
      isPassValid = true;
      matchedUser.passwordHash = inputHash;
      await Storage.saveUser(matchedUser);
    }

    if (!isPassValid) {
      console.warn(`[AUTH FAIL] Password salah untuk NIP ${cleanInput}.`);
      setErrorMsg('Password yang Anda masukkan salah.');
      return;
    }

    console.log(`[AUTH SUCCESS] User ${matchedUser.username} (${matchedPegawai?.nama || 'Pegawai'}) berhasil login.`);
    onLoginSuccess(matchedUser, matchedPegawai || null);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeMsg('');

    if (newPassword.length < 4) {
      setChangeMsg('Password baru minimal 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeMsg('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (onChangePasswordSubmit) {
      const ok = onChangePasswordSubmit('current', oldPassword, newPassword);
      if (ok) {
        if (onShowSuccess) {
          onShowSuccess({
            title: 'Password Berhasil Diperbarui',
            message: 'Kata sandi akun Anda telah diperbarui dengan aman.',
            badge: 'KEAMANAN AKUN',
            type: 'success'
          });
        }
        if (onCloseModal) onCloseModal();
      } else {
        setChangeMsg('Password lama salah.');
      }
    }
  };

  if (isChangePasswordOnly) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Ganti Password Akun SIAP SUMSEL</span>
            </h3>
            {onCloseModal && (
              <button onClick={onCloseModal} className="text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
            )}
          </div>

          {changeMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl text-xs font-bold">
              {changeMsg}
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Password Saat Ini</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password Baru</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Ulangi Password Baru</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              {onCloseModal && (
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl font-bold"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded-xl shadow"
              >
                Simpan Password Baru
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-800">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <TvriSumselLogo className="h-12" badge={true} />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-wider mt-2">
            SIAP
          </h2>
          <p className="text-xs font-bold text-blue-900 tracking-wide">
            Sistem Informasi Administrasi Pelatihan
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            TVRI Stasiun Sumatera Selatan • <span className="italic font-bold text-amber-600">Belajar. Berkembang. Berprestasi.</span>
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Username (NIP Pegawai)</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Masukkan NIP Pegawai..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md"
          >
            Masuk Ke Sistem SIAP SUMSEL
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
          LPP TVRI Stasiun Sumatera Selatan • Palembang
        </div>
      </div>
    </div>
  );
};
