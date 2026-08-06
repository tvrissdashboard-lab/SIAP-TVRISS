import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, RefreshCw, Download, ShieldCheck, Building2, Save, User, Key, UserCheck } from 'lucide-react';
import { UNIT_KERJA_LIST } from '../data/initialData';
import { UserAccount, Pegawai } from '../types';

interface SettingsViewProps {
  currentUser?: UserAccount | null;
  currentPegawai?: Pegawai | null;
  onChangePasswordClick?: () => void;
  onResetData: () => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  currentPegawai,
  onChangePasswordClick,
  onResetData,
  onShowSuccess
}) => {
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxUploadMb, setMaxUploadMb] = useState('10');
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onShowSuccess) {
      onShowSuccess({
        title: 'Konfigurasi Tersimpan',
        message: 'Parameter aplikasi, batas upload, dan zona waktu berhasil diperbarui.',
        badge: 'PENGATURAN SISTEM',
        type: 'success'
      });
    }
  };

  const handleExportJSON = () => {
    const data = {
      pegawai: localStorage.getItem('siap_sumsel_pegawai_v1'),
      users: localStorage.getItem('siap_sumsel_users_v1'),
      submissions: localStorage.getItem('siap_sumsel_submissions_v1'),
      approvalHistory: localStorage.getItem('siap_sumsel_approval_history_v1'),
      auditLogs: localStorage.getItem('siap_sumsel_audit_logs_v1'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIAP_SUMSEL_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Ekspor Data Berhasil',
        message: 'Berkas cadangan JSON database SIAP SUMSEL telah diunduh ke perangkat Anda.',
        badge: 'BACKUP DATA',
        type: 'success'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            <span>Pengaturan System & Konfigurasi SIAP Sumsel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi parameter aplikasi, referensi unit kerja, dan pemeliharaan database local.
          </p>
        </div>
      </div>

      {/* Active User Session Identity Card */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-inner">
            {currentUser?.role === 'ADMIN_SDM'
              ? 'A'
              : (currentPegawai?.nama ? currentPegawai.nama.charAt(0) : (currentUser?.role === 'KEPALA_STASIUN' ? 'K' : 'U'))}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                SESI AKTIF: {currentUser?.role || 'PEGAWAI'}
              </span>
              <span className="text-slate-300 text-xs">SIAP - TVRI Sumatera Selatan</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {currentUser?.role === 'ADMIN_SDM'
                ? 'Admin SDM (Akun Operasional Systems)'
                : (currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun TVRI Sumsel' : 'Pengguna System'))}
            </h3>
            <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {currentUser?.role === 'ADMIN_SDM' ? (
                <>
                  <span>Username: <strong className="text-amber-300 font-mono">admin</strong></span>
                  <span>Peran: <strong className="text-amber-300">Admin SDM / Verifikator</strong></span>
                </>
              ) : currentPegawai ? (
                <>
                  <span>NIP: <strong className="text-amber-300 font-mono">{currentPegawai.nip}</strong></span>
                  <span>Jabatan: <strong className="text-amber-300">{currentPegawai.jabatan}</strong></span>
                  <span>Unit: <strong className="text-amber-300">{currentPegawai.unitKerja}</strong></span>
                </>
              ) : (
                <>
                  <span>Username: <strong className="text-amber-300 font-mono">{currentUser?.username}</strong></span>
                  <span>Role: <strong className="text-amber-300">{currentUser?.role}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {onChangePasswordClick && currentUser?.role === 'ADMIN_SDM' && (
          <button
            onClick={onChangePasswordClick}
            className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm shrink-0 self-start md:self-auto"
          >
            <Key className="w-4 h-4 text-blue-950" />
            <span>Kelola Password Pegawai</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Settings Form */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Parameter Aplikasi & Sesi</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nama Instansi & Stasiun</label>
              <input
                type="text"
                disabled
                value="LPP TVRI Stasiun Sumatera Selatan"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Session Timeout (Menit)</label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Lama inaktivitas sebelum pengguna otomatis dikeluarkannya.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Batas Maksimal Lampiran (MB)</label>
              <input
                type="number"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Zona Waktu Sistem</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Simpan Konfigurasi</span>
              </button>
            </div>
          </form>
        </div>

        {/* Database & Reference Manager */}
        <div className="space-y-6">
          {/* Unit Kerja References */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Daftar Referensi Unit Kerja TVRI Sumsel</span>
            </h3>

            <div className="space-y-1.5">
              {UNIT_KERJA_LIST.map((unit, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-bold flex items-center justify-between">
                  <span>{unit}</span>
                  <span className="text-[10px] text-slate-500 font-mono">CODE-{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Database Maintenance & Backup */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Pemeliharaan Data & Backup</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Ekspor Backup Data (JSON)</h4>
                  <p className="text-[11px] text-slate-600 font-medium">Unduh salinan cadangan seluruh database aplikasi SIAP SUMSEL.</p>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shrink-0 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Data</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-3.5 rounded-xl opacity-70">
                <div>
                  <h4 className="font-bold text-slate-700 text-xs">Reset Factory Default (Dinonaktifkan)</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Fitur ini dinonaktifkan demi keamanan karena akan menimpa seluruh data pegawai & pengajuan yang sudah nyata (produksi) dengan data demo.</p>
                </div>
                <button
                  disabled
                  title="Dinonaktifkan untuk melindungi data produksi"
                  className="bg-slate-300 text-slate-500 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shrink-0 cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
