import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, AlertTriangle, CheckCircle2, XCircle, 
  History, ArrowRight, UserX, Crown, ShieldAlert, Check, Users, FileText, Lock
} from 'lucide-react';
import { Pegawai, UserAccount, KepalaStasiunAccessRecord } from '../types';
import { Storage } from '../lib/storage';

interface KepalaStasiunAccessManagementViewProps {
  pegawaiList: Pegawai[];
  currentUser: UserAccount | null;
  currentPegawai?: Pegawai | null;
  activeKepstaRecord: KepalaStasiunAccessRecord | null;
  allAccessRecords: KepalaStasiunAccessRecord[];
  onRefreshData: () => void;
  onShowSuccess: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const KepalaStasiunAccessManagementView: React.FC<KepalaStasiunAccessManagementViewProps> = ({
  pegawaiList,
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  allAccessRecords,
  onRefreshData,
  onShowSuccess
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [showRevokeConfirmModal, setShowRevokeConfirmModal] = useState(false);
  const [showRevokeAndGrantModal, setShowRevokeAndGrantModal] = useState(false);

  // Active employees list
  const activePegawaiList = pegawaiList.filter(p => p.aktif !== false);

  const handleGrantAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const selectedEmp = pegawaiList.find(p => p.id === selectedEmployeeId);
    if (!selectedEmp) return;

    // Check if another account is active
    if (activeKepstaRecord && activeKepstaRecord.employeeId !== selectedEmployeeId) {
      setShowRevokeAndGrantModal(true);
      return;
    }

    const adminName = currentUser?.username === 'admin' ? 'Admin SDM System' : (currentPegawai?.nama || 'Admin SDM');
    const res = Storage.grantKepalaStasiunAccess(selectedEmp, adminName);

    if (res.success) {
      onRefreshData();
      setSelectedEmployeeId('');
      onShowSuccess({
        title: 'Hak Akses Kepala Stasiun Diberikan',
        message: res.message,
        badge: 'PRIVILEGE KEPSTA',
        type: 'success'
      });
    } else {
      alert(res.message);
    }
  };

  const handleRevokeAccess = () => {
    const adminName = currentUser?.username === 'admin' ? 'Admin SDM System' : (currentPegawai?.nama || 'Admin SDM');
    const res = Storage.revokeKepalaStasiunAccess(adminName);

    if (res.success) {
      onRefreshData();
      setShowRevokeConfirmModal(false);
      onShowSuccess({
        title: 'Hak Akses Kepala Stasiun Dicabut',
        message: res.message,
        badge: 'PRIVILEGE DICABUT',
        type: 'info'
      });
    } else {
      alert(res.message);
    }
  };

  const handleConfirmRevokeAndGrant = () => {
    const selectedEmp = pegawaiList.find(p => p.id === selectedEmployeeId);
    if (!selectedEmp) return;

    const adminName = currentUser?.username === 'admin' ? 'Admin SDM System' : (currentPegawai?.nama || 'Admin SDM');

    // 1. Revoke active
    Storage.revokeKepalaStasiunAccess(adminName);

    // 2. Grant to new
    const res = Storage.grantKepalaStasiunAccess(selectedEmp, adminName);

    if (res.success) {
      onRefreshData();
      setShowRevokeAndGrantModal(false);
      setSelectedEmployeeId('');
      onShowSuccess({
        title: 'Pergantian Hak Akses Kepala Stasiun Berhasil',
        message: `Hak akses sebelumnya telah dicabut, dan hak akses Kepala Stasiun sekarang aktif untuk ${selectedEmp.nama}.`,
        badge: 'PERGANTIAN PEJABAT',
        type: 'success'
      });
    } else {
      alert(res.message);
    }
  };

  const targetSelectedEmp = pegawaiList.find(p => p.id === selectedEmployeeId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Manajemen Hak Akses Kepala Stasiun</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan Special Privilege Access (Hak Akses Khusus Monitoring Read-Only) untuk Kepala Stasiun TVRI Sumatera Selatan.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Khusus Admin SDM (Otoritas Sistem)</span>
        </div>
      </div>

      {/* Grid Layout: Current Status & Grant Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Active Access Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Status Hak Akses Saat Ini</span>
              </h3>

              {activeKepstaRecord ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>AKTIF</span>
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-slate-300">
                  TIDAK AKTIF
                </span>
              )}
            </div>

            {activeKepstaRecord ? (
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-xl p-4 text-white shadow-md space-y-4 border border-blue-900">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                    {activeKepstaRecord.employeeNama.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Pemegang Akses Kepsta</span>
                    </div>
                    <h4 className="text-base font-extrabold text-white leading-tight">
                      {activeKepstaRecord.employeeNama}
                    </h4>
                    <p className="text-xs text-blue-200 font-mono">
                      NIP: {activeKepstaRecord.employeeNip}
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-3 text-xs space-y-1.5 border border-white/10">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Jabatan:</span>
                    <strong className="text-white font-medium text-right">{activeKepstaRecord.employeeJabatan}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Diberikan Pada:</span>
                    <strong className="text-amber-300 font-mono">{new Date(activeKepstaRecord.grantedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Oleh Admin:</span>
                    <strong className="text-white font-medium">{activeKepstaRecord.grantedBy}</strong>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => setShowRevokeConfirmModal(true)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-sm uppercase tracking-wider"
                  >
                    <UserX className="w-4 h-4 text-white" />
                    <span>Cabut Hak Akses Kepala Stasiun</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-xs font-bold text-amber-900">Belum Ada Hak Akses Aktif</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed max-w-xs mx-auto">
                  Saat ini tidak ada akun pegawai yang sedang memegang hak akses khusus Kepala Stasiun. Silakan gunakan form di samping untuk memberikan hak akses.
                </p>
              </div>
            )}
          </div>

          {/* Special Privilege Information Card */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 text-xs text-blue-950 space-y-3">
            <div className="flex items-center space-x-2 font-extrabold text-blue-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Prinsip One Person = One Account</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Pegawai yang diberikan hak akses Kepala Stasiun tetap menggunakan akun pegawai pribadinya. Sistem memberikan akses monitoring tambahan tanpa membuat akun ganda.
            </p>
            <div className="bg-white rounded-xl p-3 border border-blue-200/60 text-[11px] text-slate-700 space-y-1">
              <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Batasan Read-Only:</span>
              </div>
              <p className="text-slate-600">
                Akses monitoring bersifat baca saja (read-only). Kepala Stasiun tidak dapat mengubah data, melakukan approval, atau mengedit berkas.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Grant Access Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGrantAccess} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span>Form Pemberian Hak Akses Kepala Stasiun</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih pegawai yang menjabat sebagai Kepala Stasiun untuk memberikan Special Privilege Access.
              </p>
            </div>

            {/* Select Employee Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <span>Pilih Pegawai TVRI Sumsel</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs"
              >
                <option value="">-- Pilih Pegawai --</option>
                {activePegawaiList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - NIP: {p.nip} ({p.jabatan})
                  </option>
                ))}
              </select>
            </div>

            {/* Warning if another user is currently active */}
            {activeKepstaRecord && targetSelectedEmp && activeKepstaRecord.employeeId !== selectedEmployeeId && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-xs space-y-2 text-amber-950">
                <div className="flex items-center space-x-2 font-extrabold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Peringatan Hak Akses Aktif</span>
                </div>
                <p className="text-amber-900 leading-relaxed">
                  Hak akses Kepala Stasiun saat ini dimiliki oleh: <strong className="text-blue-900 font-extrabold">{activeKepstaRecord.employeeNama}</strong>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  Menekan tombol di bawah akan otomatis mencabut hak akses dari <strong className="text-slate-900">{activeKepstaRecord.employeeNama}</strong> dan memberikannya kepada <strong className="text-blue-900">{targetSelectedEmp.nama}</strong>.
                </p>
              </div>
            )}

            {/* Granted Features Checklist Preview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-slate-900 block">
                Fitur Monitoring Khusus yang Akan Diberikan (Read-Only):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Dashboard Monitoring Pegawai',
                  'Monitoring Pelatihan Pegawai',
                  'Monitoring Sertifikat Pegawai',
                  'Statistik Pelatihan Pegawai',
                  'Monitoring Portofolio Pelatihan',
                  'Preview PDF Portofolio Pegawai',
                  'Download PDF Pegawai',
                  'Monitoring Verifikasi Sertifikat'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-200/70 text-slate-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedEmployeeId}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black px-4 py-3 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-md uppercase tracking-wider"
              >
                <Crown className="w-4 h-4 text-slate-950" />
                <span>Berikan Hak Akses Kepala Stasiun</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Access History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <History className="w-5 h-5 text-amber-500" />
              <span>Riwayat Hak Akses Kepala Stasiun</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jejak rekam histori pemberian dan pencabutan hak akses Kepala Stasiun TVRI Sumatera Selatan.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Record: {allAccessRecords.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Nama Pegawai & NIP</th>
                <th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Diberikan Pada</th>
                <th className="px-4 py-3">Diberikan Oleh</th>
                <th className="px-4 py-3">Dicabut Pada</th>
                <th className="px-4 py-3">Dicabut Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allAccessRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                    Belum ada riwayat hak akses Kepala Stasiun tercatat.
                  </td>
                </tr>
              ) : (
                allAccessRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900">{rec.employeeNama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: {rec.employeeNip}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {rec.employeeJabatan}
                    </td>
                    <td className="px-4 py-3">
                      {rec.status === 'AKTIF' ? (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>AKTIF</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>TIDAK AKTIF</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                      {new Date(rec.grantedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {rec.grantedBy}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {rec.revokedAt 
                        ? new Date(rec.revokedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {rec.revokedBy || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Confirm Modal */}
      {showRevokeConfirmModal && activeKepstaRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Cabut Hak Akses</h3>
                <p className="text-xs text-slate-500">Pencabutan Special Privilege Kepala Stasiun</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin mencabut hak akses Kepala Stasiun dari <strong className="text-slate-900 font-extrabold">{activeKepstaRecord.employeeNama}</strong>?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p>✓ Seluruh data pelatihan dan sertifikat pribadi beliau tetap aman.</p>
              <p>✓ Beliau tetap dapat login sebagai Pegawai biasa.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRevokeConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleRevokeAccess}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition uppercase tracking-wider"
              >
                Ya, Cabut Akses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke and Grant Replacement Modal */}
      {showRevokeAndGrantModal && activeKepstaRecord && targetSelectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Crown className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Pergantian Hak Akses Kepala Stasiun</h3>
                <p className="text-xs text-slate-500">Pengalihan Hak Akses Pejabat Baru</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>
                Hak akses Kepala Stasiun saat ini dimiliki oleh: <strong className="text-slate-900 font-extrabold">{activeKepstaRecord.employeeNama}</strong>.
              </p>
              <p>
                Sistem hanya mengizinkan <strong>1 akun aktif</strong> yang memegang hak akses Kepala Stasiun pada satu waktu.
              </p>
              <p className="bg-blue-50 border border-blue-200 text-blue-950 p-2.5 rounded-xl font-medium">
                Apakah Anda ingin mencabut akses dari <strong className="text-blue-900">{activeKepstaRecord.employeeNama}</strong> dan memberikannya kepada <strong className="text-amber-800">{targetSelectedEmp.nama}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRevokeAndGrantModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRevokeAndGrant}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition uppercase tracking-wider"
              >
                Lanjutkan Pergantian Akses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
