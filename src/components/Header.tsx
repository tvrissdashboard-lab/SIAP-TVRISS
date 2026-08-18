import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, LogOut, Clock, Key, Building2, ChevronDown, Sparkles, Crown } from 'lucide-react';
import { UserAccount, Pegawai, Role, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';
import { TvriSumselLogo } from './TvriSumselLogo';
import { Dropdown } from './Dropdown';

interface HeaderProps {
  currentUser: UserAccount | null;
  currentPegawai: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  onLogout: () => void;
  onSwitchRole?: (targetRole: Role) => void;
  onChangePasswordClick: () => void;
  onResetData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  onLogout,
  onChangePasswordClick
}) => {
  const [time, setTime] = useState<string>('');

  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || currentUser?.role === 'KEPALA_STASIUN';

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="siap-sumsel-header" className="sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-xl border-b border-blue-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2">
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3.5">
            {/* TVRI Sumsel Official Vector Logo */}
            <div className="hover:scale-[1.03] transition duration-200 cursor-pointer">
              <TvriSumselLogo className="h-[66px] sm:h-[72px]" badge={true} />
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-2xl sm:text-3xl text-white tracking-wider leading-none drop-shadow-sm flex items-center gap-1.5">
                  SIAP
                  <Sparkles className="w-4 h-4 text-amber-400 inline-block animate-pulse" />
                </h1>
                <span className="hidden sm:inline-block bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm tracking-wider uppercase">
                  Resmi
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide mt-1 leading-tight">
                Sistem Informasi Administrasi Pelatihan
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live Clock WIB */}
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-blue-100 bg-blue-950/60 px-3 py-1.5 rounded-md border border-blue-700/80">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-mono font-medium">{time || '00:00:00 WIB'}</span>
            </div>

            {/* User Profile & Account Dropdown */}
            <Dropdown
              id="header-user-profile"
              align="right"
              menuClassName="w-64"
              trigger={({ isOpen, toggle }) => (
                <button
                  id="user-profile-menu-btn"
                  onClick={toggle}
                  className={`flex items-center space-x-2 p-1.5 rounded-xl transition ${
                    isOpen ? 'bg-blue-800/80 ring-2 ring-amber-400/40' : 'hover:bg-blue-700/60'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-blue-950 flex items-center justify-center font-black text-xs ring-2 ring-white/40 shadow-sm">
                    {currentUser?.role === 'ADMIN_SDM'
                      ? 'A'
                      : (currentPegawai?.nama ? currentPegawai.nama.charAt(0) : (currentUser?.role === 'KEPALA_STASIUN' ? 'K' : 'U'))}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-white truncate max-w-[140px]">
                        {currentUser?.role === 'ADMIN_SDM'
                          ? 'Admin'
                          : (currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun' : currentUser?.username || 'Pengguna SIAP'))}
                      </p>
                      {isKepsta && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-blue-200 truncate max-w-[140px]">
                      {isKepsta
                        ? 'Akses: Kepala Stasiun'
                        : currentUser?.role === 'ADMIN_SDM'
                        ? 'Verifikator'
                        : currentPegawai?.nip
                        ? `NIP: ${currentPegawai.nip}`
                        : `@${currentUser?.username}`}
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            >
              {({ close }) => (
                <div className="text-xs text-slate-800">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                    <p className="font-bold text-slate-900">
                      {currentUser?.role === 'ADMIN_SDM'
                        ? 'Admin'
                        : (currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun TVRI Sumsel' : 'System Account'))}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {currentUser?.role === 'ADMIN_SDM'
                        ? 'Admin / Verifikator'
                        : (currentPegawai?.jabatan || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun LPP TVRI Sumsel' : 'Pengguna Sistem'))}
                    </p>
                    <div className="mt-1 flex items-center space-x-1 text-slate-600 text-[11px]">
                      {currentUser?.role === 'ADMIN_SDM' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium font-mono text-slate-700">Username: admin</span>
                        </>
                      ) : currentPegawai?.unitKerja ? (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-medium">{currentPegawai.unitKerja}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-medium">Username: {currentUser?.username}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {currentUser?.role === 'ADMIN_SDM' && (
                    <button
                      onClick={() => {
                        onChangePasswordClick();
                        close();
                      }}
                      className="w-full text-left px-4 py-2.5 flex items-center space-x-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition font-medium"
                    >
                      <Key className="w-4 h-4 text-amber-500" />
                      <span>Manajemen Password Pegawai</span>
                    </button>
                  )}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onLogout();
                        close();
                      }}
                      className="w-full text-left px-4 py-2.5 flex items-center space-x-2 text-rose-600 hover:bg-rose-50 transition font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Keluar Aplikasi</span>
                    </button>
                  </div>
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
};

