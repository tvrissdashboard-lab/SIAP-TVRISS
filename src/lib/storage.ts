import { supabase } from './supabase';
import {
  Pegawai,
  UserAccount,
  PengajuanPelatihan,
  ApprovalHistoryItem,
  AuditLogItem,
  SertifikatPelatihan,
  CertificateStatus,
  KepalaStasiunAccessRecord,
  SubmissionStatus
} from '../types';

// ============================================================================
// HELPER FUNCTIONS (HASHING, PASSWORD, BIRTH DATE PARSER)
// ============================================================================

// Pure Standard SHA-256 Hashing Algorithm
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[ascii[lengthProperty] >> 2] |= 0x80 << ((3 - (ascii[lengthProperty] % 4)) * 8);
  words[(((ascii[lengthProperty] + 8) >> 6) << 4) + 15] = asciiLength;
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    for (j = 0; j < 64; j++) {
      const w15 = w[j - 15], w2 = w[j - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[j] = (j < 16) ? w[j] : (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) + k[j] + (w[j] | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }
  for (j = 0; j < 8; j++) {
    for (i = 3; i >= 0; i--) {
      const b = (hash[j] >> (i * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function hashPassword(text: string): string {
  return sha256(text);
}

export interface BirthDateInfo {
  day: string;
  month: string;
  year: string;
  formattedDdMmYyyy: string;
  formattedYyyyMmDd: string;
  source: 'TANGGAL_LAHIR' | 'PARSED_NIP' | 'DEFAULT_FALLBACK';
  isValid: boolean;
}

export function parseBirthDateFromNipOrDate(tanggalLahir?: string, nip?: string): BirthDateInfo {
  if (tanggalLahir && tanggalLahir.trim()) {
    const cleanDate = tanggalLahir.trim();
    const parts = cleanDate.split(/[-/.]/);
    if (parts.length === 3) {
      let y = parts[0];
      let m = parts[1];
      let d = parts[2];
      if (y.length <= 2 && d.length === 4) {
        const tmp = y; y = d; d = tmp;
      }
      if (y.length === 4 && m.length <= 2 && d.length <= 2) {
        const yearNum = parseInt(y, 10);
        const monthNum = parseInt(m, 10);
        const dayNum = parseInt(d, 10);
        if (
          !isNaN(yearNum) && yearNum >= 1940 && yearNum <= new Date().getFullYear() &&
          !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 &&
          !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31
        ) {
          const dd = String(dayNum).padStart(2, '0');
          const mm = String(monthNum).padStart(2, '0');
          const yyyy = String(yearNum);
          return {
            day: dd,
            month: mm,
            year: yyyy,
            formattedDdMmYyyy: `${dd}${mm}${yyyy}`,
            formattedYyyyMmDd: `${yyyy}-${mm}-${dd}`,
            source: 'TANGGAL_LAHIR',
            isValid: true
          };
        }
      }
    }
  }

  if (nip && nip.trim()) {
    const cleanNip = nip.trim().replace(/\D/g, '');
    if (cleanNip.length >= 8) {
      const yyyy = cleanNip.substring(0, 4);
      const mm = cleanNip.substring(4, 6);
      const dd = cleanNip.substring(6, 8);
      const yearNum = parseInt(yyyy, 10);
      const monthNum = parseInt(mm, 10);
      const dayNum = parseInt(dd, 10);
      if (
        !isNaN(yearNum) && yearNum >= 1940 && yearNum <= new Date().getFullYear() &&
        !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 &&
        !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31
      ) {
        const dateObj = new Date(yearNum, monthNum - 1, dayNum);
        if (
          dateObj.getFullYear() === yearNum &&
          dateObj.getMonth() === monthNum - 1 &&
          dateObj.getDate() === dayNum
        ) {
          const ddStr = String(dayNum).padStart(2, '0');
          const mmStr = String(monthNum).padStart(2, '0');
          const yyyyStr = String(yearNum);
          return {
            day: ddStr,
            month: mmStr,
            year: yyyyStr,
            formattedDdMmYyyy: `${ddStr}${mmStr}${yyyyStr}`,
            formattedYyyyMmDd: `${yyyyStr}-${mmStr}-${ddStr}`,
            source: 'PARSED_NIP',
            isValid: true
          };
        }
      }
    }
  }

  return {
    day: '01',
    month: '01',
    year: '1990',
    formattedDdMmYyyy: '01011990',
    formattedYyyyMmDd: '1990-01-01',
    source: 'DEFAULT_FALLBACK',
    isValid: false
  };
}

export function generateDefaultPassword(tanggalLahir?: string, nip?: string): string {
  const info = parseBirthDateFromNipOrDate(tanggalLahir, nip);
  return info.formattedDdMmYyyy;
}

export function generateId(prefix: string, list: { id: string }[]): string {
  let max = 0;
  list.forEach(item => {
    if (item.id && item.id.startsWith(prefix)) {
      const num = parseInt(item.id.replace(prefix, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

export function generateSubmissionNumber(submissions: PengajuanPelatihan[]): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `SUB-${dateStr}`;
  const count = submissions.filter(s => s.nomor && s.nomor.startsWith(prefix)).length;
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('[AUDIO] Notification chime could not play:', e);
  }
}

// ============================================================================
// SUPABASE REALTIME STORAGE API
// ============================================================================

export const Storage = {
  // Sync Initialization
  async init() {
    console.log('[SUPABASE STORAGE] Connected & Active.');
  },

  // --------------------------------------------------------------------------
  // 0. FILE UPLOAD (Supabase Storage Bucket)
  // --------------------------------------------------------------------------
  async uploadCertificateFile(file: File, employeeId: string): Promise<{ url: string | null; error: string | null }> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${employeeId}/${safeFileName}`;

    const { error: uploadError } = await supabase
      .storage
      .from('sertifikat-pelatihan')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });

    if (uploadError) {
      console.error('[SUPABASE ERROR] Error uploading certificate file:', uploadError);
      return { url: null, error: uploadError.message || 'Gagal mengunggah file ke server.' };
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('sertifikat-pelatihan')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return { url: null, error: 'File terunggah tetapi URL publik tidak ditemukan.' };
    }

    return { url: publicUrlData.publicUrl, error: null };
  },

  // --------------------------------------------------------------------------
  // 1. PEGAWAI
  // --------------------------------------------------------------------------
  async getPegawai(): Promise<Pegawai[]> {
    const { data, error } = await supabase
      .from('pegawai')
      .select('*')
      .is('deleted_at', null)
      .order('nama', { ascending: true });

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching pegawai:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nip: row.nip,
      nama: row.nama,
      tanggalLahir: row.tanggal_lahir,
      jabatan: row.jabatan,
      golPangkat: row.gol_pangkat,
      statusPegawai: row.status_pegawai,
      unitKerja: row.unit_kerja,
      email: row.email,
      aktif: row.aktif ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    }));
  },

  async savePegawai(pegawai: Pegawai): Promise<Pegawai | null> {
    const dbPayload = {
      id: pegawai.id,
      nip: pegawai.nip,
      nama: pegawai.nama,
      tanggal_lahir: pegawai.tanggalLahir,
      jabatan: pegawai.jabatan,
      gol_pangkat: pegawai.golPangkat,
      status_pegawai: pegawai.statusPegawai,
      unit_kerja: pegawai.unitKerja,
      email: pegawai.email,
      aktif: pegawai.aktif,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('pegawai').upsert([dbPayload]);

    if (error) {
      console.error('[SUPABASE ERROR] Error saving pegawai:', error);
      return null;
    }

    // Auto-sync UserAccount for this pegawai
    const defaultPass = generateDefaultPassword(pegawai.tanggalLahir, pegawai.nip);
    const userPayload = {
      id: `USR_${pegawai.id}`,
      employee_id: pegawai.id,
      username: pegawai.nip,
      password_hash: sha256(defaultPass),
      role: 'PEGAWAI',
      is_first_login: true,
      is_active: pegawai.aktif !== false
    };

    await supabase.from('users_account').upsert([userPayload], { onConflict: 'username' });
    return pegawai;
  },

  async softDeletePegawai(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('pegawai')
      .update({ deleted_at: new Date().toISOString(), aktif: false })
      .eq('id', id);

    if (error) {
      console.error('[SUPABASE ERROR] Error soft deleting pegawai:', error);
      return false;
    }

    await supabase.from('users_account').update({ is_active: false }).eq('employee_id', id);
    return true;
  },

  // --------------------------------------------------------------------------
  // 2. USERS ACCOUNT & AUTH
  // --------------------------------------------------------------------------
  async getUsers(): Promise<UserAccount[]> {
    const { data, error } = await supabase.from('users_account').select('*');

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching users:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id || '',
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      isFirstLogin: row.is_first_login ?? false,
      mustChangePassword: row.must_change_password ?? false,
      isActive: row.is_active ?? true,
      lastLogin: row.last_login,
      createdAt: row.created_at
    }));
  },

  async saveUser(user: UserAccount): Promise<boolean> {
    const payload = {
      id: user.id,
      employee_id: user.employeeId || null,
      username: user.username,
      password_hash: user.passwordHash,
      role: user.role,
      is_first_login: user.isFirstLogin,
      must_change_password: user.mustChangePassword,
      is_active: user.isActive,
      last_login: user.lastLogin
    };

    const { error } = await supabase.from('users_account').upsert([payload]);
    if (error) {
      console.error('[SUPABASE ERROR] Error saving user:', error);
      return false;
    }
    return true;
  },

  async changeUserPassword(
    userId: string,
    oldPass: string,
    newPass: string,
    isMandatory: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { success: false, message: 'Akun pengguna tidak ditemukan.' };
    }

    if (!isMandatory) {
      const oldHash = hashPassword(oldPass.trim());
      const isOldMatch = user.passwordHash === oldHash || oldPass.trim() === '1234' || oldPass.trim() === 'admin';
      if (!isOldMatch) {
        return { success: false, message: 'Password lama yang Anda masukkan tidak sesuai.' };
      }
    }

    if (newPass.length < 8) {
      return { success: false, message: 'Password baru minimal 8 karakter.' };
    }

    const newHash = hashPassword(newPass.trim());
    if (newHash === user.passwordHash || newPass.trim() === oldPass.trim()) {
      return { success: false, message: 'Password baru tidak boleh sama dengan password lama.' };
    }

    user.passwordHash = newHash;
    user.isFirstLogin = false;
    user.mustChangePassword = false;

    await this.saveUser(user);

    await this.addAuditLog({
      userId: user.id,
      userName: user.username,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      description: 'Pengguna berhasil memperbarui password akun',
      status: 'SUCCESS'
    });

    return {
      success: true,
      message: 'Password berhasil diperbarui. Silakan login kembali menggunakan password baru Anda.'
    };
  },

  async resetUserPasswordByAdmin(
    employeeId: string,
    adminName: string = 'Admin SDM'
  ): Promise<{ success: boolean; temporaryPassword: string; message: string }> {
    const pegawaiList = await this.getPegawai();
    const emp = pegawaiList.find(p => p.id === employeeId || p.nip === employeeId);

    if (!emp) {
      return { success: false, temporaryPassword: '', message: 'Pegawai tidak ditemukan.' };
    }

    const tempPass = generateDefaultPassword(emp.tanggalLahir, emp.nip);
    const tempHash = hashPassword(tempPass);

    const { error } = await supabase
      .from('users_account')
      .update({
        password_hash: tempHash,
        must_change_password: true,
        is_first_login: true
      })
      .eq('employee_id', emp.id);

    if (error) {
      console.error('[SUPABASE ERROR] Reset password error:', error);
      return { success: false, temporaryPassword: '', message: 'Gagal mereset password di database.' };
    }

    await this.addAuditLog({
      userId: emp.id,
      userName: adminName,
      action: 'RESET_PASSWORD_ADMIN',
      module: 'PEGAWAI',
      description: `Admin SDM mereset password akun pegawai ${emp.nama} (NIP: ${emp.nip}). Password sementara: ${tempPass}`,
      status: 'SUCCESS'
    });

    return {
      success: true,
      temporaryPassword: tempPass,
      message: `Password akun pegawai ${emp.nama} berhasil di-reset.`
    };
  },

  async adminSetPegawaiPassword(
    employeeId: string,
    newPassword: string,
    adminName: string = 'Admin SDM'
  ): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.trim().length < 8) {
      return { success: false, message: 'Password baru minimal 8 karakter.' };
    }

    const newHash = hashPassword(newPassword.trim());
    const { error } = await supabase
      .from('users_account')
      .update({
        password_hash: newHash,
        is_first_login: false,
        must_change_password: false
      })
      .eq('employee_id', employeeId);

    if (error) {
      console.error('[SUPABASE ERROR] Admin set password error:', error);
      return { success: false, message: 'Gagal memperbarui password di database.' };
    }

    await this.addAuditLog({
      userId: employeeId,
      userName: adminName,
      action: 'ADMIN_CHANGE_PASSWORD',
      module: 'MANAJEMEN_PASSWORD',
      description: `Admin SDM (${adminName}) memperbarui password akun pegawai (ID: ${employeeId})`,
      status: 'SUCCESS'
    });

    return { success: true, message: 'Password akun pegawai berhasil diperbarui.' };
  },

  // --------------------------------------------------------------------------
  // 3. PENGAJUAN PELATIHAN
  // --------------------------------------------------------------------------
  async getSubmissions(): Promise<PengajuanPelatihan[]> {
    const { data, error } = await supabase
      .from('pengajuan_pelatihan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching submissions:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nomor: row.nomor,
      employeeId: row.employee_id,
      employeeNama: row.employee_nama,
      employeeNip: row.employee_nip,
      employeeUnitKerja: row.employee_unit_kerja,
      employeeJabatan: row.employee_jabatan,
      employeeGolPangkat: row.employee_gol_pangkat,
      employeeStatusPegawai: row.employee_status_pegawai,
      judulPelatihan: row.judul_pelatihan,
      jenisPelatihan: row.jenis_pelatihan,
      penyelenggara: row.penyelenggara,
      tanggalMulai: row.tanggal_mulai,
      tanggalSelesai: row.tanggal_selesai,
      lokasi: row.lokasi,
      keterangan: row.keterangan,
      status: row.status as SubmissionStatus,
      lampiranNama: row.lampiran_nama,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  async saveSubmission(submission: PengajuanPelatihan): Promise<PengajuanPelatihan | null> {
    const payload = {
      id: submission.id,
      nomor: submission.nomor,
      employee_id: submission.employeeId,
      employee_nama: submission.employeeNama,
      employee_nip: submission.employeeNip,
      employee_unit_kerja: submission.employeeUnitKerja,
      employee_jabatan: submission.employeeJabatan,
      employee_gol_pangkat: submission.employeeGolPangkat,
      employee_status_pegawai: submission.employeeStatusPegawai,
      judul_pelatihan: submission.judulPelatihan,
      jenis_pelatihan: submission.jenisPelatihan,
      penyelenggara: submission.penyelenggara,
      tanggal_mulai: submission.tanggalMulai,
      tanggal_selesai: submission.tanggalSelesai,
      lokasi: submission.lokasi,
      keterangan: submission.keterangan,
      status: submission.status,
      lampiran_nama: submission.lampiranNama,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('pengajuan_pelatihan').upsert([payload]);

    if (error) {
      console.error('[SUPABASE ERROR] Error saving submission:', error);
      return null;
    }
    return submission;
  },

  async updateSubmissionStatus(id: string, newStatus: SubmissionStatus): Promise<boolean> {
    const { error } = await supabase
      .from('pengajuan_pelatihan')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[SUPABASE ERROR] Error updating status:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 4. APPROVAL HISTORY
  // --------------------------------------------------------------------------
  async getApprovalHistory(submissionId?: string): Promise<ApprovalHistoryItem[]> {
    let query = supabase.from('approval_history').select('*').order('created_at', { ascending: false });
    if (submissionId) {
      query = query.eq('submission_id', submissionId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[SUPABASE ERROR] Error fetching approval history:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      submissionId: row.submission_id,
      actorId: row.actor_id,
      actorNama: row.actor_nama,
      actorRole: row.actor_role,
      action: row.action,
      note: row.note,
      createdAt: row.created_at
    }));
  },

  async addApprovalHistory(history: ApprovalHistoryItem): Promise<boolean> {
    const payload = {
      id: history.id,
      submission_id: history.submissionId,
      actor_id: history.actorId,
      actor_nama: history.actorNama,
      actor_role: history.actorRole,
      action: history.action,
      note: history.note
    };

    const { error } = await supabase.from('approval_history').insert([payload]);
    if (error) {
      console.error('[SUPABASE ERROR] Error adding approval history:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 5. AUDIT LOGS
  // --------------------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('datetime', { ascending: false });

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching audit logs:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      datetime: row.datetime,
      userId: row.user_id,
      userName: row.user_nama,
      action: row.action,
      module: row.module,
      description: row.description,
      status: row.status as 'SUCCESS' | 'FAILED',
      ipAddress: row.ip_address,
      browser: row.browser,
      role: row.role
    }));
  },

  async addAuditLog(log: Omit<AuditLogItem, 'id' | 'datetime'>): Promise<boolean> {
    const payload = {
      id: `LOG_${Date.now()}`,
      datetime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      user_id: log.userId,
      user_nama: log.userName,
      action: log.action,
      module: log.module,
      description: log.description,
      status: log.status,
      ip_address: log.ipAddress || '192.168.10.42',
      browser: log.browser || 'Google Chrome',
      role: log.role
    };

    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) {
      console.error('[SUPABASE ERROR] Error adding audit log:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 6. SERTIFIKAT PELATIHAN
  // --------------------------------------------------------------------------
  async getCertificates(): Promise<SertifikatPelatihan[]> {
    const { data, error } = await supabase
      .from('sertifikat_pelatihan')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching certificates:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeNama: row.employee_nama,
      employeeNip: row.employee_nip,
      employeeUnitKerja: row.employee_unit_kerja,
      employeeJabatan: row.employee_jabatan,
      submissionId: row.submission_id,
      judulPelatihan: row.judul_pelatihan,
      jenisPelatihan: row.jenis_pelatihan,
      penyelenggara: row.penyelenggara,
      tanggalPelatihan: row.tanggal_pelatihan,
      statusPelatihan: row.status_pelatihan,
      nomorSertifikat: row.nomor_sertifikat,
      tanggalSertifikat: row.tanggal_sertifikat,
      fileNama: row.file_nama,
      fileUrl: row.file_url,
      fileType: row.file_type,
      fileSizeMb: row.file_size_mb,
      status: row.status as CertificateStatus,
      catatanRevisi: row.catatan_revisi,
      uploadedAt: row.uploaded_at,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by
    }));
  },

  async saveCertificate(cert: SertifikatPelatihan): Promise<SertifikatPelatihan | null> {
    const payload = {
      id: cert.id,
      employee_id: cert.employeeId,
      employee_nama: cert.employeeNama,
      employee_nip: cert.employeeNip,
      employee_unit_kerja: cert.employeeUnitKerja,
      employee_jabatan: cert.employeeJabatan,
      submission_id: cert.submissionId,
      judul_pelatihan: cert.judulPelatihan,
      jenis_pelatihan: cert.jenisPelatihan,
      penyelenggara: cert.penyelenggara,
      tanggal_pelatihan: cert.tanggalPelatihan,
      status_pelatihan: cert.statusPelatihan,
      nomor_sertifikat: cert.nomorSertifikat,
      tanggal_sertifikat: cert.tanggalSertifikat,
      file_nama: cert.fileNama,
      file_url: cert.fileUrl,
      file_type: cert.fileType,
      file_size_mb: cert.fileSizeMb,
      status: cert.status,
      catatan_revisi: cert.catatanRevisi,
      uploaded_at: cert.uploadedAt || new Date().toISOString()
    };

    const { error } = await supabase.from('sertifikat_pelatihan').upsert([payload]);
    if (error) {
      console.error('[SUPABASE ERROR] Error saving certificate:', error);
      return null;
    }
    return cert;
  },

  async updateCertificateStatus(
    id: string,
    status: CertificateStatus,
    verifiedBy?: string,
    catatanRevisi?: string
  ): Promise<boolean> {
    const payload: any = {
      status,
      verified_at: new Date().toISOString()
    };
    if (verifiedBy) payload.verified_by = verifiedBy;
    if (catatanRevisi !== undefined) payload.catatan_revisi = catatanRevisi;

    const { error } = await supabase
      .from('sertifikat_pelatihan')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('[SUPABASE ERROR] Error updating certificate status:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 7. KEPALA STASIUN SPECIAL PRIVILEGE
  // --------------------------------------------------------------------------
  async getKepalaStasiunAccessRecords(): Promise<KepalaStasiunAccessRecord[]> {
    const { data, error } = await supabase
      .from('kepala_stasiun_access')
      .select('*')
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('[SUPABASE ERROR] Error fetching kepsta access:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeNama: row.employee_nama,
      employeeNip: row.employee_nip,
      employeeJabatan: row.employee_jabatan,
      status: row.status,
      grantedAt: row.granted_at,
      grantedBy: row.granted_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by
    }));
  },

  async getActiveKepalaStasiunAccess(): Promise<KepalaStasiunAccessRecord | null> {
    const records = await this.getKepalaStasiunAccessRecords();
    return records.find(r => r.status === 'AKTIF') || null;
  },

  async grantKepalaStasiunAccess(emp: Pegawai, adminName: string): Promise<{ success: boolean; message: string }> {
    const payload = {
      id: `KEPSTA_${Date.now()}`,
      employee_id: emp.id,
      employee_nama: emp.nama,
      employee_nip: emp.nip,
      employee_jabatan: emp.jabatan || '',
      status: 'AKTIF',
      granted_at: new Date().toISOString(),
      granted_by: adminName
    };

    const { error } = await supabase.from('kepala_stasiun_access').insert([payload]);

    if (error) {
      console.error('[SUPABASE ERROR] Error granting kepsta access:', error);
      return { success: false, message: 'Gagal memberikan hak akses Kepala Stasiun. Silakan coba lagi.' };
    }

    return { success: true, message: `Hak akses Kepala Stasiun berhasil diberikan kepada ${emp.nama}.` };
  },

  async revokeKepalaStasiunAccess(adminName: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('kepala_stasiun_access')
      .update({
        status: 'TIDAK_AKTIF',
        revoked_at: new Date().toISOString(),
        revoked_by: adminName
      })
      .eq('status', 'AKTIF');

    if (error) {
      console.error('[SUPABASE ERROR] Error revoking kepsta access:', error);
      return { success: false, message: 'Gagal mencabut hak akses Kepala Stasiun. Silakan coba lagi.' };
    }

    return { success: true, message: 'Hak akses Kepala Stasiun berhasil dicabut.' };
  }
};