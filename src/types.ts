export type Role = 'PEGAWAI' | 'ADMIN_SDM' | 'SUPER_ADMIN' | 'KEPALA_STASIUN';

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'WAITING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type ApprovalAction = 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  tanggalLahir: string; // YYYY-MM-DD
  jabatan: string;
  golPangkat: string; // e.g. "IV c / Pembina Utama Muda", "IX", etc.
  statusPegawai: 'PNS' | 'PPPK' | 'KONTRAK' | string;
  unitKerja: string; // e.g. "UNOR UMUM", "UNOR KEUANGAN", "UNOR TEKNIK", etc.
  email: string;
  aktif: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface UserAccount {
  id: string;
  employeeId: string;
  username: string; // NIP
  passwordHash: string;
  role: Role;
  isFirstLogin: boolean;
  mustChangePassword?: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface PengajuanPelatihan {
  id: string;
  nomor: string; // e.g. SUB-20260724-0001
  employeeId: string;
  employeeNama?: string;
  employeeNip?: string;
  employeeUnitKerja?: string;
  employeeJabatan?: string;
  employeeGolPangkat?: string;
  employeeStatusPegawai?: string;
  judulPelatihan: string;
  jenisPelatihan: string;
  penyelenggara: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  keterangan: string;
  jumlahJp?: number; // Jumlah Jam Pelatihan (JP/JPL) yang diajukan/diikuti pegawai
  status: SubmissionStatus;
  lampiranUrl?: string;
  lampiranNama?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalHistoryItem {
  id: string;
  submissionId: string;
  actorId: string;
  actorNama: string;
  actorRole: Role;
  action: ApprovalAction;
  note: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  datetime: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  description: string;
  status: 'SUCCESS' | 'FAILED';
  ipAddress?: string;
  browser?: string;
  role?: string;
}

export type CertificateStatus = 
  | 'BELUM_DIUNGGAH' 
  | 'SEDANG_DIVERIFIKASI' 
  | 'DISETUJUI' 
  | 'DITOLAK' 
  | 'PERLU_REVISI';

export interface SertifikatPelatihan {
  id: string; // e.g. SERT-00001
  employeeId: string;
  employeeNama?: string;
  employeeNip?: string;
  employeeUnitKerja?: string;
  employeeJabatan?: string;
  submissionId?: string; // Link to PengajuanPelatihan if applicable
  judulPelatihan: string;
  jenisPelatihan: string;
  penyelenggara: string;
  tanggalPelatihan: string; // e.g. "10 Agu 2026 - 15 Agu 2026"
  jumlahJp?: number; // Jumlah Jam Pelatihan (JP/JPL), diturunkan dari pengajuan terkait
  statusPelatihan: 'SELESAI' | 'BERLANGSUNG';
  nomorSertifikat?: string;
  tanggalSertifikat?: string;
  fileUrl?: string;
  fileNama?: string;
  fileType?: string; // 'pdf' | 'image'
  fileSizeMb?: number;
  status: CertificateStatus;
  catatanRevisi?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  history?: {
    action: string;
    note?: string;
    timestamp: string;
    actorNama: string;
  }[];
}

export interface SystemSetting {
  key: string;
  label: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN';
}

export interface KepalaStasiunAccessRecord {
  id: string;
  employeeId: string;
  employeeNama: string;
  employeeNip: string;
  employeeJabatan: string;
  status: 'AKTIF' | 'TIDAK_AKTIF';
  grantedAt: string;
  grantedBy: string;
  revokedAt?: string;
  revokedBy?: string;
}

/**
 * Helper to check if a Pegawai's JOB TITLE TEXT literally mentions "Kepala Stasiun"
 * (Jabatan Khusus / Special Access by Position)
 *
 * NOTE (fixed 2026-08-18): This is ONLY a display/label helper now — e.g. to show a
 * "Jabatan Struktural Kepsta" hint in the UI. It must NEVER be used to grant actual
 * Kepsta privilege. Previously checkHasKepalaStasiunPrivilege() OR'd this in as a
 * fallback, which meant whoever's `jabatan` field contained "Kepala Stasiun"/"Kepala
 * TVRI"/"Kepsta" always kept full Kepsta approval rights, even after an admin
 * explicitly revoked their access in the "Manajemen Hak Akses Kepala Stasiun" page.
 * Revoking never edited the employee's `jabatan` text, so the old holder silently
 * kept BOTH the visual crown badge AND the ability to approve/reject pengajuan,
 * while the newly appointed employee also had it — two people with Kepsta authority
 * at once. Access must now come from exactly one place: the `kepala_stasiun_access`
 * table (single source of truth), managed via grant/revoke.
 */
export function isKepalaStasiunPosition(pegawai?: Pegawai | null): boolean {
  if (!pegawai || !pegawai.jabatan) return false;
  const j = pegawai.jabatan.toLowerCase();
  return j.includes('kepala tvri') || j.includes('kepala stasiun') || j.includes('kepsta');
}

/**
 * Check if an employee ID or current pegawai holds ACTIVE Kepala Stasiun privilege.
 *
 * Single source of truth: the `kepala_stasiun_access` table (activeAccessRecord).
 * A pegawai only has Kepsta privilege while there is a record for them with
 * status 'AKTIF'. As soon as an admin revokes it, this returns false immediately —
 * regardless of what that person's job title (`jabatan`) text says.
 */
export function checkHasKepalaStasiunPrivilege(
  employeeId?: string | null,
  activeAccessRecord?: KepalaStasiunAccessRecord | null,
  pegawai?: Pegawai | null
): boolean {
  if (activeAccessRecord && activeAccessRecord.status === 'AKTIF') {
    if (employeeId && (activeAccessRecord.employeeId === employeeId || activeAccessRecord.employeeNip === employeeId)) {
      return true;
    }
    if (pegawai) {
      if (pegawai.id === activeAccessRecord.employeeId || pegawai.nip === activeAccessRecord.employeeNip) {
        return true;
      }
    }
  }
  return false;
}

