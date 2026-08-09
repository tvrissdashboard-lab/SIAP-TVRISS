import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export function isEmailJsConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

export interface SendResult {
  method: 'emailjs' | 'mailto';
  success: boolean;
  error?: string;
}

interface SendPortfolioEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  /** Plain-text body used both for the EmailJS template variable and the mailto fallback. */
  bodyText: string;
}

/**
 * Mengirim email secara nyata.
 *
 * 1) Jika EmailJS sudah dikonfigurasi (VITE_EMAILJS_SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY
 *    di file .env), email dikirim otomatis di background lewat layanan EmailJS —
 *    tidak ada dialog/emailclient yang terbuka, betul-betul terkirim ke inbox tujuan.
 * 2) Jika belum dikonfigurasi, sistem otomatis membuka aplikasi email default pengguna
 *    (mailto:) dengan subjek & isi sudah terisi lengkap, sehingga tombol tetap berfungsi
 *    dan email tetap benar-benar terkirim begitu pengguna menekan "Kirim" di klien emailnya.
 */
export async function sendPortfolioEmail(params: SendPortfolioEmailParams): Promise<SendResult> {
  const { toEmail, toName, subject, bodyText } = params;

  if (isEmailJsConfigured()) {
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_email: toEmail,
          to_name: toName,
          subject,
          message: bodyText
        },
        { publicKey: PUBLIC_KEY }
      );
      return { method: 'emailjs', success: true };
    } catch (err: any) {
      console.error('[EMAILJS ERROR]', err);
      return { method: 'emailjs', success: false, error: err?.text || err?.message || 'Gagal mengirim email melalui EmailJS.' };
    }
  }

  // Fallback: buka email client bawaan pengguna dengan isi surat sudah lengkap.
  const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(mailtoUrl, '_blank');
  return { method: 'mailto', success: true };
}
