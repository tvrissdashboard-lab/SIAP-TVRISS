import React, { useState } from 'react';
import { 
  Award, UploadCloud, CheckCircle2, Clock, XCircle, AlertTriangle, 
  FileText, Calendar, Building2, Eye, ShieldCheck, FileCheck, X, File, Sparkles,
  Download, Mail, Send, Printer
} from 'lucide-react';
import { Pegawai, SertifikatPelatihan, CertificateStatus, PengajuanPelatihan } from '../types';
import { Storage, playNotificationSound } from '../lib/storage';
import { generatePortfolioPDF } from '../lib/pdf';
import { sendPortfolioEmail } from '../lib/email';
import { Pagination } from './Pagination';
import { TvriSumselLogo } from './TvriSumselLogo';

interface SertifikatPelatihanViewProps {
  currentPegawai: Pegawai | null;
  certificates: SertifikatPelatihan[];
  submissions: PengajuanPelatihan[];
  onRefreshData: () => void;
  onShowSuccess: (title: string, message?: string) => void;
}

export const SertifikatPelatihanView: React.FC<SertifikatPelatihanViewProps> = ({
  currentPegawai,
  certificates,
  submissions,
  onRefreshData,
  onShowSuccess
}) => {
  const [selectedUploadItem, setSelectedUploadItem] = useState<SertifikatPelatihan | null>(null);
  const [previewCert, setPreviewCert] = useState<SertifikatPelatihan | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Upload Form state
  const [nomorSertifikat, setNomorSertifikat] = useState('');
  const [tanggalSertifikat, setTanggalSertifikat] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentPegawai) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-8">
        <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Sesi Pegawai Tidak Ditemukan</h3>
        <p className="text-xs text-slate-500 mt-1">Silakan masuk menggunakan NIP Pegawai Anda untuk mengunggah dan mengelola sertifikat pelatihan.</p>
      </div>
    );
  }

  // Filter certificates for current pegawai
  const myCertificates = certificates.filter(c => c.employeeId === currentPegawai.id || c.employeeNip === currentPegawai.nip);

  // Extract approved/completed training submissions for this pegawai
  const myApprovedSubmissions = submissions.filter(
    s => (s.employeeId === currentPegawai.id || s.employeeNip === currentPegawai.nip) && s.status === 'APPROVED'
  );

  // Build full merged list of training items for current pegawai
  const combinedTrainingList: SertifikatPelatihan[] = [...myCertificates];

  myApprovedSubmissions.forEach((sub) => {
    const exists = combinedTrainingList.some(c => c.submissionId === sub.id || c.judulPelatihan === sub.judulPelatihan);
    if (!exists) {
      combinedTrainingList.push({
        id: `SERT-${sub.id}`,
        employeeId: currentPegawai.id,
        employeeNama: currentPegawai.nama,
        employeeNip: currentPegawai.nip,
        employeeUnitKerja: currentPegawai.unitKerja,
        employeeJabatan: currentPegawai.jabatan,
        submissionId: sub.id,
        judulPelatihan: sub.judulPelatihan,
        jenisPelatihan: sub.jenisPelatihan,
        penyelenggara: sub.penyelenggara,
        tanggalPelatihan: `${new Date(sub.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(sub.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        jumlahJp: sub.jumlahJp,
        statusPelatihan: 'SELESAI',
        status: 'BELUM_DIUNGGAH'
      });
    }
  });

  // Calculate SECTION 1 Stats
  const totalPelatihan = combinedTrainingList.length;
  const totalSertifikatUploaded = combinedTrainingList.filter(c => c.status === 'DISETUJUI' || c.status === 'SEDANG_DIVERIFIKASI').length;
  const totalSertifikatDisetujui = combinedTrainingList.filter(c => c.status === 'DISETUJUI').length;
  const totalMenungguVerifikasi = combinedTrainingList.filter(c => c.status === 'SEDANG_DIVERIFIKASI').length;
  const totalPerluRevisi = combinedTrainingList.filter(c => c.status === 'PERLU_REVISI' || c.status === 'DITOLAK').length;
  // Total JP sesungguhnya = jumlah "Jumlah JP" yang diisi pegawai saat pengajuan (atau estimasi 8 JP/hari bila belum diisi)
  const totalJamPelatihan = combinedTrainingList.reduce((sum, c) => sum + (c.jumlahJp || 0), 0);

  // Pagination calculation
  const totalItems = combinedTrainingList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedTrainingList = combinedTrainingList.slice(startIndex, startIndex + pageSize);

  const handleOpenFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Allowed formats: PDF, JPG, JPEG, PNG
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExts.includes(fileExt)) {
        setFileError('Format file tidak didukung. Harap pilih file PDF, JPG, JPEG, atau PNG.');
        setSelectedFile(null);
        return;
      }
      // Max size: 5 MB
      if (file.size > 5 * 1024 * 1024) {
        setFileError('Ukuran file melebihi 5 MB. Harap pilih file yang lebih kecil.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleOpenUploadModal = (item: SertifikatPelatihan) => {
    setSelectedUploadItem(item);
    setNomorSertifikat(item.nomorSertifikat || '');
    setTanggalSertifikat(item.tanggalSertifikat || new Date().toISOString().split('T')[0]);
    setSelectedFile(null);
    setFileError('');
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadItem) return;

    if (!selectedFile && !selectedUploadItem.fileNama) {
      setFileError('Harap pilih dokumen sertifikat yang akan diunggah.');
      return;
    }

    setIsSubmitting(true);

    let finalFileUrl = selectedUploadItem.fileUrl;
    let fileExt = selectedUploadItem.fileType || 'pdf';
    let fileSizeMb = selectedUploadItem.fileSizeMb || 1.2;
    let fileNama = selectedUploadItem.fileNama || 'Sertifikat_Pelatihan.pdf';

    if (selectedFile) {
      const uploadResult = await Storage.uploadCertificateFile(selectedFile, currentPegawai.id);
      if (uploadResult.error || !uploadResult.url) {
        setFileError(uploadResult.error || 'Gagal mengunggah file. Silakan coba lagi.');
        setIsSubmitting(false);
        return;
      }
      finalFileUrl = uploadResult.url;
      fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      fileSizeMb = parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2));
      fileNama = selectedFile.name;
    }

    const updatedCert: SertifikatPelatihan = {
      ...selectedUploadItem,
      id: selectedUploadItem.id.startsWith('SERT-SUB') ? `SERT${String(Date.now()).slice(-5)}` : selectedUploadItem.id,
      employeeId: currentPegawai.id,
      employeeNama: currentPegawai.nama,
      employeeNip: currentPegawai.nip,
      employeeUnitKerja: currentPegawai.unitKerja,
      employeeJabatan: currentPegawai.jabatan,
      nomorSertifikat: nomorSertifikat.trim() || `SERT/${new Date().getFullYear()}/TVRI/${Math.floor(1000 + Math.random() * 9000)}`,
      tanggalSertifikat: tanggalSertifikat || new Date().toISOString().split('T')[0],
      fileNama: fileNama,
      fileUrl: finalFileUrl,
      fileType: fileExt,
      fileSizeMb: fileSizeMb,
      status: 'SEDANG_DIVERIFIKASI',
      uploadedAt: new Date().toISOString(),
      catatanRevisi: undefined
    };

    await Storage.saveCertificate(updatedCert);

    await Storage.addAuditLog({
      userId: currentPegawai.nip,
      userName: currentPegawai.nama,
      action: 'UPLOAD_CERTIFICATE',
      module: 'SERTIFIKAT',
      description: `Mengunggah sertifikat pelatihan "${updatedCert.judulPelatihan}" (Nomor: ${updatedCert.nomorSertifikat}).`,
      status: 'SUCCESS'
    });

    setIsSubmitting(false);
    setSelectedUploadItem(null);
    onRefreshData();

    // Play audio notification chime as required
    playNotificationSound();

    // Show toast notification
    onShowSuccess(
      '✓ Sertifikat berhasil diunggah.',
      'Sertifikat Anda telah tersimpan dan sedang menunggu proses verifikasi oleh Admin.'
    );
  };

  // Portfolio PDF Download Handler — menghasilkan PDF biner asli via jsPDF, bukan file .txt
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const handleDownloadPortfolioPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePortfolioPDF(currentPegawai, combinedTrainingList);
      playNotificationSound();
      onShowSuccess('✓ PDF berhasil dibuat.', 'Dokumen portofolio pelatihan pegawai telah berhasil diunduh ke perangkat Anda dalam format PDF.');
    } catch (err) {
      console.error('[PDF ERROR]', err);
      onShowSuccess('Gagal membuat PDF', 'Terjadi kendala saat membuat dokumen PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Send Portfolio to Employee Email Handler — pengiriman email sungguhan (EmailJS) atau mailto fallback
  const handleSendPortfolioToEmail = () => {
    const targetEmail = currentPegawai.email;

    if (!targetEmail) {
      onShowSuccess('Email belum terdaftar', 'Akun Anda belum memiliki alamat email kedinasan yang terdaftar. Hubungi Admin untuk melengkapi data email Anda terlebih dahulu.');
      return;
    }

    setIsSendingEmail(true);

    const bodySummary = combinedTrainingList
      .map((item, idx) => `${idx + 1}. ${item.judulPelatihan} — ${item.penyelenggara} (${item.tanggalPelatihan}) — ${item.jumlahJp || 0} JP — ${item.status.replace(/_/g, ' ')}`)
      .join('\n');

    // Versi teks polos untuk fallback mailto: (menyertakan salam sendiri, karena tidak ada template pembungkus)
    const bodyText = `Yth. ${currentPegawai.nama},\n\nBerikut ringkasan Portofolio Pelatihan Anda pada Sistem Informasi & Administrasi Pelatihan (SIAP) TVRI Sumatera Selatan:\n\nTotal Pelatihan Diikuti: ${totalPelatihan} Program\nTotal Sertifikat Disetujui: ${totalSertifikatDisetujui} Sertifikat\nTotal Jam Pelatihan: ${totalJamPelatihan} JP\n\nRiwayat Pelatihan:\n${bodySummary || '- Belum ada riwayat pelatihan yang terdaftar.'}\n\nUntuk berkas PDF lengkap, silakan gunakan tombol "Download PDF" pada portal SIAP.\n\nSalam,\nSistem SIAP TVRI Sumatera Selatan`;

    // Versi HTML rapi untuk EmailJS (TANPA salam "Yth. ..." karena sudah ada di template EmailJS itu sendiri)
    const rowsHtml = combinedTrainingList.length
      ? combinedTrainingList.map((item, idx) => `
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#334155;">${idx + 1}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${item.judulPelatihan}<br/><span style="color:#64748b;font-weight:400;font-size:12px;">${item.penyelenggara}</span></td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#334155;white-space:nowrap;">${item.tanggalPelatihan}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#334155;text-align:center;">${item.jumlahJp || '-'}</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;color:${item.status === 'DISETUJUI' ? '#059669' : '#b45309'};font-weight:600;">${item.status.replace(/_/g, ' ')}</td>
          </tr>`).join('')
      : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">Belum ada riwayat pelatihan yang terdaftar.</td></tr>`;

    const bodyHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;max-width:640px;">
        <p style="margin:0 0 14px;">Berikut ringkasan <strong>Portofolio Pelatihan</strong> Anda pada Sistem Informasi &amp; Administrasi Pelatihan (SIAP) TVRI Sumatera Selatan:</p>

        <table style="border-collapse:collapse;width:100%;margin-bottom:16px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:55%;">Total Pelatihan Diikuti</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;">${totalPelatihan} Program</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Total Sertifikat Disetujui</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;">${totalSertifikatDisetujui} Sertifikat</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Total Jam Pelatihan</td>
            <td style="padding:8px 10px;border:1px solid #e2e8f0;">${totalJamPelatihan} JP</td>
          </tr>
        </table>

        <p style="margin:0 0 8px;font-weight:700;">Riwayat Pelatihan:</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:16px;" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="background:#0f172a;color:#ffffff;">
              <th style="padding:8px 10px;border:1px solid #0f172a;text-align:left;">No</th>
              <th style="padding:8px 10px;border:1px solid #0f172a;text-align:left;">Judul Pelatihan</th>
              <th style="padding:8px 10px;border:1px solid #0f172a;text-align:left;">Tanggal</th>
              <th style="padding:8px 10px;border:1px solid #0f172a;text-align:center;">JP</th>
              <th style="padding:8px 10px;border:1px solid #0f172a;text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <p style="margin:0;">Untuk berkas PDF lengkap, silakan gunakan tombol <strong>"Download PDF"</strong> pada portal SIAP.</p>
        <p style="margin:18px 0 0;color:#64748b;font-size:12px;">Salam,<br/>Sistem SIAP TVRI Sumatera Selatan</p>
      </div>
    `;

    sendPortfolioEmail({
      toEmail: targetEmail,
      toName: currentPegawai.nama,
      subject: `Portofolio Pelatihan - ${currentPegawai.nama} (${currentPegawai.nip})`,
      bodyText,
      bodyHtml
    })
      .then(async (result) => {

        await Storage.addAuditLog({
          userId: currentPegawai.nip,
          userName: currentPegawai.nama,
          action: 'SEND_PORTFOLIO_EMAIL',
          module: 'SERTIFIKAT',
          description: `Mengirimkan Portofolio Pelatihan ke email terdaftar (${targetEmail}) via ${result.method === 'emailjs' ? 'EmailJS' : 'aplikasi email pengguna'}.`,
          status: result.success ? 'SUCCESS' : 'FAILED'
        });

        if (!result.success) {
          onShowSuccess('Gagal mengirim email', result.error);
          return;
        }

        playNotificationSound();
        if (result.method === 'emailjs') {
          onShowSuccess('✓ Email berhasil dikirim.', `Portofolio pelatihan telah dikirimkan langsung ke alamat email terdaftar: ${targetEmail}.`);
        } else {
          onShowSuccess('Aplikasi email dibuka.', `Isi email ke ${targetEmail} sudah disiapkan otomatis — tinggal tekan "Kirim" pada aplikasi email Anda.`);
        }
      })
      .finally(() => setIsSendingEmail(false));
  };

  const renderStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>✓ Disetujui</span>
          </span>
        );
      case 'SEDANG_DIVERIFIKASI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-900 px-3 py-1 rounded-full text-xs font-bold border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Menunggu Verifikasi Admin</span>
          </span>
        );
      case 'PERLU_REVISI':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-950 px-3 py-1 rounded-full text-xs font-bold border border-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>Perlu Revisi</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-800 px-3 py-1 rounded-full text-xs font-bold border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Ditolak</span>
          </span>
        );
      case 'BELUM_DIUNGGAH':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-300">
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Belum Diunggah</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-amber-400/20 border border-amber-300/40 px-3 py-0.5 rounded-full text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              <Award className="w-3 h-3 text-amber-400" />
              <span>Arsip Sertifikat Mandiri</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Sertifikat Pelatihan Pegawai</h2>
            <p className="text-xs text-blue-100/80 max-w-xl leading-relaxed">
              Pusat digitalisasi dan rekam jejak sertifikat pelatihan milik Anda. Unggah sertifikat resmi pelatihan yang telah diikuti untuk verifikasi Admin TVRI Sumsel.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-center gap-2 shrink-0 self-stretch md:self-auto">
            <button
              onClick={() => setIsPortfolioModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-1.5 shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Portofolio Pelatihan (PDF)</span>
            </button>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-2.5 text-right flex justify-between md:justify-center items-center md:items-end shrink-0">
              <span className="text-[10px] text-blue-200 uppercase font-semibold">Pegawai:</span>
              <span className="text-xs font-bold text-white ml-2 md:ml-0">{currentPegawai.nama} ({currentPegawai.nip})</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1 - RINGKASAN PELATIHAN (Mandatory 6 Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 mb-2">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pelatihan</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">{totalPelatihan}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 mb-2">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Diunggah</p>
            <h3 className="text-lg font-black text-indigo-950 mt-0.5">{totalSertifikatUploaded}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Disetujui</p>
            <h3 className="text-lg font-black text-emerald-950 mt-0.5">{totalSertifikatDisetujui}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menunggu Verifikasi</p>
            <h3 className="text-lg font-black text-amber-950 mt-0.5">{totalMenungguVerifikasi}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perlu Revisi</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">{totalPerluRevisi}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Pelatihan</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">{totalJamPelatihan} <span className="text-[10px] font-normal text-slate-400">JPL</span></h3>
          </div>
        </div>
      </div>

      {/* SECTION 2 - RIWAYAT PELATIHAN & SECTION 4 - STATUS VERIFIKASI */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Daftar Riwayat Pelatihan & Status Sertifikat</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Daftar riwayat pelatihan yang Anda ikuti dan status pengunggahan sertifikatnya.</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
            {combinedTrainingList.length} Program
          </span>
        </div>

        {combinedTrainingList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Award className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Belum Ada Riwayat Pelatihan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Seluruh pelatihan yang telah selesai atau disetujui oleh pimpinan akan tampil secara otomatis di sini.
            </p>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-slate-100">
              {paginatedTrainingList.map((item) => {
                const isUploadable = item.statusPelatihan === 'SELESAI' && (item.status === 'BELUM_DIUNGGAH' || item.status === 'PERLU_REVISI' || item.status === 'DITOLAK');

                return (
                  <div key={item.id} className="p-5 hover:bg-blue-50/30 transition space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded">
                            {item.jenisPelatihan}
                          </span>
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Status Pelatihan: Selesai</span>
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{item.judulPelatihan}</h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Penyelenggara: <strong className="text-slate-800">{item.penyelenggara}</strong></span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tanggal: <strong className="text-slate-800">{item.tanggalPelatihan}</strong></span>
                          </div>
                        </div>

                        {item.nomorSertifikat && (
                          <p className="text-xs text-slate-500 font-mono pt-1">
                            Nomor Sertifikat: <span className="text-blue-900 font-bold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">{item.nomorSertifikat}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center md:items-end justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-left md:text-right space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Sertifikat</span>
                          {renderStatusBadge(item.status)}
                        </div>

                        <div className="flex items-center space-x-2 pt-1 sm:pt-0">
                          {item.fileNama && (
                            <button
                              onClick={() => setPreviewCert(item)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 border border-slate-300"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Preview</span>
                            </button>
                          )}

                          {isUploadable && (
                            <button
                              onClick={() => handleOpenUploadModal(item)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm shadow-blue-500/20"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{item.status === 'PERLU_REVISI' || item.status === 'DITOLAK' ? 'Unggah Ulang Sertifikat' : 'Upload Sertifikat'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rejection / Revision Note Alert Box */}
                    {item.catatanRevisi && (item.status === 'PERLU_REVISI' || item.status === 'DITOLAK') && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start space-x-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-amber-900">
                            {item.status === 'DITOLAK' ? 'Sertifikat Ditolak:' : 'Catatan Revisi dari Admin:'}
                          </p>
                          <p className="text-amber-900 leading-relaxed italic">"{item.catatanRevisi}"</p>
                          <p className="text-[11px] font-semibold text-amber-800 pt-1">
                            Mohon unggah kembali sertifikat dengan kualitas gambar/dokumen yang lebih jelas.
                          </p>
                        </div>
                      </div>
                    )}
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
                entityName="Sertifikat Pelatihan"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3 - UPLOAD SERTIFIKAT MODAL */}
      {selectedUploadItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-900">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Unggah Sertifikat Pelatihan</h3>
              </div>
              <button
                onClick={() => setSelectedUploadItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-only Training Info Box */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="bg-blue-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded">
                {selectedUploadItem.jenisPelatihan}
              </span>
              <h4 className="font-extrabold text-blue-950 text-sm leading-snug">{selectedUploadItem.judulPelatihan}</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-blue-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Penyelenggara:</span>
                  <span className="font-semibold text-slate-800">{selectedUploadItem.penyelenggara}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Tanggal Pelaksanaan:</span>
                  <span className="font-semibold text-slate-800">{selectedUploadItem.tanggalPelatihan}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Sertifikat <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SERT/2026/TVRI/0842"
                    value={nomorSertifikat}
                    onChange={(e) => setNomorSertifikat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Sertifikat <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalSertifikat}
                    onChange={(e) => setTanggalSertifikat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Dokumen Sertifikat <span className="text-rose-500">*</span>
                </label>

                <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-5 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleOpenFilePicker}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <File className="w-5 h-5" />
                    </div>
                    
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-800">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">Tarik file ke sini atau <span className="text-blue-600 underline">Pilih File Sertifikat</span></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Format yang diperbolehkan: <strong>PDF, JPG, JPEG, PNG</strong> (Maksimal: <strong>5 MB</strong>)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {fileError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedUploadItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center space-x-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengunggah...' : 'Upload Sertifikat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 5 & 6 - PORTOFOLIO PELATIHAN (PDF REPORT) MODAL */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                  TVRI
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Portofolio Pelatihan & Sertifikasi</h3>
                  <p className="text-[11px] text-slate-500">LPP TVRI Stasiun Sumatera Selatan • Dokumen Resmi Pegawai</p>
                </div>
              </div>
              <button
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Official PDF Document Preview Frame */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-slate-800 space-y-5 shadow-inner">
              {/* Header Official Document */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h4 className="font-black text-slate-950 text-sm tracking-tight">LPP TVRI STASIUN SUMATERA SELATAN</h4>
                  <p className="text-xs font-semibold text-blue-900">SISTEM INFORMASI ADMINISTRASI PELATIHAN (SIAP)</p>
                  <p className="text-[10px] text-slate-500">Jl. Kampus TVRI, Palembang • Portal Portofolio Digital</p>
                </div>
                <div className="text-right border-l-2 border-amber-400 pl-3">
                  <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block">
                    PORTOFOLIO RESMI
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">Tgl Cetak: {new Date().toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              {/* Pegawai Info Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama Pegawai</span>
                  <span className="font-bold text-slate-900">{currentPegawai.nama}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">NIP</span>
                  <span className="font-mono font-semibold text-slate-800">{currentPegawai.nip}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Jabatan</span>
                  <span className="font-medium text-slate-800">{currentPegawai.jabatan}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Unit Kerja</span>
                  <span className="font-medium text-slate-800">{currentPegawai.unitKerja}</span>
                </div>
              </div>

              {/* Training History List Table */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Daftar Riwayat Pelatihan & Sertifikat Verified</span>
                  <span className="text-[11px] font-normal text-slate-500">Total: {combinedTrainingList.length} Program ({totalJamPelatihan} JPL)</span>
                </p>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">Judul Pelatihan</th>
                        <th className="p-2.5">Penyelenggara</th>
                        <th className="p-2.5">JP</th>
                        <th className="p-2.5">No. Sertifikat</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {combinedTrainingList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{item.judulPelatihan}</td>
                          <td className="p-2.5 text-slate-600">{item.penyelenggara}</td>
                          <td className="p-2.5 font-mono text-slate-700 text-center">{item.jumlahJp || '-'}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-700">{item.nomorSertifikat || '-'}</td>
                          <td className="p-2.5 font-bold text-emerald-700">
                            {item.status === 'DISETUJUI' ? 'VERIFIED' : item.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons: Download PDF & Kirim ke Email Saya */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Email Terdaftar: <strong className="text-blue-900">{currentPegawai.email || 'Belum terdaftar — hubungi Admin'}</strong>
              </span>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleSendPortfolioToEmail}
                  disabled={isSendingEmail}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isSendingEmail ? 'Mengirim...' : 'Kirim ke Email Saya'}</span>
                </button>

                <button
                  onClick={handleDownloadPortfolioPDF}
                  disabled={isGeneratingPdf}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm p-4">
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
                /* Berkas asli sudah diunggah pegawai — tampilkan file aslinya, bukan mock-up */
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
                /* Belum ada berkas asli yang diunggah — tampilkan ringkasan resmi bergaya kop surat (terang, memakai logo asli) */
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
                      Diberikan Kepada: <strong className="text-slate-900 font-black">{previewCert.employeeNama || currentPegawai.nama}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      NIP: {previewCert.employeeNip || currentPegawai.nip} • {previewCert.employeeUnitKerja || currentPegawai.unitKerja}
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
                    Belum ada berkas sertifikat asli yang diunggah. Unggah berkas untuk menampilkan dokumen aslinya di sini.
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

