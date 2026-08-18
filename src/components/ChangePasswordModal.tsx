import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Key, ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { UserAccount } from '../types';
import { Storage } from '../lib/storage';

interface ChangePasswordModalProps {
  currentUser: UserAccount;
  isMandatory?: boolean;
  onSuccess: (message: string) => void;
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isMandatory = false,
  onSuccess,
  onClose
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    // 1. Validation: Old Password (if voluntary)
    if (!isMandatory && !cleanOld) {
      setErrorMsg('Silakan masukkan password lama Anda.');
      return;
    }

    // 2. Validation: New Password length (min 8 chars)
    if (cleanNew.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter.');
      return;
    }

    // 3. Validation: Confirmation Password match
    if (cleanNew !== cleanConfirm) {
      setErrorMsg('Konfirmasi password tidak sesuai.');
      return;
    }

    setIsSubmitting(true);

    // Call Storage handler
    const result = await Storage.changeUserPassword(
      currentUser.id,
      cleanOld,
      cleanNew,
      isMandatory
    );

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    // Trigger success callback (which handles logout and redirect to login page with notification)
    onSuccess(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-800">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm ${
              isMandatory ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-blue-100 border-blue-300 text-blue-900'
            }`}>
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {isMandatory ? 'Wajib Ganti Password Pertama' : 'Ganti Password Akun'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                SIAP TVRI Stasiun Sumatera Selatan
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mandatory Warning Banner */}
        {isMandatory && (
          <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl text-xs space-y-1 shadow-2xs">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900 text-xs">Pemberitahuan Keamanan Sistem</p>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  Password Anda baru saja di-reset oleh Admin atau merupakan login pertama. Untuk alasan keamanan, Anda wajib memperbarui password sementara dengan password baru sebelum dapat menggunakan sistem SIAP.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3.5 rounded-2xl text-xs font-bold flex items-start space-x-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Password Lama (only if not mandatory) */}
          {!isMandatory && (
            <div>
              <label className="block text-slate-800 font-extrabold mb-1.5">
                Password Lama <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showOldPass ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password saat ini..."
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Password Baru */}
          <div>
            <label className="block text-slate-800 font-extrabold mb-1.5">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                placeholder="Minimal 8 karakter..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Panjang password minimal 8 karakter. Bebas menggunakan kombinasi huruf dan angka.
            </p>
          </div>

          {/* Konfirmasi Password Baru */}
          <div>
            <label className="block text-slate-800 font-extrabold mb-1.5">
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                placeholder="Ketik ulang password baru..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition tracking-wider uppercase text-xs flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>

        <div className="text-center text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
          Setiap perubahan password akan secara otomatis mengakhiri sesi aktif dan mengharuskan login ulang.
        </div>
      </div>
    </div>
  );
};
