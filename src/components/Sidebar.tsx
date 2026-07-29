import React from 'react';
import { LayoutDashboard, Users, FileText, CheckSquare, History, Settings as SettingsIcon, Award, FileCheck, ShieldCheck, Crown, Key } from 'lucide-react';
import { Role, UserAccount, Pegawai, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';

export type ActiveTab = 'dashboard' | 'pegawai' | 'pengajuan' | 'approval' | 'sertifikat_pelatihan' | 'sertifikat_pegawai' | 'audit_log' | 'settings' | 'hak_akses_kepsta' | 'manajemen_password';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  role: Role;
  currentUser?: UserAccount | null;
  currentPegawai?: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  pendingVerificationsCount: number;
  pendingApprovalsCount: number;
  pendingCertificatesCount?: number;
  onNewSubmissionClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  role,
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  pendingVerificationsCount,
  pendingApprovalsCount,
  pendingCertificatesCount = 0
}) => {
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || role === 'KEPALA_STASIUN';
  const isAdmin = (currentUser?.role === 'ADMIN_SDM' || currentUser?.role === 'SUPER_ADMIN' || role === 'ADMIN_SDM' || role === 'SUPER_ADMIN') && !isKepsta;
  const isPegawai = currentUser?.role === 'PEGAWAI' || role === 'PEGAWAI';

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: isAdmin ? 'Dashboard Admin SDM' : (isKepsta ? 'Dashboard Monitoring' : 'Dashboard Pegawai'),
      icon: LayoutDashboard,
      badge: null,
      show: true,
    },
    {
      id: 'sertifikat_pelatihan' as ActiveTab,
      label: 'Sertifikat Pelatihan',
      icon: Award,
      badge: null,
      show: isPegawai,
    },
    {
      id: 'sertifikat_pegawai' as ActiveTab,
      label: isKepsta ? 'Monitoring Sertifikat' : 'Verifikasi Sertifikat',
      icon: FileCheck,
      badge: isAdmin && pendingCertificatesCount > 0 ? pendingCertificatesCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      show: isAdmin || isKepsta,
    },
    {
      id: 'pengajuan' as ActiveTab,
      label: isAdmin ? 'Data Pelatihan Pegawai' : (isKepsta ? 'Monitoring Pelatihan' : 'Riwayat Pelatihan Saya'),
      icon: FileText,
      badge: null,
      show: true,
    },
    {
      id: 'approval' as ActiveTab,
      label: isKepsta ? 'Persetujuan Kepsta' : 'Verifikasi & Approval',
      icon: CheckSquare,
      badge: isKepsta ? (pendingApprovalsCount > 0 ? pendingApprovalsCount : null) : (isAdmin && pendingVerificationsCount > 0 ? pendingVerificationsCount : null),
      badgeColor: isKepsta ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-blue-600 text-white font-bold',
      show: isAdmin || isKepsta,
    },
    {
      id: 'pegawai' as ActiveTab,
      label: isKepsta ? 'Monitoring Data Pegawai' : 'Data Pegawai TVRI',
      icon: Users,
      badge: null,
      show: isAdmin || isKepsta,
    },
    {
      id: 'manajemen_password' as ActiveTab,
      label: 'Manajemen Password Pegawai',
      icon: Key,
      badge: null,
      show: isAdmin,
    },
    {
      id: 'hak_akses_kepsta' as ActiveTab,
      label: 'Hak Akses Kepala Stasiun',
      icon: Crown,
      badge: null,
      show: isAdmin,
    },
    {
      id: 'audit_log' as ActiveTab,
      label: 'Audit Log & Keamanan System',
      icon: History,
      badge: null,
      show: isAdmin || isKepsta,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Pengaturan System',
      icon: SettingsIcon,
      badge: null,
      show: isAdmin,
    }
  ];


  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between py-5 shadow-sm">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Menu Utama SIAP
          </p>
          {menuItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white font-extrabold shadow-md shadow-blue-950/20 border border-blue-800/80 ring-1 ring-blue-700/40'
                    : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-semibold'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm shrink-0 ${item.badgeColor || 'bg-amber-400 text-slate-950 font-black'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="px-4 pt-4 border-t border-slate-100 space-y-2">
        {isKepsta && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-600/10 border border-amber-400/50 rounded-xl p-2.5 text-xs text-amber-950 flex items-center space-x-2 shadow-sm">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-[11px] text-amber-900 leading-tight">Hak Akses: Kepala Stasiun</p>
              <p className="text-[10px] text-amber-800 font-medium">Special Privilege Access Aktif</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-900 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>TVRI SUMSEL SIAP</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Sistem Informasi & Administrasi Pelatihan Pegawai TVRI Stasiun Sumatera Selatan.
          </p>
        </div>
      </div>
    </aside>
  );
};
