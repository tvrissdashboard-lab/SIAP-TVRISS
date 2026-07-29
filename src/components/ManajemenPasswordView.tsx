import React, { useState, useMemo } from 'react';
import { Key, Search, ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, User, X } from 'lucide-react';
import { Pegawai, UserAccount, Role } from '../types';
import { Storage } from '../lib/storage';
import { Pagination } from './Pagination';

interface ManajemenPasswordViewProps {
  pegawaiList: Pegawai[];
  usersList: UserAccount[];
  currentUser?: UserAccount | null;
  currentPegawai?: Pegawai | null;
  onRefreshData?: () => void;
  onShowSuccess?: (data: { title: string; message?: string; badge?: string; type?: 'success' | 'approval' | 'info' }) => void;
}

export const ManajemenPasswordView: React.FC<ManajemenPasswordViewProps> = ({
  pegawaiList,
  usersList,
  currentUser,
  currentPegawai,
  onRefreshData,
  onShowSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State for Change Password
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map users by employeeId or NIP for status lookup
  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    usersList.forEach(u => {
      if (u.employeeId) map.set(u.employeeId, u);
      if (u.username) map.set(u.username, u);
    });
    return map;
  }, [usersList]);

  // Filtered pegawai list
  const filteredPegawaiList = useMemo(() => {
    return pegawaiList.filter(p => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        p.nama.toLowerCase().includes(query) ||
        p.nip.toLowerCase().includes(query) ||
        p.jabatan.toLowerCase().includes(query) ||
        p.unitKerja.toLowerCase().includes(query)
      );
    });
  }, [pegawaiList, searchQuery]);

  // Pagination calculation
  const totalItems = filteredPegawaiList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedPegawaiList = useMemo(() => {
    return filteredPegawaiList.slice(startIndex, startIndex + pageSize);
  }, [filteredPegawaiList, startIndex, pageSize]);

  const handleOpenModal = (p: Pegawai) => {
    setSelectedPegawai(p);
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setShowNewPass(false);
    setShowConfirmPass(false);
  };

  const handleCloseModal = () => {
    setSelectedPegawai(null);
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPegawai) return;

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setErrorMsg('Password tidak boleh kosong.');
      return;
    }

    if (cleanNew.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMsg('Password baru dan konfirmasi password harus sama.');
      return;
    }

    setIsSubmitting(true);

    const adminName = currentPegawai?.nama || currentUser?.username || 'Admin SDM';
    const result = Storage.adminSetPegawaiPassword(selectedPegawai.id, cleanNew, adminName);

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    handleCloseModal();
    if (onRefreshData) onRefreshData();

    if (onShowSuccess) {
      onShowSuccess({
        title: 'Password Berhasil Diperbarui',
        message: `Password akun pegawai ${selectedPegawai.nama} (NIP: ${selectedPegawai.nip}) telah berhasil diperbarui oleh Admin SDM.`,
        badge: 'MANAJEMEN PASSWORD',
        type: 'success'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <span>Manajemen Password Pegawai</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan terpusat password akun pegawai LPP TVRI Stasiun Sumatera Selatan oleh Admin SDM.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl text-xs text-blue-900 flex items-center space-x-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold">Akses Khusus Admin SDM</span>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama Pegawai, NIP, Jabatan, Unit Kerja..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Pegawai: <strong className="text-slate-900 font-bold">{totalItems}</strong> Akun
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Jabatan & Unit Kerja</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4 text-center">Password</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {paginatedPegawaiList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Tidak ada data pegawai yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedPegawaiList.map((p) => {
                  const matchedUser = userMap.get(p.id) || userMap.get(p.nip);
                  const isAccountActive = matchedUser ? matchedUser.isActive : p.aktif !== false;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition">
                      {/* Nama */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                            {p.nama.charAt(0)}
                          </div>
                          <span>{p.nama}</span>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {p.nip}
                      </td>

                      {/* Jabatan & Unit */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-bold">{p.jabatan}</div>
                        <div className="text-[11px] text-blue-700 font-semibold">{p.unitKerja}</div>
                      </td>

                      {/* Status Akun */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isAccountActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isAccountActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Password Hidden Representation */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 tracking-widest">
                        ********
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition shadow-xs inline-flex items-center space-x-1.5"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-950" />
                          <span>Ganti Password</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Modal Dialog Ganti Password */}
      {selectedPegawai && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 text-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-xs">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Ganti Password Akun</h3>
                  <p className="text-xs text-slate-500">Oleh Admin SDM SIAP TVRI Sumsel</p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Pegawai Info Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Akun Pegawai</div>
              <p className="font-extrabold text-slate-900 text-sm">{selectedPegawai.nama}</p>
              <p className="text-xs text-slate-600 font-mono font-semibold">NIP: {selectedPegawai.nip}</p>
              <p className="text-[11px] text-blue-800 font-medium">{selectedPegawai.jabatan} • {selectedPegawai.unitKerja}</p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl text-xs font-bold flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitPassword} className="space-y-4 text-xs">
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
              </div>

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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-sm transition uppercase text-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
