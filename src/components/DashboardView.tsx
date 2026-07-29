import React from 'react';
import { 
  Users, FileText, Clock, CheckCircle2, XCircle, AlertCircle, 
  ArrowRight, ShieldCheck, Award, Plus, Sparkles, FileCheck, FileCode, Crown
} from 'lucide-react';
import { PengajuanPelatihan, Pegawai, UserAccount, Role, SertifikatPelatihan, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege } from '../types';

interface DashboardViewProps {
  pegawaiList: Pegawai[];
  submissions: PengajuanPelatihan[];
  certificates?: SertifikatPelatihan[];
  currentUser: UserAccount | null;
  currentPegawai: Pegawai | null;
  activeKepstaRecord?: KepalaStasiunAccessRecord | null;
  onNavigate: (tab: any) => void;
  onOpenSubmissionDetail: (sub: PengajuanPelatihan) => void;
  onNewSubmission?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pegawaiList,
  submissions,
  certificates = [],
  currentUser,
  currentPegawai,
  activeKepstaRecord,
  onNavigate,
  onOpenSubmissionDetail,
  onNewSubmission
}) => {
  const role: Role = currentUser?.role || 'PEGAWAI';
  const isKepsta = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai) || role === 'KEPALA_STASIUN';
  const isAdmin = (role === 'ADMIN_SDM' || role === 'SUPER_ADMIN') && !isKepsta;


  // Stats calculation
  const totalPegawai = pegawaiList.filter(p => p.aktif).length;
  const totalSubmissions = submissions.length;
  const draftSubmissions = submissions.filter(s => s.status === 'DRAFT').length;
  const waitingApprovalSubmissions = submissions.filter(s => s.status === 'WAITING_APPROVAL').length;
  const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED').length;

  // Certificate Stats Calculation
  const totalCerts = certificates.length;
  const approvedCerts = certificates.filter(c => c.status === 'DISETUJUI').length;
  const pendingCerts = certificates.filter(c => c.status === 'SEDANG_DIVERIFIKASI').length;

  // Filter queue for action cards
  const pendingQueue = isKepsta 
    ? submissions.filter(s => s.status === 'WAITING_APPROVAL')
    : submissions.filter(s => s.status === 'DRAFT');

  // Recent 5 submissions across all TVRI Sumsel employees for public internal information
  const recentSubmissions = [...submissions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Disetujui</span>
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Menunggu Kepsta</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Ditolak</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-300">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            <span>Verifikasi SDM</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner (2-Column Desktop Layout) */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 lg:p-7 text-white shadow-xl border border-blue-800/80 relative overflow-hidden">
        {/* Background Decorative Ambient Glows */}
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 transform -translate-x-1/2 w-56 h-56 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center relative z-10">
          {/* Left Column: Badge, Title & Description */}
          <div className="lg:col-span-8 space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400 text-blue-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded shadow-xs tracking-wider">
                SIAP
              </span>
              <span className="text-blue-200 text-xs font-semibold">
                TVRI Stasiun Sumatera Selatan
              </span>
              <span className="hidden sm:inline-block text-amber-300/90 text-xs font-medium italic">
                • Belajar. Berkembang. Berprestasi.
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug break-words">
              Halo, <span className="text-amber-300 font-black">{
                currentUser?.role === 'ADMIN_SDM'
                  ? 'Admin SDM'
                  : (currentPegawai?.nama || (currentUser?.role === 'KEPALA_STASIUN' ? 'Kepala Stasiun' : currentUser?.username || 'Pegawai'))
              }</span> 👋
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl leading-relaxed font-normal">
              Kelola administrasi pelatihan pegawai secara terintegrasi, efisien, transparan, dan akuntabel.
            </p>
          </div>

          {/* Right Column: Prominent Action Buttons */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-end justify-end gap-2.5 shrink-0">
            <button
              onClick={() => {
                if (onNewSubmission) {
                  onNewSubmission();
                } else {
                  onNavigate('pengajuan');
                }
              }}
              className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black px-4.5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all border border-amber-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ring-2 ring-amber-400/30 w-full sm:w-auto"
              title="Klik untuk membuat pengajuan pelatihan baru"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Buat Pengajuan Pelatihan</span>
            </button>

            {(isAdmin || isKepsta) && (
              <button
                onClick={() => onNavigate('approval')}
                className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-800 to-indigo-800 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs border border-blue-400/30 cursor-pointer whitespace-nowrap w-full sm:w-auto"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Pusat Approval ({pendingQueue.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards with Fixed Footer Text Overlap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Pegawai */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pegawai Aktif</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalPegawai}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2 min-w-0">
            <span className="font-medium text-[11px] text-slate-500 truncate flex-1 min-w-0">SDM TVRI Sumsel</span>
            {(isAdmin || isKepsta) ? (
              <button onClick={() => onNavigate('pegawai')} className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-[11px] shrink-0 whitespace-nowrap cursor-pointer">
                Lihat Data &rarr;
              </button>
            ) : (
              <span className="text-slate-400 font-mono text-[10px] shrink-0 whitespace-nowrap">Tampilan Stat</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Pengajuan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pengajuan</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalSubmissions}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2 min-w-0">
            <span className="font-medium text-[11px] text-slate-500 truncate flex-1 min-w-0">Draf/Proses: {draftSubmissions}</span>
            <button onClick={() => onNavigate('pengajuan')} className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold text-[11px] shrink-0 whitespace-nowrap cursor-pointer">
              {(isAdmin || isKepsta) ? 'Semua Submisi \u2192' : 'Pengajuan Saya \u2192'}
            </button>
          </div>
        </div>

        {/* Card 3: Menunggu Approval */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Menunggu Approval</p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{waitingApprovalSubmissions}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2 min-w-0">
            <span className="font-medium text-[11px] text-slate-500 truncate flex-1 min-w-0">Antrean Sistem</span>
            {(isAdmin || isKepsta) ? (
              <button onClick={() => onNavigate('approval')} className="text-amber-600 hover:text-amber-800 hover:underline font-bold text-[11px] shrink-0 whitespace-nowrap cursor-pointer">
                Proses Sekarang &rarr;
              </button>
            ) : (
              <span className="text-slate-400 font-mono text-[10px] shrink-0 whitespace-nowrap">Tampilan Stat</span>
            )}
          </div>
        </div>

        {/* Card 4: Pelatihan Disetujui */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pelatihan Disetujui</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{approvedSubmissions}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2 min-w-0">
            <span className="font-medium text-[11px] text-slate-500 truncate flex-1 min-w-0">Siap Pelaksanaan</span>
            <span className="text-emerald-600 font-bold text-[11px] shrink-0 whitespace-nowrap">Lengkap</span>
          </div>
        </div>
      </div>

      {/* Pegawai-Specific Certificate Overview Widget */}
      {role === 'PEGAWAI' && (
        <div className="bg-gradient-to-r from-blue-900/10 via-amber-500/10 to-emerald-500/10 border border-blue-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-950 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200 tracking-wider">
                Mandiri Pegawai
              </span>
              <h3 className="font-extrabold text-slate-900 text-base mt-1.5">
                Ringkasan Sertifikat Pelatihan Anda
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pantau status verifikasi dan koleksi sertifikat kompetensi pelatihan yang telah Anda unggah.
              </p>
            </div>
            <button
              onClick={() => onNavigate('sertifikat_pelatihan')}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-4.5 py-2.5 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Kelola Sertifikat Pelatihan &rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {(() => {
              const myEmpId = currentPegawai?.id || '';
              const myNip = currentPegawai?.nip || '';
              const myCerts = certificates.filter(c => c.employeeId === myEmpId || c.employeeNip === myNip);
              const mySubmissionsApproved = submissions.filter(s => (s.employeeId === myEmpId || s.employeeNip === myNip) && s.status === 'APPROVED');
              
              const myTotalPelatihan = Math.max(mySubmissionsApproved.length, myCerts.length);
              const myTotalSertifikat = myCerts.filter(c => c.status === 'DISETUJUI').length;
              const myMenungguVerifikasi = myCerts.filter(c => c.status === 'SEDANG_DIVERIFIKASI').length;
              const myPerluRevisi = myCerts.filter(c => c.status === 'PERLU_REVISI' || c.status === 'DITOLAK').length;

              return (
                <>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between h-full">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pelatihan</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{myTotalPelatihan}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between h-full">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Sertifikat</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{myTotalSertifikat}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between h-full">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Menunggu Verifikasi</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{myMenungguVerifikasi}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between h-full">
                    <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Perlu Revisi</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">{myPerluRevisi}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Role-Specific Action Card */}
      {isKepsta && (
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-950 text-sm">
                Antrean Persetujuan Kepala Stasiun ({pendingQueue.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('approval')}
              className="text-xs text-amber-800 hover:underline font-bold flex items-center space-x-1"
            >
              <span>Buka Menu Approval</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingQueue.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2">
              Tidak ada pengajuan pelatihan yang menunggu persetujuan Anda saat ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingQueue.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-amber-800 font-mono font-bold">
                      <span>{item.nomor}</span>
                      <span>{item.jenisPelatihan}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs mt-1 line-clamp-1">
                      {item.judulPelatihan}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Pemohon: <span className="font-bold text-slate-800">{item.employeeNama}</span> ({item.employeeUnitKerja})
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Penyelenggara: {item.penyelenggara}</span>
                    <button
                      onClick={() => onOpenSubmissionDetail(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] shadow-sm"
                    >
                      Tinjau & Disetujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Submissions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Pengajuan Pelatihan Terbaru TVRI Stasiun Sumatera Selatan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar pengajuan pelatihan terbaru dari seluruh pegawai TVRI Stasiun Sumatera Selatan sebagai media informasi internal.
            </p>
          </div>
          <button
            onClick={() => onNavigate('pengajuan')}
            className="text-xs text-blue-600 hover:underline font-bold flex items-center space-x-1 shrink-0 self-start sm:self-auto"
          >
            <span>{(isAdmin || isKepsta) ? 'Lihat Semua' : 'Pengajuan Pelatihan Saya'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Nomor & Tanggal</th>
                <th className="px-4 py-3">Nama Pegawai / Unit Kerja</th>
                <th className="px-4 py-3">Judul Pelatihan</th>
                <th className="px-4 py-3">Penyelenggara</th>
                <th className="px-4 py-3">Status SIAP</th>
                {(isAdmin || isKepsta) && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={(isAdmin || isKepsta) ? 6 : 5} className="px-4 py-6 text-center text-slate-400 italic">
                    Belum ada pengajuan pelatihan tercatat.
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono text-amber-700 font-bold">{sub.nomor}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sub.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{sub.employeeNama}</div>
                      <div className="text-[10px] text-slate-500">{sub.employeeUnitKerja}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{sub.judulPelatihan}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {sub.penyelenggara}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(sub.status)}
                    </td>
                    {(isAdmin || isKepsta) && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenSubmissionDetail(sub)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-1 rounded-lg text-[11px] font-bold transition"
                        >
                          Detail
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
