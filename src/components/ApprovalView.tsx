import React, { useState } from 'react';
import { 
  CheckSquare, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, 
  MessageSquare, UserCheck, Award, FileText, ArrowRight, Crown 
} from 'lucide-react';
import { PengajuanPelatihan, UserAccount, Pegawai, Role, ApprovalHistoryItem, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';
import { Storage } from '../lib/storage';
import { Pagination } from './Pagination';

interface ApprovalViewProps {
  submissions: PengajuanPelatihan[];
  currentUser: UserAccount | null;
  currentPegawai: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  approvalHistory: ApprovalHistoryItem[];
  onUpdateStatus: (submissionId: string, status: 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED') => void | Promise<void>;
  onOpenPrintModal?: (sub: PengajuanPelatihan) => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const ApprovalView: React.FC<ApprovalViewProps> = ({
  submissions,
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  approvalHistory,
  onUpdateStatus,
  onOpenPrintModal,
  onShowSuccess
}) => {
  const role: Role = currentUser?.role || 'PEGAWAI';
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || role === 'KEPALA_STASIUN';
  const isAdmin = (role === 'ADMIN_SDM' || role === 'SUPER_ADMIN') && !isKepsta;

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<'pending_sdm' | 'pending_kepsta' | 'history'>('pending_kepsta');

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Queues
  const pendingSdmQueue = submissions.filter(s => s.status === 'DRAFT');
  const pendingKepstaQueue = submissions.filter(s => s.status === 'WAITING_APPROVAL');
  const processedQueue = submissions.filter(s => s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'CANCELLED');

  const activeQueue = activeTab === 'pending_kepsta' 
    ? pendingKepstaQueue 
    : (activeTab === 'pending_sdm' ? pendingSdmQueue : processedQueue);

  // Pagination calculation
  const totalItems = activeQueue.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedActiveQueue = activeQueue.slice(startIndex, startIndex + pageSize);

  // Dynamically resolve current selected submission from props
  const selectedSub = (selectedSubId ? submissions.find(s => s.id === selectedSubId) : null) ||
    (activeTab === 'pending_kepsta' ? pendingKepstaQueue[0] : activeTab === 'pending_sdm' ? pendingSdmQueue[0] : processedQueue[0]) ||
    submissions[0] || null;

  const handleVerifyBySDM = async (sub: PengajuanPelatihan) => {
    if (!note.trim()) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Catatan Diperlukan',
          message: 'Mohon tuliskan catatan verifikasi berkas SDM sebelum melanjutkan.',
          type: 'info',
          badge: 'PERINGATAN SDM'
        });
      }
      return;
    }

    // 1. Add History FIRST
    const historyItem: ApprovalHistoryItem = {
      id: `APH${String(Date.now()).slice(-5)}`,
      submissionId: sub.id,
      actorId: currentUser?.id || '',
      actorNama: currentPegawai?.nama || 'Admin SDM',
      actorRole: currentUser?.role || 'ADMIN_SDM',
      action: 'VERIFIED',
      note: note,
      createdAt: new Date().toISOString()
    };
    await Storage.addApprovalHistory(historyItem);

    // 2. Audit Log FIRST
    await Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Admin SDM',
      action: 'VERIFY_SUBMISSION',
      module: 'APPROVAL',
      description: `Verifikasi administrasi pengajuan ${sub.nomor} (${sub.employeeNama}): ${note}`,
      status: 'SUCCESS'
    });

    // 3. Update status & refresh state
    await onUpdateStatus(sub.id, 'WAITING_APPROVAL');

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Verifikasi Berkas Berhasil',
        message: `Pengajuan ${sub.nomor} (${sub.employeeNama}) telah diverifikasi oleh SDM dan diteruskan ke Kepala Stasiun.`,
        badge: 'VERIFIKASI SDM',
        type: 'success'
      });
    }
    setNote('');
  };

  const handleApproveByKepsta = async (sub: PengajuanPelatihan) => {
    const finalNote = note.trim() || 'Disetujui oleh Kepala Stasiun TVRI Sumatera Selatan.';

    // 1. Add History FIRST
    const historyItem: ApprovalHistoryItem = {
      id: `APH${String(Date.now()).slice(-5)}`,
      submissionId: sub.id,
      actorId: currentUser?.id || '',
      actorNama: currentPegawai?.nama || 'Kepala Stasiun TVRI Sumsel',
      actorRole: 'KEPALA_STASIUN',
      action: 'APPROVED',
      note: finalNote,
      createdAt: new Date().toISOString()
    };
    await Storage.addApprovalHistory(historyItem);

    // 2. Audit Log FIRST
    await Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Kepala Stasiun',
      action: 'APPROVE_SUBMISSION',
      module: 'APPROVAL',
      description: `Kepala Stasiun menyetujui pengajuan ${sub.nomor} (${sub.employeeNama})`,
      status: 'SUCCESS'
    });

    // 3. Update status & refresh state
    await onUpdateStatus(sub.id, 'APPROVED');

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Pengajuan Resmi Disetujui!',
        message: `Pengajuan ${sub.nomor} (${sub.employeeNama}) resmi disetujui oleh Kepala Stasiun TVRI Sumatera Selatan. Surat Rekomendasi siap dicetak.`,
        badge: 'APPROVAL KEPSTA',
        type: 'approval'
      });
    }
    setNote('');
  };

  const handleRejectByKepsta = async (sub: PengajuanPelatihan) => {
    if (!note.trim()) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Alasan Penolakan Wajib',
          message: 'Mohon sertakan catatan alasan penolakan pengajuan untuk pemohon.',
          type: 'info',
          badge: 'KEPALA STASIUN'
        });
      }
      return;
    }

    // 1. Add History FIRST
    const historyItem: ApprovalHistoryItem = {
      id: `APH${String(Date.now()).slice(-5)}`,
      submissionId: sub.id,
      actorId: currentUser?.id || '',
      actorNama: currentPegawai?.nama || 'Kepala Stasiun TVRI Sumsel',
      actorRole: 'KEPALA_STASIUN',
      action: 'REJECTED',
      note: note,
      createdAt: new Date().toISOString()
    };
    await Storage.addApprovalHistory(historyItem);

    // 2. Audit Log FIRST
    await Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Kepala Stasiun',
      action: 'REJECT_SUBMISSION',
      module: 'APPROVAL',
      description: `Kepala Stasiun MENOLAK pengajuan ${sub.nomor}: ${note}`,
      status: 'SUCCESS'
    });

    // 3. Update status & refresh state
    await onUpdateStatus(sub.id, 'REJECTED');

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Pengajuan Ditolak',
        message: `Pengajuan ${sub.nomor} telah ditolak dengan catatan resmi.`,
        badge: 'KEPALA STASIUN',
        type: 'info'
      });
    }
    setNote('');
  };

  const getSubHistory = (subId: string) => {
    return approvalHistory.filter(h => h.submissionId === subId);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            <span>Pusat Verifikasi & Approval Pengajuan (SIAP Sumsel)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Modul pemrosesan alur bertingkat: Verifikasi SDM ➔ Persetujuan Akhir Kepala Stasiun TVRI Sumsel.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 shadow-sm">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verifikasi SDM: <strong className="text-blue-700 ml-1 font-extrabold">{pendingSdmQueue.length}</strong></span>
          </span>
          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Antrean Kepsta: <strong className="text-amber-700 ml-1 font-extrabold">{pendingKepstaQueue.length}</strong></span>
          </span>
        </div>
      </div>

      {/* Main Approval Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Column */}
        <div className="lg:col-span-5 space-y-3">
          {/* Tab Selector */}
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center space-x-1 text-xs font-bold shadow-sm">
            <button
              onClick={() => { setActiveTab('pending_kepsta'); setCurrentPage(1); }}
              className={`flex-1 py-2 px-2 rounded-xl text-center transition flex items-center justify-center space-x-1 ${
                activeTab === 'pending_kepsta'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Antrean Kepsta</span>
              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold text-[10px]">{pendingKepstaQueue.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('pending_sdm'); setCurrentPage(1); }}
              className={`flex-1 py-2 px-2 rounded-xl text-center transition flex items-center justify-center space-x-1 ${
                activeTab === 'pending_sdm'
                  ? 'bg-blue-600 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Draf SDM</span>
              <span className="bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded font-extrabold text-[10px]">{pendingSdmQueue.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
              className={`flex-1 py-2 px-2 rounded-xl text-center transition flex items-center justify-center space-x-1 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Selesai & Dibatalkan</span>
              <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-extrabold text-[10px]">{processedQueue.length}</span>
            </button>
          </div>

          {/* Submissions Cards List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {paginatedActiveQueue.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-sm">
                Tidak ada data pengajuan pada antrean ini.
              </div>
            ) : (
              paginatedActiveQueue.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubId(sub.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs space-y-1.5 ${
                    selectedSub?.id === sub.id
                      ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                      : 'bg-white border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-amber-700">{sub.nomor}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{new Date(sub.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 line-clamp-1">{sub.judulPelatihan}</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-slate-600 text-[11px] truncate font-medium">Pemohon: <span className="font-bold text-slate-900">{sub.employeeNama}</span></p>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 ml-1">{sub.jumlahJp ? `${sub.jumlahJp} JP` : 'JP -'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Global Pagination Panel */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <Pagination
              currentPage={validCurrentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              entityName="Pengajuan Approval"
              compact={true}
            />
          </div>
        </div>

        {/* Right Detail & Action Column */}
        <div className="lg:col-span-7">
          {selectedSub ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-sm">
              {/* Top Details */}
              <div className="border-b border-slate-100 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-700 font-extrabold text-sm bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">{selectedSub.nomor}</span>
                  <div>
                    {selectedSub.status === 'APPROVED' && <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300">Disetujui Kepsta</span>}
                    {selectedSub.status === 'WAITING_APPROVAL' && <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold border border-amber-300">Menunggu Persetujuan Kepsta</span>}
                    {selectedSub.status === 'DRAFT' && <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-bold border border-blue-300">Draf / Perlu Verifikasi SDM</span>}
                    {selectedSub.status === 'REJECTED' && <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold border border-rose-300">Ditolak</span>}
                    {selectedSub.status === 'CANCELLED' && <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-300">Dibatalkan</span>}
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{selectedSub.judulPelatihan}</h3>
                <p className="text-xs text-amber-800 font-bold">Jenis Rumpun: {selectedSub.jenisPelatihan}</p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Nama Pegawai / NIP:</span>
                  <span className="font-extrabold text-slate-900">{selectedSub.employeeNama}</span>
                  <span className="block text-[10px] text-slate-500 font-mono font-bold">NIP: {selectedSub.employeeNip}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Jabatan & Unit Kerja:</span>
                  <span className="font-bold text-slate-800">{selectedSub.employeeJabatan}</span>
                  <span className="block text-[11px] text-blue-800 font-bold">{selectedSub.employeeUnitKerja}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Penyelenggara Pelatihan:</span>
                  <span className="font-bold text-slate-800">{selectedSub.penyelenggara}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Jadwal Pelaksanaan:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedSub.tanggalMulai).toLocaleDateString('id-ID')} s/d {new Date(selectedSub.tanggalSelesai).toLocaleDateString('id-ID')}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Lokasi Pelaksanaan:</span>
                  <span className="font-bold text-slate-800">{selectedSub.lokasi}</span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Jumlah JP (Jam Pelatihan):</span>
                  <span className="font-extrabold text-slate-900">{selectedSub.jumlahJp ? `${selectedSub.jumlahJp} JP` : 'Belum diisi oleh pemohon'}</span>
                </div>

                {selectedSub.keterangan && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[11px] font-medium">Keterangan Tambahan Pemohon:</span>
                    <p className="text-slate-700 italic text-[11px]">{selectedSub.keterangan}</p>
                  </div>
                )}

                {selectedSub.lampiranNama && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[11px] font-medium">Dokumen Lampiran / Surat Undangan:</span>
                    {selectedSub.lampiranUrl ? (
                      <a
                        href={selectedSub.lampiranUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1 text-blue-700 font-bold text-[11px] underline hover:text-blue-900"
                      >
                        {selectedSub.lampiranNama} (Lihat/Unduh Berkas)
                      </a>
                    ) : (
                      <span className="block text-[11px] text-slate-400 italic mt-1">{selectedSub.lampiranNama} (berkas tidak tersedia untuk pengajuan lama)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Approval status banner */}
              {selectedSub.status === 'APPROVED' && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-emerald-900">
                      Pengajuan Pelatihan Telah Disetujui
                    </span>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Pengajuan pelatihan ini telah mendapatkan persetujuan resmi dari Kepala Stasiun TVRI Sumatera Selatan.
                    </p>
                  </div>
                </div>
              )}

              {selectedSub.status === 'CANCELLED' && (
                <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-900">
                      Pengajuan Pelatihan Dibatalkan
                    </span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Pengajuan ini telah dibatalkan oleh pemohon / pegawai dan tidak dapat diproses lebih lanjut.
                    </p>
                  </div>
                </div>
              )}

              {/* Approval Action Form Box */}
              {(selectedSub.status === 'DRAFT' || selectedSub.status === 'WAITING_APPROVAL') && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-300 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-extrabold text-amber-950">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>Catatan Tindakan & Keputusan <span className="text-red-600">*</span></span>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      isKepsta 
                        ? 'Contoh: Disetujui, jadwal dan anggaran sesuai. Silakan laksanakan pelatihan sesuai jadwal.' 
                        : 'Contoh: Berkas lengkap dan sesuai, jadwal tidak bentrok. Diteruskan ke Kepala Stasiun untuk persetujuan.'
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:border-amber-500 focus:outline-none shadow-sm placeholder:text-slate-400 placeholder:italic"
                  />
                  <p className="text-[10px] text-amber-700 -mt-1.5">
                    * Wajib diisi untuk {isKepsta ? 'Tolak Pengajuan (sebagai alasan penolakan)' : 'Verifikasi SDM'}. Untuk Disetujui Kepala Stasiun, boleh dikosongkan (otomatis terisi catatan standar).
                  </p>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    {/* SDM Action */}
                    {selectedSub.status === 'DRAFT' && (isAdmin || isKepsta) && (
                      <button
                        onClick={() => handleVerifyBySDM(selectedSub)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verifikasi SDM & Teruskan ke Kepsta</span>
                      </button>
                    )}

                    {/* Kepsta Action */}
                    {selectedSub.status === 'WAITING_APPROVAL' && (isKepsta || isAdmin) && (
                      <>
                        <button
                          onClick={() => handleRejectByKepsta(selectedSub)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1 shadow-md"
                        >
                          <XCircle className="w-4 h-4 text-white" />
                          <span>Tolak Pengajuan</span>
                        </button>

                        <button
                          onClick={() => handleApproveByKepsta(selectedSub)}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition flex items-center space-x-1 shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Disetujui Kepala Stasiun</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Approval History Timeline */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Riwayat Approval & Audit Log Pengajuan Ini</span>
                </h4>

                <div className="space-y-2">
                  {getSubHistory(selectedSub.id).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Belum ada riwayat approval pada pengajuan ini.</p>
                  ) : (
                    getSubHistory(selectedSub.id).map((h) => (
                      <div key={h.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-slate-900">{h.actorNama} ({h.actorRole})</span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {new Date(h.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.action === 'APPROVED' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : h.action === 'VERIFIED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : h.action === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-700 border border-slate-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {h.action === 'APPROVED' && 'DISETUJUI'}
                            {h.action === 'VERIFIED' && 'DIVERIFIKASI SDM'}
                            {h.action === 'CANCELLED' && 'DIBATALKAN'}
                            {h.action === 'REJECTED' && 'DITOLAK'}
                          </span>
                          <p className="text-slate-700 italic text-[11px]">"{h.note}"</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-sm">
              Pilih pengajuan pada panel kiri untuk meninjau detail dan memberikan persetujuan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
