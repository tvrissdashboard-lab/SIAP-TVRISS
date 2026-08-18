import React, { useState, useMemo } from 'react';
import { 
  Users, Award, Search, Filter, Eye, Download, CheckCircle2, Clock, 
  XCircle, AlertTriangle, ShieldCheck, FileCheck, Building2, ChevronRight, X, FileText, Check, MessageSquare
} from 'lucide-react';
import { Pegawai, SertifikatPelatihan, CertificateStatus, UserAccount, Role, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';
import { Storage, playNotificationSound } from '../lib/storage';
import { generatePortfolioPDF, generateCertificateSummaryPDF } from '../lib/pdf';
import { Pagination } from './Pagination';
import { TvriSumselLogo } from './TvriSumselLogo';

interface SertifikatPegawaiViewProps {
  pegawaiList: Pegawai[];
  certificates: SertifikatPelatihan[];
  currentUser: UserAccount | null;
  currentPegawai?: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  onRefreshData: () => void | Promise<void>;
  onShowSuccess: (title: string, message?: string) => void;
}

type CertificateFilter = 'ALL' | 'SUDAH_UPLOAD' | 'BELUM_UPLOAD' | 'PENDING' | 'REJECTED' | 'REVISION';

export const SertifikatPegawaiView: React.FC<SertifikatPegawaiViewProps> = ({
  pegawaiList,
  certificates,
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  onRefreshData,
  onShowSuccess
}) => {
  const role: Role = currentUser?.role || 'ADMIN_SDM';
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || role === 'KEPALA_STASIUN';
  const isAdmin = (role === 'ADMIN_SDM' || role === 'SUPER_ADMIN') && !isKepsta;

  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  // Download certificate helper — file asli bila sudah diunggah, atau PDF ringkasan resmi bila belum
  const handleDownloadCertificate = async (cert: SertifikatPelatihan) => {
    // Jika file asli sudah tersimpan di Supabase Storage, buka/unduh file aslinya
    if (cert.fileUrl && !cert.fileUrl.startsWith('blob:')) {
      window.open(cert.fileUrl, '_blank');
      return;
    }

    setIsDownloadingCert(true);
    try {
      await generateCertificateSummaryPDF(cert);
    } catch (err) {
      console.error('[PDF ERROR]', err);
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const [isDownloadingPortfolio, setIsDownloadingPortfolio] = useState(false);
  // Download Employee Portfolio PDF helper — PDF biner asli via jsPDF
  const handleDownloadEmployeePortfolioPDF = async (pegawai: Pegawai) => {
    const userCerts = pegawaiCertificatesMap.get(pegawai.id) || pegawaiCertificatesMap.get(pegawai.nip) || [];

    setIsDownloadingPortfolio(true);
    try {
      await generatePortfolioPDF(pegawai, userCerts);
      playNotificationSound();
      onShowSuccess('✓ PDF Portofolio Berhasil Dibuat', `Portofolio pelatihan atas nama ${pegawai.nama} berhasil diunduh dalam format PDF.`);
    } catch (err) {
      console.error('[PDF ERROR]', err);
      onShowSuccess('Gagal membuat PDF', 'Terjadi kendala saat membuat dokumen PDF. Silakan coba lagi.');
    } finally {
      setIsDownloadingPortfolio(false);
    }
  };


  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CertificateFilter>('ALL');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [previewCert, setPreviewCert] = useState<SertifikatPelatihan | null>(null);
  
  // Reject/Revision Modal State
  const [rejectionModalCert, setRejectionModalCert] = useState<SertifikatPelatihan | null>(null);
  const [rejectionAction, setRejectionAction] = useState<'DITOLAK' | 'PERLU_REVISI'>('PERLU_REVISI');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Group certificates by Pegawai ID / NIP
  const pegawaiCertificatesMap = useMemo(() => {
    const map = new Map<string, SertifikatPelatihan[]>();
    certificates.forEach(c => {
      const key = c.employeeId || c.employeeNip || '';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(c);
    });
    return map;
  }, [certificates]);

  // Overall Statistics for Dashboard Header
  const activePegawaiList = useMemo(() => pegawaiList.filter(p => p.aktif), [pegawaiList]);
  const totalPegawaiCount = activePegawaiList.length;
  const totalCertificatesCount = certificates.length;

  const pegawaiUploadedCount = useMemo(() => {
    let count = 0;
    activePegawaiList.forEach(p => {
      const userCerts = pegawaiCertificatesMap.get(p.id) || pegawaiCertificatesMap.get(p.nip) || [];
      if (userCerts.some(c => c.status === 'DISETUJUI' || c.status === 'SEDANG_DIVERIFIKASI')) {
        count++;
      }
    });
    return count;
  }, [activePegawaiList, pegawaiCertificatesMap]);

  const pegawaiNotUploadedCount = Math.max(0, totalPegawaiCount - pegawaiUploadedCount);

  // Filtered Pegawai List
  const filteredPegawaiList = useMemo(() => {
    return activePegawaiList.filter(p => {
      // 1. Search Query Match
      const matchesSearch = 
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.unitKerja.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.jabatan.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filter Tab Match
      const userCerts = pegawaiCertificatesMap.get(p.id) || pegawaiCertificatesMap.get(p.nip) || [];

      if (activeFilter === 'SUDAH_UPLOAD') {
        return userCerts.some(c => c.status === 'DISETUJUI' || c.status === 'SEDANG_DIVERIFIKASI');
      }
      if (activeFilter === 'BELUM_UPLOAD') {
        return userCerts.length === 0 || userCerts.every(c => c.status === 'BELUM_DIUNGGAH');
      }
      if (activeFilter === 'PENDING') {
        return userCerts.some(c => c.status === 'SEDANG_DIVERIFIKASI');
      }
      if (activeFilter === 'REJECTED') {
        return userCerts.some(c => c.status === 'DITOLAK');
      }
      if (activeFilter === 'REVISION') {
        return userCerts.some(c => c.status === 'PERLU_REVISI');
      }

      return true;
    });
  }, [activePegawaiList, pegawaiCertificatesMap, searchQuery, activeFilter]);

  // Pagination calculation
  const totalItems = filteredPegawaiList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedPegawaiList = useMemo(() => {
    return filteredPegawaiList.slice(startIndex, startIndex + pageSize);
  }, [filteredPegawaiList, startIndex, pageSize]);

  // Action: Approve Certificate
  const handleApproveCertificate = (cert: SertifikatPelatihan) => {
    setIsProcessing(true);
    setTimeout(async () => {
      // Tunggu update status selesai tersimpan di database SEBELUM refresh data,
      // supaya box "Menunggu Verifikasi" / "Perlu Revisi" tidak menarik data lama (race condition).
      await Storage.updateCertificateStatus(cert.id, 'DISETUJUI', currentUser?.username || 'Admin');

      await Storage.addAuditLog({
        userId: currentUser?.username || 'ADMIN_SDM',
        userName: currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun' : 'Admin'),
        action: 'APPROVE_CERTIFICATE',
        module: 'SERTIFIKAT',
        description: `Menyetujui sertifikat "${cert.judulPelatihan}" milik pegawai ${cert.employeeNama || cert.employeeNip}.`,
        status: 'SUCCESS'
      });

      await onRefreshData();

      setIsProcessing(false);
      playNotificationSound();

      onShowSuccess(
        '✓ Sertifikat Disetujui',
        `Sertifikat "${cert.judulPelatihan}" milik ${cert.employeeNama} telah disetujui.`
      );
    }, 300);
  };

  // Action: Submit Rejection or Revision
  const handleSubmitRejectionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalCert) return;

    if (!rejectionReason.trim()) {
      alert('Harap masukkan alasan penolakan atau catatan revisi.');
      return;
    }

    setIsProcessing(true);
    setTimeout(async () => {
      // Tunggu update status selesai tersimpan di database SEBELUM refresh data,
      // supaya box "Menunggu Verifikasi" / "Perlu Revisi" tidak menarik data lama (race condition).
      await Storage.updateCertificateStatus(
        rejectionModalCert.id,
        rejectionAction,
        currentUser?.username || 'Admin',
        rejectionReason.trim()
      );

      await Storage.addAuditLog({
        userId: currentUser?.username || 'ADMIN_SDM',
        userName: currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun' : 'Admin'),
        action: rejectionAction === 'DITOLAK' ? 'REJECT_CERTIFICATE' : 'REVISION_CERTIFICATE',
        module: 'SERTIFIKAT',
        description: `Memberikan ${rejectionAction === 'DITOLAK' ? 'penolakan' : 'catatan revisi'} pada sertifikat "${rejectionModalCert.judulPelatihan}" (${rejectionModalCert.employeeNama}): "${rejectionReason.trim()}".`,
        status: 'SUCCESS'
      });

      await onRefreshData();

      setIsProcessing(false);
      setRejectionModalCert(null);
      setRejectionReason('');

      onShowSuccess(
        rejectionAction === 'DITOLAK' ? 'Sertifikat Ditolak' : 'Catatan Revisi Terkirim',
        `Catatan berhasil diberikan kepada ${rejectionModalCert.employeeNama}.`
      );
    }, 300);
  };

  const renderStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>✓ Disetujui</span>
          </span>
        );
      case 'SEDANG_DIVERIFIKASI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Menunggu Verifikasi</span>
          </span>
        );
      case 'PERLU_REVISI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-400">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            <span>Perlu Revisi</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Ditolak</span>
          </span>
        );
      case 'BELUM_DIUNGGAH':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-300">
            <span>Belum Upload</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-blue-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-amber-400/20 border border-amber-300/40 px-3 py-0.5 rounded-full text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Monitoring & Rekapitulasi Pegawai</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Sertifikat Pegawai TVRI Sumsel</h2>
            <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
              Dashboard verifikasi, pemantauan, dan rekapitulasi data sertifikat pelatihan seluruh pegawai TVRI Stasiun Sumatera Selatan secara real-time.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-right self-stretch md:self-auto shrink-0">
            <span className="text-[10px] text-blue-200 uppercase font-semibold block">Akses Pengguna</span>
            <span className="text-xs font-black text-amber-300 mt-0.5">
              {role === 'KEPALA_STASIUN' ? 'KEPALA STASIUN' : 'ADMIN & VERIFIKATOR'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Summary Cards (Mandatory Feature) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pegawai</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{totalPegawaiCount} <span className="text-xs font-normal text-slate-400">Pegawai</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sertifikat</p>
            <h3 className="text-xl font-black text-indigo-950 mt-0.5">{totalCertificatesCount} <span className="text-xs font-normal text-slate-400">Berkas</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sudah Upload</p>
            <h3 className="text-xl font-black text-emerald-950 mt-0.5">{pegawaiUploadedCount} <span className="text-xs font-normal text-slate-400">Pegawai</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Upload</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{pegawaiNotUploadedCount} <span className="text-xs font-normal text-slate-400">Pegawai</span></h3>
          </div>
        </div>
      </div>

      {/* Search Bar & Filter Options */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Real-time Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama Pegawai, NIP, Jabatan, atau Unit Kerja..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-600 shrink-0">Filter:</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {[
            { id: 'ALL' as CertificateFilter, label: 'Semua Pegawai' },
            { id: 'SUDAH_UPLOAD' as CertificateFilter, label: 'Sudah Upload' },
            { id: 'BELUM_UPLOAD' as CertificateFilter, label: 'Belum Upload' },
            { id: 'PENDING' as CertificateFilter, label: 'Menunggu Verifikasi' },
            { id: 'REVISION' as CertificateFilter, label: 'Perlu Revisi' },
            { id: 'REJECTED' as CertificateFilter, label: 'Ditolak' },
          ].map((item) => {
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveFilter(item.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee List Table / Card Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Daftar Rekapitulasi Pegawai ({filteredPegawaiList.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Klik "Lihat Sertifikat" untuk rincian</span>
        </div>

        {filteredPegawaiList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada pegawai ditemukan</p>
            <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter yang digunakan.</p>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-slate-100">
              {paginatedPegawaiList.map((pegawai) => {
                const userCerts = pegawaiCertificatesMap.get(pegawai.id) || pegawaiCertificatesMap.get(pegawai.nip) || [];
                const totalPelatihan = userCerts.length;
                const totalSertifikatUploaded = userCerts.filter(c => c.status === 'DISETUJUI' || c.status === 'SEDANG_DIVERIFIKASI').length;
                const hasPending = userCerts.some(c => c.status === 'SEDANG_DIVERIFIKASI');

                return (
                  <div key={pegawai.id} className="p-4 hover:bg-blue-50/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{pegawai.nama}</h4>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                          {pegawai.nip}
                        </span>
                        {hasPending && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            Verifikasi Baru
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {pegawai.jabatan} • <span className="text-blue-900 font-bold">{pegawai.unitKerja}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-6 self-stretch sm:self-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Pelatihan</span>
                          <span className="text-xs font-black text-slate-800">{totalPelatihan}</span>
                        </div>
                        <div className="bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">
                          <span className="text-[9px] text-blue-600 font-bold uppercase block">Total Sertifikat</span>
                          <span className="text-xs font-black text-blue-900">{totalSertifikatUploaded}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedPegawai(pegawai)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm shadow-blue-500/20"
                      >
                        <span>Lihat Sertifikat</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100">
              <Pagination
                currentPage={validCurrentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                entityName="Pegawai"
              />
            </div>
          </div>
        )}
      </div>

      {/* Detail Pegawai & Certificate List Overlay Modal */}
      {selectedPegawai && (() => {
        const userCerts = pegawaiCertificatesMap.get(selectedPegawai.id) || pegawaiCertificatesMap.get(selectedPegawai.nip) || [];

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-blue-900">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Rincian Sertifikat Pegawai</h3>
                </div>
                <button
                  onClick={() => setSelectedPegawai(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Pegawai Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold">Nama Pegawai</span>
                    <h3 className="text-base font-black text-blue-950">{selectedPegawai.nama}</h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-900 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-sm">
                    NIP: {selectedPegawai.nip}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Jabatan:</span>
                    <span className="font-semibold text-slate-900">{selectedPegawai.jabatan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Unit Kerja:</span>
                    <span className="font-semibold text-slate-900">{selectedPegawai.unitKerja}</span>
                  </div>
                </div>
              </div>

              {/* Certificates Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>SERTIFIKAT YANG DIMILIKI ({userCerts.length})</span>
                </h4>

                {userCerts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-1">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Belum Ada Sertifikat Diunggah</p>
                    <p className="text-[11px] text-slate-500">Pegawai ini belum mengunggah sertifikat pelatihannya ke sistem SIAP.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {userCerts.map((cert, idx) => (
                      <div key={cert.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              {idx + 1}. {cert.jenisPelatihan}
                            </span>
                            <h5 className="text-xs font-extrabold text-slate-900">{cert.judulPelatihan}</h5>
                            <p className="text-[11px] text-slate-600">Penyelenggara: {cert.penyelenggara}</p>
                            {cert.nomorSertifikat && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                No. Sertifikat: <strong className="text-slate-800">{cert.nomorSertifikat}</strong>
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {renderStatusBadge(cert.status)}
                          </div>
                        </div>

                        {/* Rejection / Revision Note */}
                        {cert.catatanRevisi && (
                          <div className="bg-amber-100/80 border border-amber-300 rounded-lg p-2.5 text-[11px] text-amber-900 italic">
                            Catatan: "{cert.catatanRevisi}"
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            {cert.fileNama && (
                              <button
                                onClick={() => setPreviewCert(cert)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                            )}

                            {cert.fileNama && (
                              <button
                                onClick={() => handleDownloadCertificate(cert)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            )}
                          </div>

                          {/* Verification Buttons for Admin only (Kepsta is READ ONLY) */}
                          {isAdmin && cert.status === 'SEDANG_DIVERIFIKASI' && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setRejectionModalCert(cert);
                                  setRejectionAction('PERLU_REVISI');
                                  setRejectionReason('');
                                }}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak / Revisi</span>
                              </button>

                              <button
                                onClick={() => handleApproveCertificate(cert)}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDownloadEmployeePortfolioPDF(selectedPegawai)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Portofolio PDF</span>
                </button>

                <button
                  onClick={() => setSelectedPegawai(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject / Revision Modal */}
      {rejectionModalCert && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>Berikan Catatan Verifikasi Sertifikat</span>
              </h3>
              <button
                onClick={() => setRejectionModalCert(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitRejectionModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Status Tindakan:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectionAction('PERLU_REVISI')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      rejectionAction === 'PERLU_REVISI'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Perlu Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectionAction('DITOLAK')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      rejectionAction === 'DITOLAK'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Ditolak Permanen
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan / Catatan Revisi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: File scan tidak jelas. Silakan upload ulang dengan kualitas yang lebih baik."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectionModalCert(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="min-h-full flex items-start justify-center">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                    Pratinjau Sertifikat Resmi
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1">{previewCert.judulPelatihan}</h3>
                </div>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
                >
                  &times;
                </button>
              </div>

              {previewCert.fileUrl && !previewCert.fileUrl.startsWith('blob:') ? (
                previewCert.fileType === 'image' ? (
                  <img
                    src={previewCert.fileUrl}
                    alt={previewCert.judulPelatihan}
                    className="w-full max-h-[65vh] object-contain rounded-xl border border-slate-200 bg-slate-50"
                  />
                ) : (
                  <iframe
                    src={previewCert.fileUrl}
                    title={previewCert.judulPelatihan}
                    className="w-full h-[65vh] rounded-xl border border-slate-200 bg-slate-50"
                  />
                )
              ) : (
                <div className="bg-white rounded-2xl p-6 text-slate-800 border-2 border-slate-200 space-y-5">
                  <div className="flex items-center justify-between border-b-2 border-double border-slate-900 pb-4">
                    <div className="flex items-center space-x-3">
                      <TvriSumselLogo className="h-10" badge={false} />
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">LPP TVRI Stasiun Sumatera Selatan</p>
                        <p className="text-[10px] text-slate-500">Sistem Informasi & Administrasi Pelatihan (SIAP)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold block">
                        {previewCert.nomorSertifikat || 'Belum ada nomor sertifikat'}
                      </span>
                      <span className="text-[10px] text-slate-400">Terbit: {previewCert.tanggalSertifikat || '-'}</span>
                    </div>
                  </div>

                  <div className="text-center space-y-2 py-5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-800">Ringkasan Riwayat Pelatihan</p>
                    <h2 className="text-lg font-black text-slate-900 px-4">{previewCert.judulPelatihan}</h2>
                    <p className="text-xs text-slate-600">
                      Diberikan Kepada: <strong className="text-slate-900 font-black">{previewCert.employeeNama || 'Pegawai TVRI'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      NIP: {previewCert.employeeNip} • {previewCert.employeeUnitKerja}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Penyelenggara</p>
                      <p className="font-semibold text-slate-800">{previewCert.penyelenggara}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Status Verifikasi</p>
                      <p className={`font-bold flex items-center space-x-1 justify-end ${previewCert.status === 'DISETUJUI' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{previewCert.status === 'DISETUJUI' ? 'Terverifikasi Sistem SIAP' : previewCert.status.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-1">
                    Belum ada berkas sertifikat asli yang diunggah oleh pegawai.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Nama File: <strong className="text-slate-800">{previewCert.fileNama || 'Belum ada berkas diunggah'}</strong>
                </span>

                <button
                  onClick={() => setPreviewCert(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

