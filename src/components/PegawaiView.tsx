import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Edit, Trash2, Key, CheckCircle, XCircle, 
  UserPlus, RefreshCw, Filter, Building2, Shield, ShieldCheck, Eye, Award, 
  FileText, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  X, Crown, BookOpen, CheckCircle2, Sparkles, UserCheck, BarChart3, RotateCcw
} from 'lucide-react';
import { 
  Pegawai, UserAccount, PengajuanPelatihan, SertifikatPelatihan, 
  KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege 
} from '../types';
import { UNIT_KERJA_LIST } from '../data/initialData';
import { generateDefaultPassword, Storage } from '../lib/storage';
import { Pagination } from './Pagination';

interface PegawaiViewProps {
  pegawaiList: Pegawai[];
  usersList: UserAccount[];
  submissions?: PengajuanPelatihan[];
  certificates?: SertifikatPelatihan[];
  currentUser?: UserAccount | null;
  currentPegawai?: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  onSavePegawai: (pegawai: Pegawai) => void;
  onDeletePegawai: (id: string) => void;
  onResetPassword: (employeeId: string) => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const PegawaiView: React.FC<PegawaiViewProps> = ({
  pegawaiList,
  usersList,
  submissions = [],
  certificates = [],
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  onSavePegawai,
  onDeletePegawai,
  onResetPassword,
  onShowSuccess
}) => {
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || currentUser?.role === 'KEPALA_STASIUN';
  const isAdmin = (currentUser?.role === 'ADMIN_SDM' || currentUser?.role === 'SUPER_ADMIN') && !isKepsta;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedStatusPegawai, setSelectedStatusPegawai] = useState('ALL');
  const [selectedHakAkses, setSelectedHakAkses] = useState('ALL');
  const [selectedStatusAkun, setSelectedStatusAkun] = useState('ALL');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10); // Default 10 data per halaman
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Add/Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPegawai, setEditingPegawai] = useState<Pegawai | null>(null);

  // Detail Modal/Drawer State
  const [selectedDetailPegawai, setSelectedDetailPegawai] = useState<Pegawai | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'profile' | 'submissions' | 'certificates' | 'stats'>('profile');

  // Form State
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    tanggalLahir: '1990-01-01',
    jabatan: '',
    golPangkat: 'III a / Penata Muda',
    statusPegawai: 'PNS',
    unitKerja: UNIT_KERJA_LIST[0],
    email: '',
    aktif: true
  });

  // Modal Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter Logic
  const filteredList = useMemo(() => {
    return pegawaiList.filter(p => {
      const searchLower = searchTerm.toLowerCase().trim();
      const userAcc = usersList.find(u => u.employeeId === p.id || u.username === p.nip);

      // Search match
      const matchesSearch = !searchLower || (
        p.nama.toLowerCase().includes(searchLower) ||
        p.nip.includes(searchLower) ||
        p.jabatan.toLowerCase().includes(searchLower) ||
        (p.golPangkat && p.golPangkat.toLowerCase().includes(searchLower)) ||
        (p.statusPegawai && p.statusPegawai.toLowerCase().includes(searchLower)) ||
        (p.email && p.email.toLowerCase().includes(searchLower)) ||
        p.unitKerja.toLowerCase().includes(searchLower)
      );

      // Unit Kerja match
      const matchesUnit = selectedUnit === 'ALL' || p.unitKerja === selectedUnit;

      // Status Pegawai match
      const matchesStatusPegawai = selectedStatusPegawai === 'ALL' || 
        (p.statusPegawai || 'PNS').toUpperCase() === selectedStatusPegawai.toUpperCase();

      // Status Akun match
      const matchesStatusAkun = selectedStatusAkun === 'ALL' || 
        (selectedStatusAkun === 'AKTIF' && p.aktif) || 
        (selectedStatusAkun === 'NONAKTIF' && !p.aktif);

      // Hak Akses match
      let matchesHakAkses = true;
      if (selectedHakAkses !== 'ALL') {
        const hasKepstaPrivilege = checkHasKepalaStasiunPrivilege(p.id, activeKepstaRecord, p);
        if (selectedHakAkses === 'ADMIN') {
          matchesHakAkses = userAcc?.role === 'ADMIN_SDM' || userAcc?.role === 'SUPER_ADMIN';
        } else if (selectedHakAkses === 'KEPSTA') {
          matchesHakAkses = userAcc?.role === 'KEPALA_STASIUN' || hasKepstaPrivilege;
        } else if (selectedHakAkses === 'PEGAWAI') {
          matchesHakAkses = userAcc?.role === 'PEGAWAI' && !hasKepstaPrivilege;
        }
      }

      return matchesSearch && matchesUnit && matchesStatusPegawai && matchesStatusAkun && matchesHakAkses;
    });
  }, [pegawaiList, usersList, searchTerm, selectedUnit, selectedStatusPegawai, selectedStatusAkun, selectedHakAkses, activeKepstaRecord]);

  // Reset to Page 1 when any filter/search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleUnitFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUnit(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusPegawaiFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatusPegawai(e.target.value);
    setCurrentPage(1);
  };

  const handleHakAksesFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedHakAkses(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusAkunFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatusAkun(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedUnit('ALL');
    setSelectedStatusPegawai('ALL');
    setSelectedHakAkses('ALL');
    setSelectedStatusAkun('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || selectedUnit !== 'ALL' || selectedStatusPegawai !== 'ALL' || selectedHakAkses !== 'ALL' || selectedStatusAkun !== 'ALL';

  // Pagination Calculations
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Guard current page bounds
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  // Quick stats calculation
  const totalPNS = pegawaiList.filter(p => p.statusPegawai === 'PNS' || !p.statusPegawai).length;
  const totalPPPK = pegawaiList.filter(p => p.statusPegawai === 'PPPK').length;
  const totalKontrak = pegawaiList.filter(p => p.statusPegawai === 'KONTRAK' || p.statusPegawai === 'PPNPN').length;
  const totalAktif = pegawaiList.filter(p => p.aktif).length;

  // Add / Edit Handlers
  const handleOpenAdd = () => {
    setEditingPegawai(null);
    setFormData({
      nip: '',
      nama: '',
      tanggalLahir: '1990-01-01',
      jabatan: '',
      golPangkat: 'III a / Penata Muda',
      statusPegawai: 'PNS',
      unitKerja: UNIT_KERJA_LIST[0],
      email: '',
      aktif: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Pegawai) => {
    setEditingPegawai(p);
    setFormData({
      nip: p.nip,
      nama: p.nama,
      tanggalLahir: p.tanggalLahir,
      jabatan: p.jabatan,
      golPangkat: p.golPangkat || 'III a / Penata Muda',
      statusPegawai: p.statusPegawai || 'PNS',
      unitKerja: p.unitKerja,
      email: p.email,
      aktif: p.aktif
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.nama || !formData.jabatan) {
      if (onShowSuccess) {
        onShowSuccess({
          title: 'Data Belum Lengkap',
          message: 'NIP, Nama, dan Jabatan wajib diisi.',
          type: 'info',
          badge: 'FORM PEGAWAI'
        });
      }
      return;
    }

    const newPegawai: Pegawai = {
      id: editingPegawai ? editingPegawai.id : `EMP${String(Date.now()).slice(-5)}`,
      nip: formData.nip,
      nama: formData.nama,
      tanggalLahir: formData.tanggalLahir,
      jabatan: formData.jabatan,
      golPangkat: formData.golPangkat,
      statusPegawai: formData.statusPegawai,
      unitKerja: formData.unitKerja,
      email: formData.email,
      aktif: formData.aktif,
      createdAt: editingPegawai ? editingPegawai.createdAt : new Date().toISOString()
    };

    onSavePegawai(newPegawai);
    setIsModalOpen(false);

    if (onShowSuccess) {
      onShowSuccess({
        title: editingPegawai ? 'Data Pegawai Diperbarui' : 'Pegawai Baru Ditambahkan',
        message: editingPegawai 
          ? `Profil data pegawai ${formData.nama} (NIP: ${formData.nip}) berhasil diperbarui.`
          : `Pegawai ${formData.nama} (NIP: ${formData.nip}) berhasil ditambahkan ke database SDM TVRI Sumsel.`,
        badge: 'DATABASE PEGAWAI',
        type: 'success'
      });
    }
  };

  const handleResetPasswordClick = async (p: Pegawai) => {
    const defaultPass = generateDefaultPassword(p.tanggalLahir, p.nip);
    const res = await Storage.resetUserPasswordByAdmin(p.id, currentPegawai?.nama || 'Admin SDM');
    onResetPassword(p.id);
    if (onShowSuccess) {
      onShowSuccess({
        title: 'Reset Password Berhasil',
        message: `Password akun ${p.nama} berhasil direset oleh Admin SDM ke password default: "${res.temporaryPassword || defaultPass}". Pegawai dapat langsung menggunakannya untuk login.`,
        badge: 'MANAJEMEN PASSWORD',
        type: 'success'
      });
    }
  };

  const handleDeleteClick = (p: Pegawai) => {
    onDeletePegawai(p.id);
    if (onShowSuccess) {
      onShowSuccess({
        title: 'Data Pegawai Dihapus',
        message: `Data pegawai ${p.nama} telah berhasil dihapus dari sistem.`,
        badge: 'DATABASE PEGAWAI',
        type: 'info'
      });
    }
  };

  // Helper to open employee detail
  const handleOpenDetail = (p: Pegawai) => {
    setSelectedDetailPegawai(p);
    setDetailActiveTab('profile');
  };

  // Helper for pagination page array generation
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, validCurrentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-800 text-base font-bold">&times;</button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Pegawai</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-slate-900">{pegawaiList.length}</span>
              <span className="text-[10px] text-emerald-600 font-bold">({totalAktif} Aktif)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pegawai PNS</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-indigo-950">{totalPNS}</span>
              <span className="text-[10px] text-slate-500 font-medium">ASN</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pegawai PPPK</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-emerald-950">{totalPPPK}</span>
              <span className="text-[10px] text-slate-500 font-medium">ASN</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tenaga Kontrak</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-amber-950">{totalKontrak}</span>
              <span className="text-[10px] text-slate-500 font-medium">PPNPN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header & Controls Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>{isKepsta ? 'Monitoring Data Pegawai TVRI Sumsel' : 'Manajemen Data Pegawai TVRI Sumsel'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isKepsta 
                ? 'Pencarian, pemfilteran, dan monitoring ringkas Aparatur Sipil Negara & Pegawai LPP TVRI Stasiun Sumatera Selatan.' 
                : 'Pencarian, pemfilteran, dan kelola master data Aparatur Sipil Negara & Pegawai LPP TVRI Stasiun Sumatera Selatan.'}
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-end lg:self-auto">
            {isAdmin ? (
              <button
                id="btn-add-pegawai"
                onClick={handleOpenAdd}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-2 shrink-0 shadow-md uppercase tracking-wider"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Tambah Pegawai</span>
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 flex items-center space-x-1.5 shrink-0 shadow-2xs">
                <Crown className="w-4 h-4 text-amber-600" />
                <span>Hak Akses Kepala Stasiun</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Search and Multi-Filter Controls */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama, NIP, Email, Jabatan..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Unit Kerja Filter */}
            <div>
              <select
                value={selectedUnit}
                onChange={handleUnitFilterChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Unit Kerja</option>
                {UNIT_KERJA_LIST.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Status Pegawai Filter */}
            <div>
              <select
                value={selectedStatusPegawai}
                onChange={handleStatusPegawaiFilterChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Status Pegawai</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="KONTRAK">Tenaga Kontrak / PPNPN</option>
              </select>
            </div>

            {/* Hak Akses Filter */}
            <div>
              <select
                value={selectedHakAkses}
                onChange={handleHakAksesFilterChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Hak Akses</option>
                <option value="PEGAWAI">Hak Akses: Pegawai</option>
                <option value="ADMIN">Hak Akses: Admin SDM</option>
                <option value="KEPSTA">Hak Akses: Kepala Stasiun</option>
              </select>
            </div>
          </div>

          {/* Filter Bar Footer (Status Akun Filter + Clear Filters + Page Size selector) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-medium border-t border-slate-100/80">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Status Akun Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500 font-semibold shrink-0">Status:</span>
                <select
                  value={selectedStatusAkun}
                  onChange={handleStatusAkunFilterChange}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="ALL">Semua Status Akun</option>
                  <option value="AKTIF">Hanya Aktif</option>
                  <option value="NONAKTIF">Hanya Non-Aktif</option>
                </select>
              </div>

              {/* Reset Filters button if active */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center space-x-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Pagination Size Selector & Info */}
            <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500 font-semibold">Tampilkan per halaman:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value={10}>10 Data</option>
                  <option value={20}>20 Data</option>
                  <option value={50}>50 Data</option>
                  <option value={100}>100 Data</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-600 font-semibold">
                Menampilkan <span className="font-extrabold text-blue-800">{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</span> dari <span className="font-extrabold text-slate-900">{totalItems}</span> Pegawai
                {totalItems !== pegawaiList.length && (
                  <span className="text-slate-400 font-normal ml-1">(total {pegawaiList.length})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streamlined Pegawai Table (Clean, Responsive, No Horizontal Scroll) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {paginatedList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800">Tidak ada pegawai yang ditemukan</p>
              <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau sesuaikan kriteria filter Anda.</p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs transition mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Bersihkan Filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/90 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Pegawai & NIP</th>
                  <th className="px-4 py-3.5">Status Kepegawaian</th>
                  <th className="px-4 py-3.5">Jabatan & Unit Kerja</th>
                  <th className="px-4 py-3.5">Hak Akses Sistem</th>
                  <th className="px-4 py-3.5">Status Akun</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map((p) => {
                  const userAcc = usersList.find(u => u.employeeId === p.id || u.username === p.nip);
                  const hasKepstaPrivilege = checkHasKepalaStasiunPrivilege(p.id, activeKepstaRecord, p);
                  
                  // Initial avatar color based on status
                  const initials = p.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-blue-50/50 transition cursor-pointer group"
                      onClick={() => handleOpenDetail(p)}
                    >
                      {/* Name & NIP */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 border ${
                            p.statusPegawai === 'PNS' 
                              ? 'bg-blue-100 border-blue-300 text-blue-900' 
                              : p.statusPegawai === 'PPPK' 
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
                              : 'bg-amber-100 border-amber-300 text-amber-900'
                          }`}>
                            {initials || 'PG'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-700 transition truncate max-w-[200px]">
                              {p.nama}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold text-amber-800">NIP: {p.nip}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Pegawai & Pangkat */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            p.statusPegawai === 'PNS' 
                              ? 'bg-blue-50 text-blue-800 border-blue-200' 
                              : p.statusPegawai === 'PPPK' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {p.statusPegawai || 'PNS'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[150px]">
                          {p.golPangkat || '-'}
                        </div>
                      </td>

                      {/* Jabatan & Unit Kerja */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 truncate max-w-[220px]" title={p.jabatan}>
                          {p.jabatan}
                        </div>
                        <div className="text-[10px] text-blue-900 font-bold flex items-center space-x-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[180px]">{p.unitKerja}</span>
                        </div>
                      </td>

                      {/* Hak Akses Role */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-1 items-start">
                          {hasKepstaPrivilege ? (
                            <span className="inline-flex items-center space-x-1 bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-md text-[10px] shadow-2xs border border-amber-400">
                              <Crown className="w-3 h-3 shrink-0" />
                              <span>Akses Kepala Stasiun</span>
                            </span>
                          ) : userAcc?.role === 'ADMIN_SDM' || userAcc?.role === 'SUPER_ADMIN' ? (
                            <span className="inline-flex items-center space-x-1 bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-md text-[10px] shadow-2xs">
                              <Shield className="w-3 h-3 shrink-0" />
                              <span>Admin SDM</span>
                            </span>
                          ) : userAcc?.role === 'KEPALA_STASIUN' ? (
                            <span className="inline-flex items-center space-x-1 bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                              <Crown className="w-3 h-3 shrink-0" />
                              <span>Kepala Stasiun</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 font-bold border border-slate-200 px-2 py-0.5 rounded-md text-[10px]">
                              <span>Pegawai</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Akun */}
                      <td className="px-4 py-3">
                        {p.aktif ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Non-Aktif</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Detail Button */}
                          <button
                            onClick={() => handleOpenDetail(p)}
                            title="Lihat Detail Lengkap Pegawai"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center space-x-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Detail</span>
                          </button>

                          {/* Admin Edit/Reset/Delete Actions */}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleResetPasswordClick(p)}
                                title="Reset Password Akun"
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 p-1.5 rounded-lg transition"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Data Pegawai"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 p-1.5 rounded-lg transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(p)}
                                title="Hapus Pegawai"
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 p-1.5 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Clean Responsive Pagination Controls Bar */}
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

      {/* DETAIL PEGAWAI MODAL / DRAWER */}
      {selectedDetailPegawai && (() => {
        const p = selectedDetailPegawai;
        const userAcc = usersList.find(u => u.employeeId === p.id || u.username === p.nip);
        const hasKepstaPrivilege = checkHasKepalaStasiunPrivilege(p.id, activeKepstaRecord, p);

        // Training Submissions for this employee
        const empSubmissions = submissions.filter(s => 
          s.employeeId === p.id || s.employeeNip === p.nip || s.employeeNama === p.nama
        );

        // Certificates for this employee
        const empCertificates = certificates.filter(c => 
          c.employeeId === p.id || c.employeeNip === p.nip || c.employeeNama === p.nama
        );

        const approvedSubmissions = empSubmissions.filter(s => s.status === 'APPROVED');
        const verifiedCertificates = empCertificates.filter(c => c.status === 'DISETUJUI');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-start justify-between shrink-0">
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg text-slate-950 shadow-md border ${
                    p.statusPegawai === 'PNS' 
                      ? 'bg-amber-400 border-amber-300' 
                      : p.statusPegawai === 'PPPK' 
                      ? 'bg-emerald-400 border-emerald-300' 
                      : 'bg-blue-400 border-blue-300'
                  }`}>
                    {p.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-white">{p.nama}</h3>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                        {p.statusPegawai || 'PNS'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200 mt-0.5 font-mono">NIP: {p.nip}</p>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">{p.jabatan} &bull; <span className="text-amber-300">{p.unitKerja}</span></p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedDetailPegawai(null)}
                  className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex items-center space-x-2 text-xs font-bold shrink-0 overflow-x-auto">
                <button
                  onClick={() => setDetailActiveTab('profile')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                    detailActiveTab === 'profile'
                      ? 'border-blue-600 text-blue-700 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Profil & Kepegawaian</span>
                </button>

                <button
                  onClick={() => setDetailActiveTab('submissions')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                    detailActiveTab === 'submissions'
                      ? 'border-blue-600 text-blue-700 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Riwayat Pelatihan ({empSubmissions.length})</span>
                </button>

                <button
                  onClick={() => setDetailActiveTab('certificates')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                    detailActiveTab === 'certificates'
                      ? 'border-blue-600 text-blue-700 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Sertifikat Pelatihan ({empCertificates.length})</span>
                </button>

                <button
                  onClick={() => setDetailActiveTab('stats')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                    detailActiveTab === 'stats'
                      ? 'border-blue-600 text-blue-700 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Statistik & Ringkasan</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 overflow-y-auto space-y-4 grow text-xs">
                {/* TAB 1: Profile & Kepegawaian */}
                {detailActiveTab === 'profile' && (
                  <div className="space-y-4">
                    {/* Delegation Privilege Banner */}
                    {hasKepstaPrivilege && (
                      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-600/10 border border-amber-400 rounded-xl p-3.5 flex items-center space-x-3 text-amber-950 shadow-2xs">
                        <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-extrabold text-xs text-amber-900">Hak Akses Khusus: Kepala Stasiun Delegasi Aktif</p>
                          <p className="text-[11px] text-amber-800">Pegawai ini telah diberikan kewenangan serta hak akses Kepala Stasiun TVRI Sumatera Selatan untuk memberikan verifikasi dan persetujuan pengajuan pelatihan.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">NIP (Nomor Induk Pegawai)</span>
                        <p className="font-mono font-extrabold text-sm text-slate-900">{p.nip}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Tanggal Lahir</span>
                        <p className="font-bold text-slate-900">{p.tanggalLahir ? new Date(p.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Email Kedinasan / Kontak</span>
                        <p className="font-semibold text-blue-900">{p.email || '-'}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Status Kepegawaian</span>
                        <p className="font-bold text-slate-900">{p.statusPegawai || 'PNS'}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Pangkat / Golongan</span>
                        <p className="font-bold text-slate-900">{p.golPangkat || '-'}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Unit Kerja / UNOR</span>
                        <p className="font-extrabold text-blue-900">{p.unitKerja}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Role Pengguna Sistem</span>
                        <p className="font-extrabold text-slate-900">{userAcc?.role || 'PEGAWAI'}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Status Akun Database</span>
                        <p className={`font-extrabold ${p.aktif ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {p.aktif ? 'AKTIF (Dapat Login)' : 'NON-AKTIF'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Riwayat Pengajuan Pelatihan */}
                {detailActiveTab === 'submissions' && (
                  <div className="space-y-3">
                    {empSubmissions.length === 0 ? (
                      <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-700">Belum ada riwayat pengajuan pelatihan</p>
                        <p className="text-[11px] text-slate-500">Pegawai ini belum mendaftarkan atau mengajukan permohonan pelatihan kedinasan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {empSubmissions.map(sub => (
                          <div key={sub.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-extrabold text-blue-800">{sub.nomor}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                sub.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {sub.status === 'APPROVED' ? 'DISETUJUI KEPSTA' : sub.status === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU APPROVAL'}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs">{sub.judulPelatihan}</h4>
                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                              <span>Penyelenggara: <strong className="text-slate-800">{sub.penyelenggara}</strong></span>
                              <span>&bull; Tanggal: <strong className="text-slate-800">{sub.tanggalMulai} s/d {sub.tanggalSelesai}</strong></span>
                              <span>&bull; Lokasi: <strong className="text-slate-800">{sub.lokasi}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Sertifikat Pelatihan */}
                {detailActiveTab === 'certificates' && (
                  <div className="space-y-3">
                    {empCertificates.length === 0 ? (
                      <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <Award className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-700">Belum ada sertifikat pelatihan</p>
                        <p className="text-[11px] text-slate-500">Pegawai ini belum mengunggah berkas sertifikat kelulusan pelatihan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {empCertificates.map(cert => (
                          <div key={cert.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-extrabold text-amber-800">{cert.nomorSertifikat || cert.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                cert.status === 'DISETUJUI' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                cert.status === 'DITOLAK' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {cert.status === 'DISETUJUI' ? 'DIVERIFIKASI SDM' : cert.status}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs">{cert.judulPelatihan}</h4>
                            <div className="text-[10px] text-slate-600">
                              Penyelenggara: <strong className="text-slate-800">{cert.penyelenggara}</strong> &bull; Waktu: <strong className="text-slate-800">{cert.tanggalPelatihan}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Statistik & Portofolio */}
                {detailActiveTab === 'stats' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center">
                        <p className="text-[10px] font-extrabold text-blue-700 uppercase">Total Pengajuan</p>
                        <p className="text-2xl font-black text-blue-950 mt-1">{empSubmissions.length}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                        <p className="text-[10px] font-extrabold text-emerald-700 uppercase">Disetujui Kepsta</p>
                        <p className="text-2xl font-black text-emerald-950 mt-1">{approvedSubmissions.length}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
                        <p className="text-[10px] font-extrabold text-amber-700 uppercase">Sertifikat Diunggah</p>
                        <p className="text-2xl font-black text-amber-950 mt-1">{empCertificates.length}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-center">
                        <p className="text-[10px] font-extrabold text-indigo-700 uppercase">Sertifikat Diverifikasi</p>
                        <p className="text-2xl font-black text-indigo-950 mt-1">{verifiedCertificates.length}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Portofolio Kompetensi Pegawai</span>
                      </h4>
                      <p className="text-slate-600 text-[11px]">
                        Pegawai telah menyelesaikan <strong className="text-slate-900">{approvedSubmissions.length} kegiatan pengembangan kompetensi</strong> resmi dengan status terverifikasi di SIAP TVRI Stasiun Sumatera Selatan.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls — hanya tampil untuk Admin (aksi Edit/Reset Password).
                  Tombol "Tutup Modal" dihapus karena sudah ada tombol X di pojok kanan atas panel. */}
              {isAdmin && (
                <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      const targetP = p;
                      setSelectedDetailPegawai(null);
                      handleOpenEdit(targetP);
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Data</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetPasswordClick(p);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Reset Pass</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal Add/Edit Pegawai */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingPegawai ? 'Edit Data Pegawai' : 'Tambah Pegawai TVRI Sumsel'}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPegawai(null);
                }} 
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">NIP (Nomor Induk Pegawai) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 198811202010121003"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dra. Hj. Nurhayati, M.Si"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Password default: format DDMMYYYY</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Kedinasan / Aktif</label>
                  <input
                    type="email"
                    placeholder="pegawai@tvri.go.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status Kepegawaian *</label>
                  <select
                    value={formData.statusPegawai}
                    onChange={(e) => setFormData({ ...formData, statusPegawai: e.target.value as 'PNS' | 'PPPK' | 'KONTRAK' })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="KONTRAK">Tenaga Kontrak / PPNPN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    placeholder="Contoh: III d / Penata Tingkat I atau IX"
                    value={formData.golPangkat}
                    onChange={(e) => setFormData({ ...formData, golPangkat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Jabatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teknisi Siaran Ahli Muda / Reporter"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Unit Kerja *</label>
                <select
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  {UNIT_KERJA_LIST.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="aktif-checkbox"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="aktif-checkbox" className="text-slate-700 font-bold">Status Pegawai Aktif</label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPegawai(null);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded-xl shadow-md"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
