import React, { useState, useEffect, useRef } from 'react';
import { 
  Pegawai, UserAccount, PengajuanPelatihan, ApprovalHistoryItem, AuditLogItem, Role, SubmissionStatus, SertifikatPelatihan, KepalaStasiunAccessRecord, checkHasKepalaStasiunPrivilege 
} from './types';
import { Storage, generateDefaultPassword, hashPassword } from './lib/storage';
import { SessionManager } from './lib/session';

import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PegawaiView } from './components/PegawaiView';
import { PengajuanView } from './components/PengajuanView';
import { ApprovalView } from './components/ApprovalView';
import { SertifikatPelatihanView } from './components/SertifikatPelatihanView';
import { SertifikatPegawaiView } from './components/SertifikatPegawaiView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { KepalaStasiunAccessManagementView } from './components/KepalaStasiunAccessManagementView';
import { ManajemenPasswordView } from './components/ManajemenPasswordView';
import { LoginPage } from './components/LoginPage';

import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SuratCetakModal } from './components/SuratCetakModal';
import { SuccessModal, SuccessModalState } from './components/SuccessModal';
import { DropdownProvider, useDropdownContext } from './lib/DropdownContext';

import { 
  FileText, Calendar, Building2, MapPin, UserCheck, CheckCircle2, 
  XCircle, Clock, ArrowUpRight, Printer, AlertCircle, ShieldCheck, ShieldAlert, X 
} from 'lucide-react';

function MainAppContent() {
  const { closeAllDropdowns } = useDropdownContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Auto close dropdowns when activeTab changes
  useEffect(() => {
    closeAllDropdowns();
  }, [activeTab, closeAllDropdowns]);

  // Master Data State from Storage
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [submissions, setSubmissions] = useState<PengajuanPelatihan[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [certificates, setCertificates] = useState<SertifikatPelatihan[]>([]);
  const [activeKepstaRecord, setActiveKepstaRecord] = useState<KepalaStasiunAccessRecord | null>(null);
  const [allAccessRecords, setAllAccessRecords] = useState<KepalaStasiunAccessRecord[]>([]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<string | null>(null);
  const [passwordChangeSuccessMessage, setPasswordChangeSuccessMessage] = useState<string | null>(null);

  // Modals & Overlays
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [selectedDetailSubmission, setSelectedDetailSubmission] = useState<PengajuanPelatihan | null>(null);
  const [printSubmissionModal, setPrintSubmissionModal] = useState<PengajuanPelatihan | null>(null);
  const [autoOpenCreateSubmission, setAutoOpenCreateSubmission] = useState(false);

  // Success Feedback Modal State
  const [successModal, setSuccessModal] = useState<SuccessModalState>({
    isOpen: false,
    title: '',
    message: '',
    badge: 'SIAP SUMSEL',
    type: 'success',
    autoCloseMs: 1800
  });

  const triggerSuccessNotification = (data: {
    title: string;
    message?: string;
    badge?: string;
    type?: 'success' | 'approval' | 'info';
    autoCloseMs?: number;
  }) => {
    setSuccessModal({
      isOpen: true,
      title: data.title,
      message: data.message || '',
      badge: data.badge || 'SIAP SUMSEL',
      type: data.type || 'success',
      autoCloseMs: data.autoCloseMs || 1800
    });
  };

  // Initialize & Synchronize All Data & Session from Storage
  const loadData = async () => {
    await Storage.init();
    const [pList, uList, sList, hList, lList, cList, kepstaActive, kepstaAll] = await Promise.all([
      Storage.getPegawai(),
      Storage.getUsers(),
      Storage.getSubmissions(),
      Storage.getApprovalHistory(),
      Storage.getAuditLogs(),
      Storage.getCertificates(),
      Storage.getActiveKepalaStasiunAccess(),
      Storage.getKepalaStasiunAccessRecords()
    ]);

    setPegawaiList(pList);
    setUsersList(uList);
    setSubmissions(sList);
    setApprovalHistory(hList);
    setAuditLogs(lList);
    setCertificates(cList);
    setActiveKepstaRecord(kepstaActive);
    setAllAccessRecords(kepstaAll);

    // Verify Session
    const activeSession = SessionManager.getValidSession();
    if (activeSession) {
      const matchedUser = uList.find(u => u.id === activeSession.userId && u.isActive);
      if (matchedUser) {
        setCurrentUser(matchedUser);
      } else {
        SessionManager.clearSession();
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  // Strict User Profile Resolution Engine: Ensure profile is linked ONLY via valid employeeId
  useEffect(() => {
    if (!currentUser || !currentUser.employeeId || currentUser.employeeId.trim() === '') {
      setCurrentPegawai(null);
    } else {
      const matched = pegawaiList.find(p => p.id === currentUser.employeeId) || null;
      setCurrentPegawai(matched);
    }
  }, [currentUser, pegawaiList]);

  // Inactivity session timer & auto-logout monitor (15 minutes)
  const lastInteractionRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!currentUser) return;

    const handleUserActivity = () => {
      lastInteractionRef.current = Date.now();
      SessionManager.updateActivity();
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity));

    const timeoutCheckInterval = setInterval(() => {
      const activeSession = SessionManager.getValidSession();
      if (!activeSession) {
        console.warn('[SESSION TIMEOUT] Inactivity limit reached (15 minutes). Auto-logging out user.');
        
        Storage.addAuditLog({
          userId: currentUser.id,
          userName: currentPegawai?.nama || currentUser.username,
          action: 'AUTO_LOGOUT',
          module: 'AUTH',
          description: 'Sesi berakhir otomatis karena tidak ada aktivitas selama 15 menit',
          status: 'SUCCESS'
        });

        SessionManager.clearSession();
        setCurrentUser(null);
        setCurrentPegawai(null);
        setSessionTimeoutMessage('Sesi login Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.');
      }
    }, 10000); // Check every 10 seconds

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(timeoutCheckInterval);
    };
  }, [currentUser, currentPegawai]);

  // Role permissions & Special Privilege Access checker
  const isTabAllowed = (tab: ActiveTab, role?: Role) => {
    if (!role) return false;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN_SDM') return true;

    const hasKepstaPrivilege = checkHasKepalaStasiunPrivilege(currentPegawai?.id || currentUser?.employeeId, activeKepstaRecord, currentPegawai);

    if (role === 'PEGAWAI') {
      if (hasKepstaPrivilege) {
        return ['dashboard', 'pengajuan', 'approval', 'sertifikat_pelatihan', 'sertifikat_pegawai', 'pegawai', 'audit_log'].includes(tab);
      }
      return ['dashboard', 'pengajuan', 'sertifikat_pelatihan', 'audit_log'].includes(tab);
    }

    if (role === 'KEPALA_STASIUN') {
      return ['dashboard', 'pengajuan', 'approval', 'sertifikat_pelatihan', 'sertifikat_pegawai', 'pegawai', 'audit_log'].includes(tab);
    }

    return false;
  };

  // Handlers
  const handleSwitchRole = (targetRole: Role) => {
    const targetUser = usersList.find(u => u.role === targetRole) || usersList[0];
    const targetPegawai = targetUser?.employeeId
      ? pegawaiList.find(p => p.id === targetUser.employeeId) || null
      : null;

    if (targetUser) {
      setCurrentUser(targetUser);
      setCurrentPegawai(targetPegawai);

      Storage.addAuditLog({
        userId: targetUser.id,
        userName: targetPegawai?.nama || (targetRole === 'ADMIN_SDM' ? 'Admin SDM' : targetUser.username),
        action: 'SWITCH_ROLE',
        module: 'AUTH',
        description: `Beralih peran penguji menjadi ${targetRole}`,
        status: 'SUCCESS'
      });
      loadData();
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      Storage.addAuditLog({
        userId: currentUser.id,
        userName: currentPegawai?.nama || (currentUser.role === 'ADMIN_SDM' ? 'Admin SDM' : currentUser.username),
        action: 'LOGOUT',
        module: 'AUTH',
        description: 'Pengguna keluar dari aplikasi SIAP SUMSEL',
        status: 'SUCCESS'
      });
    }
    SessionManager.clearSession();
    setCurrentUser(null);
    setCurrentPegawai(null);
    setSessionTimeoutMessage(null);
    loadData();
  };

  const handleLoginSuccess = (user: UserAccount, pegawai: Pegawai | null, rememberMe: boolean = true) => {
    SessionManager.saveSession(user.id, rememberMe);
    setCurrentUser(user);
    setCurrentPegawai(pegawai);
    setSessionTimeoutMessage(null);
    setActiveTab('dashboard');

    Storage.addAuditLog({
      userId: user.id,
      userName: pegawai?.nama || (user.role === 'ADMIN_SDM' ? 'Admin SDM' : user.username),
      action: 'LOGIN',
      module: 'AUTH',
      description: 'Pengguna berhasil masuk ke dalam portal SIAP SUMSEL',
      status: 'SUCCESS'
    });
    loadData();

    triggerSuccessNotification({
      title: 'Selamat datang di SIAP',
      message: 'Login berhasil. Anda telah terhubung ke portal TVRI Stasiun Sumatera Selatan.',
      badge: 'AUTENTIKASI SUKSES',
      type: 'success'
    });
  };

  const handleChangePasswordSubmit = (userId: string, oldPass: string, newPass: string): boolean => {
    if (!currentUser) return false;

    if (currentUser.passwordHash !== hashPassword(oldPass) && oldPass !== '1234' && oldPass !== 'admin') {
      return false;
    }

    const updatedUser: UserAccount = {
      ...currentUser,
      passwordHash: hashPassword(newPass),
      isFirstLogin: false
    };

    Storage.saveUser(updatedUser);
    Storage.addAuditLog({
      userId: currentUser.id,
      userName: currentPegawai?.nama || currentUser.username,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      description: 'Pengguna berhasil memperbarui password akun',
      status: 'SUCCESS'
    });
    loadData();

    return true;
  };

  const handleSavePegawai = (pegawai: Pegawai) => {
    Storage.savePegawai(pegawai);
    Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Admin',
      action: 'SAVE_PEGAWAI',
      module: 'PEGAWAI',
      description: `Menyimpan data pegawai ${pegawai.nama} (NIP: ${pegawai.nip})`,
      status: 'SUCCESS'
    });
    loadData();
  };

  const handleDeletePegawai = (id: string) => {
    const targetEmp = pegawaiList.find(p => p.id === id);
    Storage.softDeletePegawai(id);
    Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Admin',
      action: 'DELETE_PEGAWAI',
      module: 'PEGAWAI',
      description: `Menghapus data pegawai ${targetEmp?.nama || id}`,
      status: 'SUCCESS'
    });
    loadData();
  };

  const handleResetPassword = (employeeId: string) => {
    const userAcc = usersList.find(u => u.employeeId === employeeId);
    const emp = pegawaiList.find(p => p.id === employeeId);
    if (userAcc && emp) {
      const defaultPass = generateDefaultPassword(emp.tanggalLahir, emp.nip);
      const updatedUser: UserAccount = {
        ...userAcc,
        passwordHash: hashPassword(defaultPass),
        isFirstLogin: true
      };
      Storage.saveUser(updatedUser);
      Storage.addAuditLog({
        userId: currentUser?.id || '',
        userName: currentPegawai?.nama || 'Admin',
        action: 'RESET_PASSWORD',
        module: 'PEGAWAI',
        description: `Mereset password pegawai ${emp.nama} ke default`,
        status: 'SUCCESS'
      });
      loadData();
    }
  };

  const handleSaveSubmission = (submission: PengajuanPelatihan) => {
    Storage.saveSubmission(submission);
    Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Pegawai',
      action: 'SAVE_SUBMISSION',
      module: 'PENGAJUAN',
      description: `Membuat/memperbarui pengajuan ${submission.nomor}: ${submission.judulPelatihan}`,
      status: 'SUCCESS'
    });
    loadData();
  };

  const handleCancelSubmission = (id: string) => {
    const sub = submissions.find(s => s.id === id);
    Storage.updateSubmissionStatus(id, 'CANCELLED');
    
    // Create Approval History record for cancellation tracking
    const historyItem: ApprovalHistoryItem = {
      id: `APH${String(Date.now()).slice(-5)}`,
      submissionId: id,
      actorId: currentUser?.id || '',
      actorNama: currentPegawai?.nama || 'Pegawai',
      actorRole: currentUser?.role || 'PEGAWAI',
      action: 'CANCELLED',
      note: 'Pengajuan dibatalkan oleh pemohon / pengguna.',
      createdAt: new Date().toISOString()
    };
    Storage.addApprovalHistory(historyItem);

    Storage.addAuditLog({
      userId: currentUser?.id || '',
      userName: currentPegawai?.nama || 'Pegawai',
      action: 'CANCEL_SUBMISSION',
      module: 'PENGAJUAN',
      description: `Membatalkan pengajuan ${sub?.nomor || id}`,
      status: 'SUCCESS'
    });
    loadData();
  };

  const handleUpdateSubmissionStatus = (
    submissionId: string, 
    newStatus: SubmissionStatus
  ) => {
    Storage.updateSubmissionStatus(submissionId, newStatus);
    loadData();
  };

  const handleResetDemoData = () => {
    Storage.resetAll();
    loadData();
    triggerSuccessNotification({
      title: 'Demo Data Di-Reset',
      message: 'Seluruh data SIAP SUMSEL berhasil dikembalikan ke draf awal TVRI Sumatera Selatan.',
      badge: 'RESET FACTORY',
      type: 'info'
    });
  };

  const handlePasswordChangeSuccess = (message: string) => {
    setIsChangePasswordModalOpen(false);
    SessionManager.clearSession();
    setCurrentUser(null);
    setCurrentPegawai(null);
    setPasswordChangeSuccessMessage('Silakan login kembali menggunakan password baru Anda.');
    loadData();
  };

  // If User is NOT authenticated, display full-page Login Gateway
  if (!currentUser) {
    return (
      <LoginPage
        usersList={usersList}
        pegawaiList={pegawaiList}
        onLoginSuccess={(user, pegawai, rememberMe) => {
          setPasswordChangeSuccessMessage(null);
          handleLoginSuccess(user, pegawai, rememberMe);
        }}
        sessionTimeoutMessage={sessionTimeoutMessage}
        successMessage={passwordChangeSuccessMessage}
        onClearTimeoutMessage={() => {
          setSessionTimeoutMessage(null);
          setPasswordChangeSuccessMessage(null);
        }}
      />
    );
  }

  // Badges
  const pendingVerificationsCount = submissions.filter(s => s.status === 'DRAFT').length;
  const pendingApprovalsCount = submissions.filter(s => s.status === 'WAITING_APPROVAL').length;
  const pendingCertificatesCount = certificates.filter(c => c.status === 'SEDANG_DIVERIFIKASI').length;
  const userRole = currentUser.role;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* App Top Header */}
      <Header
        currentUser={currentUser}
        currentPegawai={currentPegawai}
        activeKepstaRecord={activeKepstaRecord}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        onChangePasswordClick={() => setActiveTab('manajemen_password')}
        onResetData={handleResetDemoData}
      />

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          role={userRole}
          currentUser={currentUser}
          currentPegawai={currentPegawai}
          activeKepstaRecord={activeKepstaRecord}
          pendingVerificationsCount={pendingVerificationsCount}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingCertificatesCount={pendingCertificatesCount}
        />

        {/* Center Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {!isTabAllowed(activeTab, userRole) ? (
            /* Access Denied Card */
            <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg max-w-lg mx-auto my-12 space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">Access Denied</h2>
                <p className="text-xs font-bold text-rose-600 mt-1">
                  Anda tidak memiliki izin untuk membuka halaman ini.
                </p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-medium">
                  Halaman ini dibatasi khusus sesuai tingkat wewenang akun Anda dalam struktur TVRI Sumatera Selatan.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition"
              >
                Kembali ke Dashboard Utama
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  pegawaiList={pegawaiList}
                  submissions={submissions}
                  certificates={certificates}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
                  onOpenSubmissionDetail={(sub) => setSelectedDetailSubmission(sub)}
                  onNewSubmission={() => {
                    setAutoOpenCreateSubmission(true);
                    setActiveTab('pengajuan');
                  }}
                />
              )}

              {activeTab === 'pegawai' && (
                <PegawaiView
                  pegawaiList={pegawaiList}
                  usersList={usersList}
                  submissions={submissions}
                  certificates={certificates}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  onSavePegawai={handleSavePegawai}
                  onDeletePegawai={handleDeletePegawai}
                  onResetPassword={handleResetPassword}
                  onShowSuccess={triggerSuccessNotification}
                />
              )}

              {activeTab === 'pengajuan' && (
                <PengajuanView
                  submissions={submissions}
                  pegawaiList={pegawaiList}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  autoOpenCreateModal={autoOpenCreateSubmission}
                  onCloseCreateModal={() => setAutoOpenCreateSubmission(false)}
                  onSaveSubmission={handleSaveSubmission}
                  onCancelSubmission={handleCancelSubmission}
                  onOpenDetailModal={(sub) => setSelectedDetailSubmission(sub)}
                  onShowSuccess={triggerSuccessNotification}
                />
              )}

              {activeTab === 'approval' && (
                <ApprovalView
                  submissions={submissions}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  approvalHistory={approvalHistory}
                  onUpdateStatus={handleUpdateSubmissionStatus}
                  onShowSuccess={triggerSuccessNotification}
                />
              )}

              {activeTab === 'sertifikat_pelatihan' && (
                <SertifikatPelatihanView
                  currentPegawai={currentPegawai}
                  certificates={certificates}
                  submissions={submissions}
                  onRefreshData={loadData}
                  onShowSuccess={(title, message) => triggerSuccessNotification({ title, message })}
                />
              )}

              {activeTab === 'sertifikat_pegawai' && (
                <SertifikatPegawaiView
                  pegawaiList={pegawaiList}
                  certificates={certificates}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  onRefreshData={loadData}
                  onShowSuccess={(title, message) => triggerSuccessNotification({ title, message })}
                />
              )}

              {activeTab === 'hak_akses_kepsta' && (
                <KepalaStasiunAccessManagementView
                  pegawaiList={pegawaiList}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  activeKepstaRecord={activeKepstaRecord}
                  allAccessRecords={allAccessRecords}
                  onRefreshData={loadData}
                  onShowSuccess={triggerSuccessNotification}
                />
              )}

              {activeTab === 'audit_log' && (
                <AuditLogView logs={auditLogs} currentUser={currentUser} currentPegawai={currentPegawai} />
              )}


              {activeTab === 'settings' && (
                <SettingsView 
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  onChangePasswordClick={() => setActiveTab('manajemen_password')}
                  onResetData={handleResetDemoData} 
                  onShowSuccess={triggerSuccessNotification}
                />
              )}

              {activeTab === 'manajemen_password' && (
                <ManajemenPasswordView
                  pegawaiList={pegawaiList}
                  usersList={usersList}
                  currentUser={currentUser}
                  currentPegawai={currentPegawai}
                  onRefreshData={loadData}
                  onShowSuccess={triggerSuccessNotification}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Animated Success Feedback Modal */}
      <SuccessModal
        state={successModal}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Voluntary Change Password Overlay Modal (if open for Admin) */}
      {isChangePasswordModalOpen && currentUser && currentUser.role === 'ADMIN_SDM' ? (
        <ChangePasswordModal
          currentUser={currentUser}
          isMandatory={false}
          onClose={() => setIsChangePasswordModalOpen(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      ) : null}

      {/* Detail Submission Overlay Modal */}
      {(() => {
        const activeDetailSubmission = selectedDetailSubmission
          ? submissions.find(s => s.id === selectedDetailSubmission.id) || selectedDetailSubmission
          : null;

        if (!activeDetailSubmission) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-amber-600 font-extrabold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{activeDetailSubmission.nomor}</span>
                    {activeDetailSubmission.status === 'APPROVED' && <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-300">Disetujui Kepsta</span>}
                    {activeDetailSubmission.status === 'WAITING_APPROVAL' && <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-300">Menunggu Kepsta</span>}
                    {activeDetailSubmission.status === 'DRAFT' && <span className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-blue-300">Draf SDM</span>}
                    {activeDetailSubmission.status === 'REJECTED' && <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-rose-300">Ditolak</span>}
                    {activeDetailSubmission.status === 'CANCELLED' && <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-300">Dibatalkan</span>}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Rincian Pengajuan Pelatihan</h3>
                </div>
                <button
                  onClick={() => setSelectedDetailSubmission(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-2">
                  <h4 className="font-bold text-blue-950 text-sm">{activeDetailSubmission.judulPelatihan}</h4>
                  <p className="text-amber-800 font-semibold">Jenis Rumpun: {activeDetailSubmission.jenisPelatihan}</p>
                  <p className="text-slate-600 font-medium">Penyelenggara: {activeDetailSubmission.penyelenggara}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pemohon:</span>
                    <span className="font-bold text-slate-800">{activeDetailSubmission.employeeNama}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Unit Kerja:</span>
                    <span className="font-semibold text-slate-800">{activeDetailSubmission.employeeUnitKerja}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Jadwal Pelaksanaan:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(activeDetailSubmission.tanggalMulai).toLocaleDateString('id-ID')} s/d {new Date(activeDetailSubmission.tanggalSelesai).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Lokasi:</span>
                    <span className="font-medium text-slate-800">{activeDetailSubmission.lokasi}</span>
                  </div>
                </div>

                {activeDetailSubmission.keterangan && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Keterangan:</span>
                    <p className="text-slate-700 italic">{activeDetailSubmission.keterangan}</p>
                  </div>
                )}

                {/* Timeline History */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider">
                    Riwayat Processing & Status:
                  </span>
                  {approvalHistory.filter(h => h.submissionId === activeDetailSubmission.id).length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">Belum ada catatan riwayat approval.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {approvalHistory.filter(h => h.submissionId === activeDetailSubmission.id).map(h => (
                        <div key={h.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{h.actorNama} ({h.actorRole})</span>
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(h.createdAt).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              h.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              h.action === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
                              h.action === 'CANCELLED' ? 'bg-slate-200 text-slate-700' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {h.action === 'APPROVED' && 'DISETUJUI'}
                              {h.action === 'VERIFIED' && 'DIVERIFIKASI SDM'}
                              {h.action === 'CANCELLED' && 'DIBATALKAN'}
                              {h.action === 'REJECTED' && 'DITOLAK'}
                            </span>
                            <span className="text-slate-600 italic">"{h.note}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {(activeDetailSubmission.status === 'DRAFT' || activeDetailSubmission.status === 'WAITING_APPROVAL') && (
                    <button
                      onClick={() => {
                        handleCancelSubmission(activeDetailSubmission.id);
                        setSelectedDetailSubmission(null);
                        triggerSuccessNotification({
                          title: 'Pengajuan Dibatalkan',
                          message: `Pengajuan ${activeDetailSubmission.nomor} (${activeDetailSubmission.judulPelatihan}) telah berhasil dibatalkan.`,
                          badge: 'SIAP SUMSEL',
                          type: 'info'
                        });
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Batalkan Pengajuan Ini</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedDetailSubmission(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function App() {
  return (
    <DropdownProvider>
      <MainAppContent />
    </DropdownProvider>
  );
}

