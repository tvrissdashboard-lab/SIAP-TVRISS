import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { UserAccount, Pegawai } from '../types';
import { hashPassword, Storage } from '../lib/storage';
import { TvriSumselLogo } from './TvriSumselLogo';

interface LoginPageProps {
  usersList: UserAccount[];
  pegawaiList: Pegawai[];
  onLoginSuccess: (user: UserAccount, pegawai: Pegawai | null, rememberMe: boolean) => void;
  sessionTimeoutMessage?: string | null;
  successMessage?: string | null;
  onClearTimeoutMessage?: () => void;
}

const LOCKOUT_KEY = 'siap_sumsel_login_lockout_v1';
const FAILED_COUNT_KEY = 'siap_sumsel_failed_login_count_v1';
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Mozilla Firefox';
  if (ua.includes('Edg')) return 'Microsoft Edge';
  if (ua.includes('Chrome')) return 'Google Chrome';
  if (ua.includes('Safari')) return 'Apple Safari';
  return 'Browser Standard';
}

function getIpAddress(): string {
  return '192.168.10.42 (Internal TVRI Sumsel)';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  usersList,
  pegawaiList,
  onLoginSuccess,
  sessionTimeoutMessage,
  successMessage,
  onClearTimeoutMessage
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState(0);

  useEffect(() => {
    const checkLockout = () => {
      const storedLockout = localStorage.getItem(LOCKOUT_KEY);
      if (storedLockout) {
        const lockoutUntil = parseInt(storedLockout, 10);
        const now = Date.now();
        if (lockoutUntil > now) {
          const rem = Math.ceil((lockoutUntil - now) / 1000);
          setLockoutRemainingSec(rem);
        } else {
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(FAILED_COUNT_KEY);
          setLockoutRemainingSec(0);
        }
      }
    };
    checkLockout();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutRemainingSec > 0) {
      timer = setInterval(() => {
        setLockoutRemainingSec((prev) => {
          if (prev <= 1) {
            localStorage.removeItem(LOCKOUT_KEY);
            localStorage.removeItem(FAILED_COUNT_KEY);
            setErrorMsg('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutRemainingSec]);

  const recordFailedAttempt = async (inputUsername: string, matchedPegawai?: Pegawai | null, reason?: string) => {
    const rawCount = localStorage.getItem(FAILED_COUNT_KEY);
    const currentCount = rawCount ? parseInt(rawCount, 10) + 1 : 1;
    localStorage.setItem(FAILED_COUNT_KEY, currentCount.toString());

    await Storage.addAuditLog({
      userId: inputUsername,
      userName: matchedPegawai?.nama || inputUsername,
      action: 'LOGIN_FAILED',
      module: 'AUTH',
      description: `Percobaan login gagal untuk NIP/Username ${inputUsername}: ${reason || 'Kredensial tidak valid'} (Percobaan ${currentCount}/5)`,
      status: 'FAILED',
      ipAddress: getIpAddress(),
      browser: getBrowserName(),
      role: 'UNAUTHORIZED'
    });

    if (currentCount >= 5) {
      const lockoutUntil = Date.now() + FIFTEEN_MINUTES_MS;
      localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
      setLockoutRemainingSec(900);
      setErrorMsg('Anda telah melebihi batas percobaan login. Silakan coba kembali dalam 15 menit.');
    } else {
      setErrorMsg(`${reason || 'Password atau Username/NIP salah.'} (Percobaan ${currentCount}/5)`);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemainingSec > 0 || isLoading) return;
    setErrorMsg('');
    if (onClearTimeoutMessage) onClearTimeoutMessage();

    const cleanInput = username.trim();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMsg('Silakan masukkan Username atau NIP Pegawai.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Silakan masukkan Password akun Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Fetch data pegawai & user dari Supabase
      const freshPegawaiList = await Storage.getPegawai();
      const freshUsersList = await Storage.getUsers();

      // Cari di data Pegawai
      const matchedPegawai = freshPegawaiList.find(
        p => p.nip === cleanInput || p.id === cleanInput || (p.nip && p.nip.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
      ) || pegawaiList.find(
        p => p.nip === cleanInput || p.id === cleanInput || (p.nip && p.nip.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
      );

      // Cari di data Akun Login
      let matchedUser = freshUsersList.find(
        u => u.username === cleanInput || (matchedPegawai && u.employeeId === matchedPegawai.id)
      ) || usersList.find(
        u => u.username === cleanInput || (matchedPegawai && u.employeeId === matchedPegawai.id)
      );

      // Fallback khusus Akun Admin
      if (cleanInput === 'admin' && !matchedUser) {
        matchedUser = {
          id: 'USR00002',
          employeeId: '',
          username: 'admin',
          passwordHash: hashPassword('sdmtvrisumsel'),
          role: 'ADMIN_SDM',
          isFirstLogin: false,
          mustChangePassword: false,
          isActive: true,
          createdAt: new Date().toISOString()
        };
      }

      if (!matchedPegawai && !matchedUser) {
        await recordFailedAttempt(cleanInput, null, `Username/NIP "${cleanInput}" tidak terdaftar`);
        setIsLoading(false);
        return;
      }

      if (matchedPegawai && matchedPegawai.aktif === false) {
        await recordFailedAttempt(cleanInput, matchedPegawai, `Akun pegawai ${matchedPegawai.nama} berstatus NON-AKTIF`);
        setIsLoading(false);
        return;
      }

      if (matchedUser && !matchedUser.isActive) {
        await recordFailedAttempt(cleanInput, matchedPegawai, `Akun pengguna ${cleanInput} non-aktif`);
        setIsLoading(false);
        return;
      }

      if (!matchedUser) {
        await recordFailedAttempt(cleanInput, matchedPegawai, 'Gagal memverifikasi akun pengguna');
        setIsLoading(false);
        return;
      }

      // Verifikasi Hash Password
      // CATATAN KEAMANAN (diperbaiki 2026-08-18): sebelumnya ada bypass
      // `|| cleanPass === 'sdmtvrisumsel'` di sini yang membuat string
      // tersebut berfungsi sebagai password universal untuk SEMUA akun
      // (bukan cuma admin). Sudah dihapus — verifikasi kini murni
      // membandingkan hash password akun yang bersangkutan.
      const inputHash = hashPassword(cleanPass);
      let isPassValid = matchedUser.passwordHash === inputHash;

      if (!isPassValid) {
        await recordFailedAttempt(cleanInput, matchedPegawai, 'Password yang Anda masukkan salah');
        setIsLoading(false);
        return;
      }

      localStorage.removeItem(FAILED_COUNT_KEY);
      localStorage.removeItem(LOCKOUT_KEY);

      await Storage.addAuditLog({
        userId: matchedUser.id,
        userName: matchedPegawai?.nama || (matchedUser.role === 'ADMIN_SDM' ? 'Admin' : matchedUser.username),
        action: 'LOGIN_SUCCESS',
        module: 'AUTH',
        description: `Login berhasil ke portal SIAP SUMSEL (Role: ${matchedUser.role})`,
        status: 'SUCCESS',
        ipAddress: getIpAddress(),
        browser: getBrowserName(),
        role: matchedUser.role
      });

      onLoginSuccess(matchedUser, matchedPegawai || null, rememberMe);
    } catch (err) {
      console.error('[LOGIN ERROR]', err);
      setErrorMsg('Terjadi kendala jaringan saat terhubung ke database. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockoutTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins} menit ${secs < 10 ? '0' : ''}${secs} detik`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header Banner */}
      <header className="relative z-10 w-full border-b border-white/10 bg-blue-950/40 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center space-x-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Sistem Informasi Administrasi Pelatihan • TVRI Stasiun Sumatera Selatan</span>
            <span className="sm:hidden font-bold text-white">SIAP TVRI SUMSEL</span>
          </div>
          <div className="flex items-center space-x-2 bg-blue-900/60 border border-blue-700/50 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PORTAL INTERNAL TERPROTEKSI</span>
          </div>
        </div>
      </header>

      {/* Login Card Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-800 backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <TvriSumselLogo className="h-[95px]" badge={true} />
            </div>
            <div className="pt-2">
              <h1 className="text-3xl font-black text-blue-950 tracking-wider">
                SIAP
              </h1>
              <p className="text-xs font-extrabold text-blue-900 tracking-wide mt-0.5">
                Sistem Informasi Administrasi Pelatihan
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                TVRI Stasiun Sumatera Selatan
              </p>
            </div>
          </div>

          {/* Messages Banner */}
          {successMessage && (
            <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-3.5 rounded-2xl text-xs font-bold flex items-start space-x-2.5 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-emerald-900 text-sm">Password Berhasil Diperbarui</p>
                <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {sessionTimeoutMessage && (
            <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 p-3.5 rounded-2xl text-xs font-bold flex items-start space-x-2.5 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900">Sesi Berakhir</p>
                <p className="text-[11px] font-medium text-amber-800">{sessionTimeoutMessage}</p>
              </div>
            </div>
          )}

          {(errorMsg || lockoutRemainingSec > 0) && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-3.5 rounded-2xl text-xs font-bold space-y-1 shadow-sm">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {lockoutRemainingSec > 0
                    ? 'Anda telah melebihi batas percobaan login. Silakan coba kembali dalam 15 menit.'
                    : errorMsg}
                </span>
              </div>
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">
                Username / NIP Pegawai
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={lockoutRemainingSec > 0 || isLoading}
                  placeholder="Masukkan Username atau NIP Pegawai..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={lockoutRemainingSec > 0 || isLoading}
                  placeholder="Masukkan password Anda..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-3 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-700 font-bold text-xs select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Ingat Saya (Remember Me)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={lockoutRemainingSec > 0 || isLoading}
              className={`w-full font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center space-x-2 ${
                lockoutRemainingSec > 0 || isLoading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-[0.99]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'MEMPROSES VERIFIKASI...' : (lockoutRemainingSec > 0 ? `SISTEM DIKUNCI (${formatLockoutTimer(lockoutRemainingSec)})` : 'MASUK KE SISTEM SIAP')}</span>
            </button>
          </form>

          <div className="pt-2 text-center text-[10px] text-slate-400 font-medium border-t border-slate-100">
            Internal Network • LPP TVRI Stasiun Sumatera Selatan
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 border-t border-white/10 bg-slate-950/80">
        <p className="font-semibold">
          {new Date().getFullYear()} TVRI Stasiun Sumatera Selatan • All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};