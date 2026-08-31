import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, MapPin, Building2, 
  Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Printer, Paperclip, 
  Send, X, ArrowUpRight, ShieldCheck, UserCheck, Award, BookOpen,
  UploadCloud, Image, Trash2, FileCheck
} from 'lucide-react';
import { PengajuanPelatihan, Pegawai, UserAccount, SubmissionStatus, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';
import { Storage, generateSubmissionNumber } from '../lib/storage';
import { Pagination } from './Pagination';
import { RekapPengajuanModal } from './RekapPengajuanModal';

interface PengajuanViewProps {
  submissions: PengajuanPelatihan[];
  pegawaiList: Pegawai[];
  currentUser: UserAccount | null;
  currentPegawai: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  autoOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
  onSaveSubmission: (submission: PengajuanPelatihan) => void;
  onCancelSubmission: (id: string) => void;
  onOpenDetailModal: (sub: PengajuanPelatihan) => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

const JENIS_PELATIHAN_OPTIONS = [
  'Teknis Penyiaran & Otomasi Studio',
  'Jurnalistik & Production Newsroom',
  'Pengarahan Acara & Produksi Program',
  'IT, Network & Cyber Security Broadcasting',
  'Keuangan, BMN & Pengadaan',
  'Manajemen SDM & Keorganisasian',
  'Hukum, Komunikasi Public & Layanan Informasi',
  'Lainnya'
];

export const PengajuanView: React.FC<PengajuanViewProps> = ({
  submissions,
  pegawaiList,
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  autoOpenCreateModal = false,
  onCloseCreateModal,
  onSaveSubmission,
  onCancelSubmission,
  onOpenDetailModal,
  onShowSuccess
}) => {
  const role = currentUser?.role || 'PEGAWAI';
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || role === 'KEPALA_STASIUN';
  const isAdmin = (role === 'ADMIN_SDM' || role === 'SUPER_ADMIN') && !isKepsta;

  const [activeSubTab, setActiveSubTab] = useState<'PENGAJUAN_SAYA' | 'SEMUA_PENGAJUAN' | 'RIWAYAT_PELATIHAN'>('PENGAJUAN_SAYA');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRekapModalOpen, setIsRekapModalOpen] = useState(false);

  React.useEffect(() => {
    if (autoOpenCreateModal) {
      setIsCreateModalOpen(true);
    }
  }, [autoOpenCreateModal]);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileError, setAttachedFileError] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const validateAndProcessFile = (file: File) => {
    setAttachedFileError('');
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!validExtensions.includes(ext)) {
      setAttachedFileError('Format file tidak didukung! Harap unggah berkas PDF, JPG, atau PNG.');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setAttachedFileError('Ukuran file terlalu besar! Maksimal ukuran file adalah 1 MB.');
      return;
    }

    setAttachedFile(file);
    setFormData(prev => ({ ...prev, lampiranNama: file.name }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearAttachedFile = () => {
    setAttachedFile(null);
    setAttachedFileError('');
    setFormData(prev => ({ ...prev, lampiranNama: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setAttachedFile(null);
    setAttachedFileError('');
    setIsDraggingOver(false);
    if (onCloseCreateModal) {
      onCloseCreateModal();
    }
  };
  const [submissionToCancel, setSubmissionToCancel] = useState<PengajuanPelatihan | null>(null);

  // Global Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Tanggal hari ini (untuk validasi "tidak boleh mundur" & atribut min pada input tanggal)
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Batasan tanggal mundur: bisa dibuka/tutup admin dari halaman Pengaturan System
  // (tabel app_settings, key ALLOW_BACKDATE_SUBMISSION). Default: batasan AKTIF.
  const [allowBackdate, setAllowBackdate] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Storage.getAppSetting('ALLOW_BACKDATE_SUBMISSION').then((value) => {
      if (isMounted) setAllowBackdate(value === 'true');
    });
    return () => { isMounted = false; };
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: currentPegawai?.id || (pegawaiList[0]?.id || ''),
    judulPelatihan: '',
    jenisPelatihan: JENIS_PELATIHAN_OPTIONS[0],
    jenisPelatihanLainnya: '',
    penyelenggara: 'Pusdiklat LPP TVRI / Kominfo',
    tanggalMulai: getTodayStr(),
    tanggalSelesai: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    lokasi: '',
    keterangan: '',
    jumlahJp: '' as number | '',
    lampiranNama: ''
  });

  // Strictly personal submissions belonging ONLY to the currently logged in account
  const mySubmissions = submissions.filter(s => 
    s.employeeId === currentPegawai?.id || 
    (currentPegawai?.nip && s.employeeNip === currentPegawai.nip) ||
    (currentPegawai?.nama && s.employeeNama && s.employeeNama.toLowerCase().trim() === currentPegawai.nama.toLowerCase().trim())
  );

  // Base submissions strictly evaluated based on selected active sub-tab
  let baseSubmissions: PengajuanPelatihan[] = [];
  if (activeSubTab === 'PENGAJUAN_SAYA') {
    // ALWAYS strictly personal data for logged in user
    baseSubmissions = mySubmissions;
  } else if (activeSubTab === 'SEMUA_PENGAJUAN') {
    // All submissions for Admin and Kepala Stasiun
    baseSubmissions = (isAdmin || isKepsta) ? submissions : mySubmissions;
  } else if (activeSubTab === 'RIWAYAT_PELATIHAN') {
    // Approved training records
    const source = (isAdmin || isKepsta) ? submissions : mySubmissions;
    baseSubmissions = source.filter(s => s.status === 'APPROVED');
  }

  const filteredSubmissions = baseSubmissions.filter(s => {
    const matchesSearch = 
      s.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.judulPelatihan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.penyelenggara.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.employeeNama && s.employeeNama.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + pageSize);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judulPelatihan || !formData.penyelenggara || !formData.lokasi) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Formulir Belum Lengkap',
          message: 'Judul Pelatihan, Penyelenggara, dan Lokasi wajib diisi.',
          type: 'info',
          badge: 'PERINGATAN FORM'
        });
      }
      return;
    }

    if (formData.jenisPelatihan === 'Lainnya' && !formData.jenisPelatihanLainnya.trim()) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Jenis Rumpun Pelatihan Belum Diisi',
          message: 'Karena memilih "Lainnya", harap isi nama rumpun pelatihan yang dimaksud.',
          type: 'info',
          badge: 'PERINGATAN FORM'
        });
      }
      return;
    }

    if (!formData.jumlahJp || Number(formData.jumlahJp) <= 0) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Jumlah JP Belum Diisi',
          message: 'Jumlah JP (Jam Pelatihan) wajib diisi dan lebih dari 0.',
          type: 'info',
          badge: 'PERINGATAN FORM'
        });
      }
      return;
    }

    if (!allowBackdate && formData.tanggalMulai < getTodayStr()) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Tanggal Mulai Tidak Valid',
          message: 'Tanggal mulai pelaksanaan tidak boleh mundur dari hari ini. Silakan pilih tanggal hari ini atau setelahnya.',
          type: 'info',
          badge: 'PERINGATAN FORM'
        });
      }
      return;
    }

    const selectedEmp = (isAdmin || isKepsta)
      ? (pegawaiList.find(p => p.id === formData.employeeId) || currentPegawai)
      : currentPegawai;

    let lampiranUrl: string | undefined = undefined;
    let lampiranNamaFinal = formData.lampiranNama || 'Berkas_Pengajuan_TVRI.pdf';

    if (attachedFile) {
      const uploadResult = await Storage.uploadLampiranFile(attachedFile, selectedEmp?.id || 'UNKNOWN');
      if (uploadResult.error || !uploadResult.url) {
        setAttachedFileError(uploadResult.error || 'Gagal mengunggah lampiran. Silakan coba lagi.');
        return;
      }
      lampiranUrl = uploadResult.url;
      lampiranNamaFinal = attachedFile.name;
    }

    const newSubNumber = generateSubmissionNumber(submissions);

    const newSubmission: PengajuanPelatihan = {
      id: `SUB${String(Date.now()).slice(-5)}`,
      nomor: newSubNumber,
      employeeId: selectedEmp?.id || '',
      employeeNama: selectedEmp?.nama || 'Pegawai TVRI',
      employeeNip: selectedEmp?.nip || '',
      employeeUnitKerja: selectedEmp?.unitKerja || '',
      employeeJabatan: selectedEmp?.jabatan || '',
      employeeGolPangkat: selectedEmp?.golPangkat || '',
      employeeStatusPegawai: selectedEmp?.statusPegawai || 'PNS',
      judulPelatihan: formData.judulPelatihan,
      jenisPelatihan: formData.jenisPelatihan === 'Lainnya' ? formData.jenisPelatihanLainnya.trim() : formData.jenisPelatihan,
      penyelenggara: formData.penyelenggara,
      tanggalMulai: formData.tanggalMulai,
      tanggalSelesai: formData.tanggalSelesai,
      lokasi: formData.lokasi,
      keterangan: formData.keterangan,
      jumlahJp: formData.jumlahJp ? Number(formData.jumlahJp) : undefined,
      status: 'DRAFT',
      lampiranNama: lampiranNamaFinal,
      lampiranUrl: lampiranUrl,
      createdAt: new Date().toISOString()
    };

    onSaveSubmission(newSubmission);

    handleCloseCreateModal();

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Pengajuan Berhasil Dikirim!',
        message: `Pengajuan ${newSubNumber} atas nama ${selectedEmp?.nama || 'Pegawai'} telah berhasil dibuat dan diteruskan ke Verifikasi Admin.`,
        badge: 'SIAP SUMSEL',
        type: 'success'
      });
    }

    // Reset form
    setFormData({
      employeeId: currentPegawai?.id || (pegawaiList[0]?.id || ''),
      judulPelatihan: '',
      jenisPelatihan: JENIS_PELATIHAN_OPTIONS[0],
      jenisPelatihanLainnya: '',
      penyelenggara: 'Pusdiklat LPP TVRI / Kominfo',
      tanggalMulai: getTodayStr(),
      tanggalSelesai: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      lokasi: '',
      keterangan: '',
      jumlahJp: '' as number | '',
      lampiranNama: ''
    });
    setAttachedFile(null);
    setAttachedFileError('');
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui Kepsta</span>
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu Kepsta</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Ditolak</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-600 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-medium">
            <X className="w-3.5 h-3.5" />
            <span>Dibatalkan</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Draf / Verifikasi Admin</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
              SIAP Pelatihan
            </span>
            {(!isAdmin && !isKepsta) && (
              <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px] px-2 py-0.5 rounded">
                Portal Mandiri Pegawai
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>
              {activeSubTab === 'PENGAJUAN_SAYA' 
                ? 'Riwayat Pengajuan Saya' 
                : activeSubTab === 'SEMUA_PENGAJUAN'
                ? 'Semua Pengajuan Pegawai TVRI Sumsel'
                : 'Riwayat Mengikuti Pelatihan'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeSubTab === 'PENGAJUAN_SAYA'
              ? `Menampilkan riwayat pengajuan pelatihan mandiri khusus atas nama ${currentPegawai?.nama || 'akun Anda'}.`
              : activeSubTab === 'SEMUA_PENGAJUAN'
              ? 'Daftar pengajuan izin dan tugas pelatihan bagi seluruh pegawai TVRI Stasiun Sumatera Selatan.'
              : `Rekapitulasi pelatihan resmi yang telah disetujui untuk ${(!isAdmin && !isKepsta) ? (currentPegawai?.nama || 'Anda') : 'pegawai TVRI Sumsel'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(isAdmin || isKepsta) && (
            <button
              onClick={() => setIsRekapModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm border border-slate-200 uppercase tracking-wider"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Rekap Bulanan (PDF)</span>
            </button>
          )}
          <button
            id="btn-open-create-modal"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-2 shrink-0 shadow-md uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Buat Pengajuan Baru</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs for Employee & Management Views */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => { setActiveSubTab('PENGAJUAN_SAYA'); setStatusFilter('ALL'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeSubTab === 'PENGAJUAN_SAYA'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Riwayat Pengajuan Saya ({mySubmissions.length})</span>
        </button>

        {(isAdmin || isKepsta) && (
          <button
            onClick={() => { setActiveSubTab('SEMUA_PENGAJUAN'); setStatusFilter('ALL'); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeSubTab === 'SEMUA_PENGAJUAN'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Semua Pengajuan Pegawai ({submissions.length})</span>
          </button>
        )}

        <button
          onClick={() => { setActiveSubTab('RIWAYAT_PELATIHAN'); setStatusFilter('ALL'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeSubTab === 'RIWAYAT_PELATIHAN'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>
            {(!isAdmin && !isKepsta) ? 'Riwayat Mengikuti Pelatihan' : 'Pelatihan Disetujui'} ({
              (isAdmin || isKepsta) 
                ? submissions.filter(s => s.status === 'APPROVED').length 
                : mySubmissions.filter(s => s.status === 'APPROVED').length
            })
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor, judul pelatihan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
          />
        </div>

        {(activeSubTab === 'PENGAJUAN_SAYA' || activeSubTab === 'SEMUA_PENGAJUAN') && (
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {['ALL', 'DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st === 'ALL' && 'Semua'}
                {st === 'DRAFT' && 'Draf Admin'}
                {st === 'WAITING_APPROVAL' && 'Menunggu Kepsta'}
                {st === 'APPROVED' && 'Disetujui'}
                {st === 'REJECTED' && 'Ditolak'}
                {st === 'CANCELLED' && 'Dibatalkan'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List of Submissions */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedSubmissions.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200/90 rounded-2xl p-10 text-center text-slate-500 text-xs shadow-sm">
              <p className="font-bold text-slate-700 text-sm mb-1">Tidak Ada Data Pelatihan</p>
              <p>
                {activeSubTab === 'PENGAJUAN_SAYA'
                  ? `Belum ada riwayat pengajuan pelatihan atas nama ${currentPegawai?.nama || 'akun Anda'}.`
                  : activeSubTab === 'RIWAYAT_PELATIHAN'
                  ? 'Belum ada riwayat mengikuti pelatihan yang disetujui.'
                  : 'Tidak ada data pengajuan pelatihan yang cocok dengan filter pencarian.'}
              </p>
            </div>
          ) : (
            paginatedSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-amber-700 font-extrabold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{sub.nomor}</span>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Diajukan: {new Date(sub.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>{getStatusBadge(sub.status)}</div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                      {sub.judulPelatihan}
                    </h3>
                    <p className="text-xs text-amber-800 font-bold mt-1">
                      Rumpun: {sub.jenisPelatihan}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
                    <div className="flex items-start space-x-2">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <strong className="text-slate-900 font-bold">{sub.employeeNama}</strong>
                          {sub.employeeStatusPegawai && (
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              sub.employeeStatusPegawai === 'PNS' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {sub.employeeStatusPegawai}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          NIP: <span className="font-mono font-bold text-slate-800">{sub.employeeNip || '-'}</span> | Gol: <span className="text-slate-800 font-medium">{sub.employeeGolPangkat || '-'}</span>
                        </div>
                        <div className="text-[10px] text-blue-800 font-bold mt-0.5">
                          {sub.employeeJabatan || 'Pegawai'} - {sub.employeeUnitKerja || 'TVRI Sumsel'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-1.5 border-t border-slate-200/60">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 truncate font-medium">Penyelenggara: {sub.penyelenggara}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">
                        {new Date(sub.tanggalMulai).toLocaleDateString('id-ID')} s/d {new Date(sub.tanggalSelesai).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 truncate">{sub.lokasi}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1 font-medium">
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[130px]">{sub.lampiranNama || 'Berkas Lampiran'}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    {(sub.status === 'DRAFT' || sub.status === 'WAITING_APPROVAL') && (
                      <button
                        type="button"
                        onClick={() => setSubmissionToCancel(sub)}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Batalkan</span>
                      </button>
                    )}
                    <button
                      onClick={() => onOpenDetailModal(sub)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition flex items-center space-x-1 shadow-sm"
                    >
                      <span>Detail & Status</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Global Pagination */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <Pagination
            currentPage={validCurrentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            entityName={activeSubTab === 'RIWAYAT_PELATIHAN' ? 'Riwayat Pelatihan' : 'Pengajuan Pelatihan'}
          />
        </div>
      </div>

      {/* Modal Form Submission */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-amber-500" />
                  <span>Form Pengajuan Pelatihan Baru (TVRI Sumsel)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Isi data lengkap rencana kegiatan pelatihan kedinasan pegawai.
                </p>
              </div>
              <button onClick={handleCloseCreateModal} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Pegawai Pemohon *</label>
                {(isAdmin || isKepsta) ? (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    {pegawaiList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama} - NIP: {p.nip} ({p.unitKerja})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2.5 text-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{currentPegawai?.nama || 'Pegawai TVRI'}</span>
                      <span className="text-[10px] text-slate-600 ml-2">NIP: {currentPegawai?.nip || '-'} ({currentPegawai?.unitKerja || 'TVRI Sumsel'})</span>
                    </div>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                      Akun Anda
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Judul / Nama Pelatihan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Workshop Masterclass Broadcast Engineering & Otomasi Penyiaran"
                  value={formData.judulPelatihan}
                  onChange={(e) => setFormData({ ...formData, judulPelatihan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jenis Rumpun Pelatihan *</label>
                  <select
                    value={formData.jenisPelatihan}
                    onChange={(e) => setFormData({ ...formData, jenisPelatihan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    {JENIS_PELATIHAN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {formData.jenisPelatihan === 'Lainnya' && (
                    <input
                      type="text"
                      required
                      placeholder="Sebutkan jenis rumpun pelatihan yang dimaksud..."
                      value={formData.jenisPelatihanLainnya}
                      onChange={(e) => setFormData({ ...formData, jenisPelatihanLainnya: e.target.value })}
                      className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lembaga Penyelenggara *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pusdiklat LPP TVRI / Kominfo / Lembaga Terkreditasi"
                    value={formData.penyelenggara}
                    onChange={(e) => setFormData({ ...formData, penyelenggara: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal Mulai Pelaksanaan *</label>
                  <input
                    type="date"
                    required
                    min={allowBackdate ? undefined : getTodayStr()}
                    value={formData.tanggalMulai}
                    onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  {allowBackdate && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      Mode tanggal mundur sedang AKTIF (khusus keperluan ADM). Nonaktifkan lagi di menu Pengaturan System jika sudah selesai.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalSelesai}
                    onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Lokasi Pelaksanaan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pusdiklat LPP TVRI Jakarta / Kantor TVRI Sumsel / Daring (Zoom Meeting) / Online"
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Jumlah JP (Jam Pelatihan) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="Contoh: 32"
                  value={formData.jumlahJp}
                  onChange={(e) => setFormData({ ...formData, jumlahJp: e.target.value === '' ? '' as any : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Upload Dokumen Lampiran / Surat Undangan */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Dokumen Lampiran / Surat Undangan <span className="text-slate-400 font-normal">(PDF, JPG, PNG)</span>
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded border border-slate-200">
                    Maks. 1 MB
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {attachedFileError && (
                  <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{attachedFileError}</span>
                  </div>
                )}

                {(attachedFile || formData.lampiranNama) ? (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                        (attachedFile?.name || formData.lampiranNama).toLowerCase().endsWith('.pdf')
                          ? 'bg-rose-100 text-rose-600 border-rose-200'
                          : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                      }`}>
                        {(attachedFile?.name || formData.lampiranNama).toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-5 h-5 stroke-[2.2]" />
                        ) : (
                          <Image className="w-5 h-5 stroke-[2.2]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-extrabold text-slate-900 text-xs truncate max-w-[220px]">
                            {attachedFile?.name || formData.lampiranNama}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md shrink-0 flex items-center space-x-1 border border-emerald-200">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            <span>Berkas Siap</span>
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Ukuran: <strong className="text-slate-700">{attachedFile ? formatFileSize(attachedFile.size) : 'Dokumen Terlampir'}</strong> • Format: <strong className="text-slate-700 uppercase">{(attachedFile?.name || formData.lampiranNama).split('.').pop() || 'PDF'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        Ganti File
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAttachedFile}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-1.5 rounded-lg transition cursor-pointer"
                        title="Hapus berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2.5 ${
                      isDraggingOver
                        ? 'border-blue-500 bg-blue-50/90 shadow-md scale-[1.01]'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-blue-100/90 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
                      <UploadCloud className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        <span className="text-blue-600 font-extrabold hover:underline">Klik untuk pilih berkas</span> atau geser & lepas file di sini
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Lampiran surat undangan resmi, ST, atau brosur pelatihan
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        .PDF
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        .PNG
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        .JPG / .JPEG
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Keterangan Tambahan / Rencana Output</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan alasan urgensi pelatihan dan manfaat peningkatan kinerja operasional TVRI Sumsel..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Kirimkan Draf Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Cancelling Submission */}
      {submissionToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 text-center mb-1">
              Konfirmasi Pembatalan Pengajuan
            </h3>
            <p className="text-xs text-slate-600 text-center mb-4 leading-relaxed">
              Apakah Anda yakin ingin membatalkan pengajuan ini? Status pengajuan akan diubah menjadi <span className="font-bold text-rose-600">Dibatalkan</span>.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs mb-5 space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{submissionToCancel.nomor}</span>
                <span className="text-blue-700">{submissionToCancel.jenisPelatihan}</span>
              </div>
              <p className="font-semibold text-slate-800">{submissionToCancel.judulPelatihan}</p>
              <p className="text-[11px] text-slate-500">Penyelenggara: {submissionToCancel.penyelenggara}</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSubmissionToCancel(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetSub = submissionToCancel;
                  onCancelSubmission(targetSub.id);
                  setSubmissionToCancel(null);
                  if (onShowSuccess) {
                    onShowSuccess({
                      title: 'Pengajuan Dibatalkan',
                      message: `Pengajuan ${targetSub.nomor} (${targetSub.judulPelatihan}) telah berhasil dibatalkan.`,
                      type: 'info',
                      badge: 'SIAP SUMSEL'
                    });
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Ya, Batalkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isRekapModalOpen && (
        <RekapPengajuanModal
          pegawaiList={pegawaiList}
          submissions={submissions}
          onClose={() => setIsRekapModalOpen(false)}
        />
      )}
    </div>
  );
};
