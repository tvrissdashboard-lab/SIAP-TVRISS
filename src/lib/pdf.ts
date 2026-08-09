import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pegawai, SertifikatPelatihan } from '../types';

const NAVY: [number, number, number] = [15, 23, 42];
const SLATE: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [148, 163, 184];
const AMBER: [number, number, number] = [217, 119, 6];

let cachedLogo: string | null | undefined;

/**
 * Loads the real TVRI Sumsel logo (public/logo-tvri-sumsel.png) as a data URL
 * so it can be embedded in generated PDFs. Cached after first successful load.
 */
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}logo-tvri-sumsel.png`);
    if (!res.ok) throw new Error('logo not found');
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

function drawLetterhead(doc: jsPDF, logoDataUrl: string | null): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 15;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', marginX, y - 2, 16, 16);
    } catch {
      // ignore malformed image, letterhead still renders without it
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text('LEMBAGA PENYIARAN PUBLIK TELEVISI REPUBLIK INDONESIA', pageWidth / 2, y + 2, { align: 'center' });

  doc.setFontSize(13);
  doc.text('STASIUN SUMATERA SELATAN', pageWidth / 2, y + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text('Jl. Kapten A. Rivai No.22, 24 Ilir, Bukit Kecil, Kota Palembang, Sumatera Selatan 30135', pageWidth / 2, y + 13, { align: 'center' });
  doc.text('Telepon: (0711) 350022  |  Email: sumsel@tvri.go.id  |  Website: www.tvri.go.id', pageWidth / 2, y + 17, { align: 'center' });

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.7);
  doc.line(marginX, y + 21, pageWidth - marginX, y + 21);
  doc.setLineWidth(0.2);
  doc.line(marginX, y + 22, pageWidth - marginX, y + 22);

  return y + 28;
}

/** Footer di SEMUA halaman: nomor halaman + label, kecil & rapi (bukan header/footer bawaan browser). */
function drawFooter(doc: jsPDF, label: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, 14, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}

function formatTanggal(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface PortfolioTrainingRow {
  judulPelatihan: string;
  penyelenggara: string;
  tanggalPelatihan: string;
  jumlahJp?: number;
  nomorSertifikat?: string;
  status: string;
}

/**
 * Menghasilkan PDF biner asli (bukan file .txt berkedok .pdf) untuk Portofolio
 * Rekapitulasi Pelatihan seorang pegawai, lalu langsung mengunduhnya.
 */
export async function generatePortfolioPDF(pegawai: Pegawai, trainingList: PortfolioTrainingRow[]): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogoDataUrl();
  let y = drawLetterhead(doc, logo);
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('PORTOFOLIO REKAPITULASI PELATIHAN & SERTIFIKASI PEGAWAI', pageWidth / 2, y, { align: 'center' });
  y += 8;

  const totalPelatihan = trainingList.length;
  const totalDisetujui = trainingList.filter(t => t.status === 'DISETUJUI').length;
  const totalJp = trainingList.reduce((sum, t) => sum + (t.jumlahJp || 0), 0);

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: NAVY, cellPadding: 1 },
    margin: { left: marginX, right: marginX },
    body: [
      ['Nama Pegawai', ':', pegawai.nama],
      ['NIP', ':', pegawai.nip],
      ['Jabatan', ':', pegawai.jabatan],
      ['Unit Kerja', ':', pegawai.unitKerja],
      ['Status Kepegawaian', ':', pegawai.statusPegawai || '-'],
      ['Email Terdaftar', ':', pegawai.email || '-']
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 1: { cellWidth: 4 } }
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, halign: 'center', cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    margin: { left: marginX, right: marginX },
    head: [['Total Pelatihan Diikuti', 'Total Sertifikat Disetujui', 'Total Jam Pelatihan (JP)']],
    body: [[`${totalPelatihan} Program`, `${totalDisetujui} Sertifikat`, `${totalJp} JP`]]
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text('RIWAYAT PELATIHAN DAN SERTIFIKAT', marginX, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' }
    },
    head: [['No', 'Judul Pelatihan / Penyelenggara', 'Tanggal', 'JP', 'Status']],
    body: trainingList.length
      ? trainingList.map((t, idx) => [
          String(idx + 1),
          `${t.judulPelatihan}\n${t.penyelenggara}`,
          t.tanggalPelatihan,
          t.jumlahJp ? String(t.jumlahJp) : '-',
          t.status === 'DISETUJUI' ? 'Disetujui' : t.status.replace(/_/g, ' ')
        ])
      : [['-', 'Belum ada riwayat pelatihan yang terdaftar.', '-', '-', '-']]
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  const disclaimer = doc.splitTextToSize(
    'Dokumen Portofolio Pelatihan ini diterbitkan secara sah melalui Sistem Informasi & Administrasi Pelatihan (SIAP) LPP TVRI Stasiun Sumatera Selatan dan dapat dipergunakan sebagai lampiran pendukung Sasaran Kinerja Pegawai (SKP), kenaikan pangkat, atau administrasi SDM lainnya.',
    pageWidth - marginX * 2
  );
  doc.text(disclaimer, marginX, y);

  drawFooter(doc, `Dicetak melalui SIAP TVRI Sumsel pada ${formatTanggal(new Date())}`);

  doc.save(`Portofolio_Pelatihan_${pegawai.nama.replace(/\s+/g, '_')}_${pegawai.nip}.pdf`);
}

/**
 * Menghasilkan PDF ringkasan resmi untuk satu sertifikat/riwayat pelatihan —
 * dipakai sebagai fallback saat pegawai belum mengunggah berkas sertifikat asli
 * (bila sudah ada file asli, unduh file aslinya langsung, jangan pakai ini).
 */
export async function generateCertificateSummaryPDF(cert: SertifikatPelatihan): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogoDataUrl();
  let y = drawLetterhead(doc, logo);
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('RINGKASAN SERTIFIKAT PELATIHAN', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...AMBER);
  doc.text(cert.nomorSertifikat || 'SERT/2026/TVRI/OFFICIAL', pageWidth / 2, y + 4, { align: 'center' });
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: NAVY, cellPadding: 1.4 },
    margin: { left: marginX, right: marginX },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 46 }, 1: { cellWidth: 4 } },
    body: [
      ['Nama Pegawai', ':', cert.employeeNama || '-'],
      ['NIP', ':', cert.employeeNip || '-'],
      ['Unit Kerja', ':', cert.employeeUnitKerja || '-'],
      ['Jabatan', ':', cert.employeeJabatan || '-'],
      ['Judul Pelatihan', ':', cert.judulPelatihan],
      ['Jenis Rumpun', ':', cert.jenisPelatihan],
      ['Penyelenggara', ':', cert.penyelenggara],
      ['Tanggal Pelaksanaan', ':', cert.tanggalPelatihan],
      ['Jumlah Jam Pelatihan', ':', cert.jumlahJp ? `${cert.jumlahJp} JP` : '-'],
      ['Status Verifikasi', ':', cert.status.replace(/_/g, ' ')]
    ]
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  const disclaimer = doc.splitTextToSize(
    'Dokumen ini merupakan ringkasan arsip sertifikat digital pada portal Sistem Informasi & Administrasi Pelatihan (SIAP) LPP TVRI Stasiun Sumatera Selatan. Untuk berkas sertifikat asli, silakan hubungi Admin SDM apabila belum diunggah ke sistem.',
    pageWidth - marginX * 2
  );
  doc.text(disclaimer, marginX, y);

  drawFooter(doc, `Dicetak melalui SIAP TVRI Sumsel pada ${formatTanggal(new Date())}`);

  doc.save(`Sertifikat_${cert.judulPelatihan.replace(/\s+/g, '_')}.pdf`);
}
