import React, { useMemo, useState } from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { Pegawai, PengajuanPelatihan } from '../types';

interface RekapPengajuanModalProps {
  pegawaiList: Pegawai[];
  submissions: PengajuanPelatihan[];
  onClose: () => void;
}

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_LABEL: Record<string, string> = {
  ALL: 'PEGAWAI',
  PNS: 'PEGAWAI PNS',
  PPPK: 'PEGAWAI PPPK',
  KONTRAK: 'PEGAWAI KONTRAK'
};

function formatTanggalDiklat(mulai: string, selesai: string): string {
  if (!mulai) return '';
  const d1 = new Date(mulai);
  const d2 = selesai ? new Date(selesai) : d1;

  const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const tgl1 = d1.getDate();
  const tgl2 = d2.getDate();
  const bulan1 = BULAN_ID[d1.getMonth()];
  const bulan2 = BULAN_ID[d2.getMonth()];
  const tahun2 = d2.getFullYear();

  if (mulai === selesai || tgl1 === tgl2 && sameMonth) {
    return `${tgl1} ${bulan1} ${tahun2}`;
  }
  if (sameMonth) {
    return `${tgl1} - ${tgl2} ${bulan2} ${tahun2}`;
  }
  return `${tgl1} ${bulan1} - ${tgl2} ${bulan2} ${tahun2}`;
}

export const RekapPengajuanModal: React.FC<RekapPengajuanModalProps> = ({
  pegawaiList,
  submissions,
  onClose
}) => {
  const today = new Date();
  const [bulan, setBulan] = useState<number>(today.getMonth());
  const [tahun, setTahun] = useState<number>(today.getFullYear());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PNS' | 'PPPK' | 'KONTRAK'>('ALL');
  const [sertakanKosong, setSertakanKosong] = useState<boolean>(true);

  const handlePrint = () => window.print();

  const rekapData = useMemo(() => {
    const activeEmployees = pegawaiList
      .filter(p => p.aktif !== false)
      .filter(p => statusFilter === 'ALL' || p.statusPegawai === statusFilter)
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    const rows = activeEmployees.map(p => {
      const diklatBulanIni = submissions
        .filter(s => s.employeeId === p.id)
        .filter(s => {
          if (!s.tanggalMulai) return false;
          const d = new Date(s.tanggalMulai);
          return d.getMonth() === bulan && d.getFullYear() === tahun;
        })
        .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));

      return {
        pegawai: p,
        diklat1: diklatBulanIni[0] || null,
        diklat2: diklatBulanIni[1] || null
      };
    });

    return sertakanKosong ? rows : rows.filter(r => r.diklat1 || r.diklat2);
  }, [pegawaiList, submissions, bulan, tahun, statusFilter, sertakanKosong]);

  const totalPengajuanBulanIni = rekapData.filter(r => r.diklat1 || r.diklat2).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full p-4 md:p-6 shadow-2xl space-y-4 my-8 text-slate-800">

        {/* Controls Bar (Hidden during print) */}
        <div className="print:hidden space-y-3 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <span className="font-extrabold text-slate-900 text-sm">
                Rekap Pengajuan Pelatihan Mandiri Pegawai
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 text-xl font-bold leading-none"
              title="Tutup"
            >
              &times;
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bulan</label>
              <select
                value={bulan}
                onChange={e => setBulan(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                {BULAN_ID.map((nama, idx) => (
                  <option key={nama} value={idx}>{nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tahun</label>
              <input
                type="number"
                value={tahun}
                onChange={e => setTahun(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold w-24"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Pegawai</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="ALL">Semua Status</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="KONTRAK">Kontrak</option>
              </select>
            </div>

            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 pb-1.5">
              <input
                type="checkbox"
                checked={sertakanKosong}
                onChange={e => setSertakanKosong(e.target.checked)}
                className="rounded"
              />
              <span>Tampilkan pegawai tanpa pengajuan</span>
            </label>

            <div className="ml-auto flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                {totalPengajuanBulanIni} pegawai punya pengajuan bulan ini
              </span>
              <button
                onClick={handlePrint}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Cetak / Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Canvas */}
        <div id="printable-rekap-canvas" className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-inner">
          <div className="text-center mb-4">
            <h2 className="font-black text-sm uppercase tracking-wide">
              Data Pengajuan Pelatihan Mandiri {STATUS_LABEL[statusFilter]}
            </h2>
            <h3 className="font-black text-sm uppercase tracking-wide">
              Bulan {BULAN_ID[bulan]} {tahun}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              LPP TVRI Stasiun Sumatera Selatan — Sistem Informasi & Administrasi Pelatihan (SIAP)
            </p>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-slate-900 px-2 py-1.5 w-10">NO</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-1.5">NAMA</th>
                <th colSpan={2} className="border border-slate-900 px-2 py-1.5">DIKLAT 1</th>
                <th colSpan={2} className="border border-slate-900 px-2 py-1.5">DIKLAT 2</th>
              </tr>
              <tr>
                <th className="border border-slate-900 px-2 py-1.5 font-semibold">JUDUL DIKLAT</th>
                <th className="border border-slate-900 px-2 py-1.5 font-semibold w-32">TANGGAL DIKLAT</th>
                <th className="border border-slate-900 px-2 py-1.5 font-semibold">JUDUL DIKLAT</th>
                <th className="border border-slate-900 px-2 py-1.5 font-semibold w-32">TANGGAL DIKLAT</th>
              </tr>
            </thead>
            <tbody>
              {rekapData.map((row, idx) => (
                <tr key={row.pegawai.id}>
                  <td className="border border-slate-900 px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-slate-900 px-2 py-1">
                    {row.pegawai.nama}
                    {row.pegawai.golPangkat ? <span className="text-slate-500">, {row.pegawai.golPangkat}</span> : null}
                  </td>
                  <td className="border border-slate-900 px-2 py-1">{row.diklat1?.judulPelatihan || ''}</td>
                  <td className="border border-slate-900 px-2 py-1 whitespace-nowrap">
                    {row.diklat1 ? formatTanggalDiklat(row.diklat1.tanggalMulai, row.diklat1.tanggalSelesai) : ''}
                  </td>
                  <td className="border border-slate-900 px-2 py-1">{row.diklat2?.judulPelatihan || ''}</td>
                  <td className="border border-slate-900 px-2 py-1 whitespace-nowrap">
                    {row.diklat2 ? formatTanggalDiklat(row.diklat2.tanggalMulai, row.diklat2.tanggalSelesai) : ''}
                  </td>
                </tr>
              ))}
              {rekapData.length === 0 && (
                <tr>
                  <td colSpan={6} className="border border-slate-900 px-2 py-4 text-center text-slate-400 font-semibold">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="text-[10px] text-slate-400 mt-4">
            Dicetak otomatis melalui Sistem Informasi & Administrasi Pelatihan (SIAP) TVRI Sumatera Selatan pada {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    </div>
  );
};
