import React, { useState } from 'react';
import { History, Search, CheckCircle2, XCircle, Filter, Globe, Laptop, ShieldCheck } from 'lucide-react';
import { AuditLogItem, UserAccount, Pegawai } from '../types';
import { Pagination } from './Pagination';

interface AuditLogViewProps {
  logs: AuditLogItem[];
  currentUser?: UserAccount | null;
  currentPegawai?: Pegawai | null;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.browser && log.browser.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModule(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <History className="w-5 h-5 text-amber-500" />
            <span>Audit Log Aktivitas & Keamanan System (SIAP Sumsel)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat catatan jejak rekam terpusat: autentikasi, IP address, browser, aktivitas login gagal, manajemen password, dan mutasi data pegawai.
          </p>
        </div>

        <div className="text-xs text-slate-600 font-medium bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 flex items-center space-x-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Total Log Tercatat: <strong className="text-blue-700 font-black">{filteredLogs.length}</strong> entri</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengguna, IP, browser, aksi, deskripsi..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedModule}
            onChange={handleModuleChange}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none transition"
          >
            <option value="ALL">Semua Modul</option>
            <option value="AUTH">Authentication & Akses</option>
            <option value="MANAJEMEN_PASSWORD">Manajemen Password</option>
            <option value="PENGAJUAN">Modul Pengajuan</option>
            <option value="APPROVAL">Modul Approval</option>
            <option value="PEGAWAI">Data Pegawai</option>
            <option value="SYSTEM">System Settings</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Waktu & Tanggal</th>
                <th className="px-4 py-3">Pengguna / Aktor</th>
                <th className="px-4 py-3">Browser & Perangkat</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Aktivitas / Deskripsi</th>
                <th className="px-4 py-3 text-right">Status Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                    Belum ada catatan riwayat login yang tercatat.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-amber-700 font-bold whitespace-nowrap">
                      {log.datetime}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-medium">ID / NIP: {log.userId}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-800">
                        <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.browser || 'Google Chrome Standard'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{log.ipAddress || '192.168.10.42 (Internal)'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs font-medium">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                          {log.module}
                        </span>
                        <span className="font-bold text-slate-800 text-[11px]">{log.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{log.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-extrabold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>BERHASIL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-extrabold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>GAGAL</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Global Responsive Pagination */}
        <Pagination
          currentPage={validCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          entityName="Audit Log"
        />
      </div>
    </div>
  );
};
