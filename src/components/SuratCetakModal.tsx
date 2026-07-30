import React from 'react';
import { Printer, X, ShieldCheck, Download } from 'lucide-react';
import { PengajuanPelatihan } from '../types';

interface SuratCetakModalProps {
  submission: PengajuanPelatihan;
  onClose: () => void;
}

export const SuratCetakModal: React.FC<SuratCetakModalProps> = ({ submission, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-4 md:p-6 shadow-2xl space-y-4 my-8 text-slate-800">
        {/* Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span className="font-extrabold text-slate-900 text-sm">
              Cetak Surat Rekomendasi & Tugas Pelatihan TVRI Sumsel
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Cetak / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition"
            >
              Batal / Tutup
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 text-xl font-bold ml-1"
              title="Tutup Modal"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (Styled as official white letterhead) */}
        <div id="printable-surat-canvas" className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl border border-slate-200 shadow-inner text-xs leading-relaxed space-y-6 font-serif">
          {/* Kop Surat Official */}
          <div className="text-center border-b-4 border-double border-slate-900 pb-4 space-y-1">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-900 text-amber-300 font-sans font-black flex items-center justify-center text-xl rounded shadow-sm">
                TVRI
              </div>
              <div className="text-center">
                <h2 className="font-sans font-extrabold text-base tracking-widest text-blue-950 uppercase">
                  LEMBAGA PENYIARAN PUBLIK TELEVISI REPUBLIK INDONESIA
                </h2>
                <h1 className="font-sans font-black text-lg text-slate-900 tracking-wider uppercase">
                  STASIUN SUMATERA SELATAN
                </h1>
                <p className="font-sans text-[10px] text-slate-600 font-medium">
                  Jl. Kapten A. Rivai No.22, 24 Ilir, Bukit Kecil, Kota Palembang, Sumatera Selatan 30135
                </p>
                <p className="font-sans text-[10px] text-slate-600 font-medium">
                  Telepon: (0711) 350022 • Email: sumsel@tvri.go.id • Website: www.tvri.go.id
                </p>
              </div>
            </div>
          </div>

          {/* Letter Title */}
          <div className="text-center space-y-1">
            <h3 className="font-black text-sm underline uppercase tracking-wide">
              SURAT REKOMENDASI DAN TUGAS PELATIHAN
            </h3>
            <p className="font-mono text-xs font-bold text-slate-800">
              Nomor: {submission.nomor}/TVRI-SUMSEL/SDM/2026
            </p>
          </div>

          {/* Body Intro */}
          <p className="text-justify leading-relaxed">
            Kepala Stasiun LPP TVRI Stasiun Sumatera Selatan dengan ini memberikan rekomendasi serta penugasan resmi kepada pegawai di bawah ini:
          </p>

          {/* Employee Details Table */}
          <table className="w-full text-xs my-3 border-collapse">
            <tbody>
              <tr>
                <td className="w-36 font-bold py-1">Nama Lengkap</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1 font-extrabold text-slate-950">{submission.employeeNama}</td>
              </tr>
              <tr>
                <td className="font-bold py-1">NIP</td>
                <td className="py-1">:</td>
                <td className="py-1 font-mono font-bold text-slate-900">{submission.employeeNip}</td>
              </tr>
              <tr>
                <td className="font-bold py-1">Pangkat / Golongan</td>
                <td className="py-1">:</td>
                <td className="py-1 font-mono">{submission.employeeGolPangkat || '-'} ({submission.employeeStatusPegawai || 'PNS'})</td>
              </tr>
              <tr>
                <td className="font-bold py-1">Jabatan</td>
                <td className="py-1">:</td>
                <td className="py-1 font-medium">{submission.employeeJabatan}</td>
              </tr>
              <tr>
                <td className="font-bold py-1">Unit Kerja / Seksi</td>
                <td className="py-1">:</td>
                <td className="py-1 font-medium">{submission.employeeUnitKerja}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-justify leading-relaxed">
            Untuk mengikuti dan menyelesaikan kegiatan pengembangan kompetensi kedinasan dengan rincian program sebagai berikut:
          </p>

          {/* Training Details Table */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-700">Judul Pelatihan</span>
              <span className="col-span-2 font-bold text-slate-900">{submission.judulPelatihan}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-700">Rumpun Pelatihan</span>
              <span className="col-span-2 text-slate-800 font-medium">{submission.jenisPelatihan}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-700">Lembaga Penyelenggara</span>
              <span className="col-span-2 text-slate-800 font-medium">{submission.penyelenggara}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-700">Tanggal Pelaksanaan</span>
              <span className="col-span-2 font-bold text-slate-900">
                {new Date(submission.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d {new Date(submission.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-700">Lokasi / Tempat</span>
              <span className="col-span-2 text-slate-800 font-medium">{submission.lokasi}</span>
            </div>
          </div>

          <p className="text-justify leading-relaxed">
            Demikian surat rekomendasi dan tugas ini diterbitkan melalui Sistem Informasi & Administrasi Pelatihan (WEB SIAP SUMSEL) untuk dilaksanakan dengan penuh rasa tanggung jawab, serta melaporkan hasil pelaksanaan kegiatan kepada Kepala Stasiun setelah tugas selesai.
          </p>

          {/* Signature Block */}
          <div className="pt-8 flex justify-end">
            <div className="text-center w-64 space-y-1">
              <p className="font-medium">Palembang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-slate-900">Kepala Stasiun TVRI Sumatera Selatan,</p>

              {/* Verified Digital Stamp Badge */}
              <div className="py-4 flex flex-col items-center justify-center">
                <div className="border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[10px] text-emerald-900 font-sans font-black flex items-center space-x-1 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>TERVERIFIKASI DIGITAL SIAP SUMSEL</span>
                </div>
              </div>

              <p className="font-black underline text-slate-900">EFLIANTY ANALISA</p>
              <p className="font-mono text-[10px] text-slate-600 font-bold">NIP. 197003061998032006</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
