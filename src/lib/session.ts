import { UserAccount } from '../types';

export interface SessionData {
  userId: string;
  rememberMe: boolean;
  loginTime: number;
  lastActivityTime: number;
}

const SESSION_KEY = 'siap_sumsel_session_v1';
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes (900 seconds)

export const SessionManager = {
  saveSession(userId: string, rememberMe: boolean) {
    const session: SessionData = {
      userId,
      rememberMe,
      loginTime: Date.now(),
      lastActivityTime: Date.now()
    };

    const sessionStr = JSON.stringify(session);

    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, sessionStr);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, sessionStr);
      localStorage.removeItem(SESSION_KEY);
    }
  },

  updateActivity() {
    const rawLocal = localStorage.getItem(SESSION_KEY);
    const rawSession = sessionStorage.getItem(SESSION_KEY);

    if (rawLocal) {
      try {
        const session: SessionData = JSON.parse(rawLocal);
        session.lastActivityTime = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Failed to parse local session', e);
      }
    } else if (rawSession) {
      try {
        const session: SessionData = JSON.parse(rawSession);
        session.lastActivityTime = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Failed to parse session storage session', e);
      }
    }
  },

  getValidSession(): SessionData | null {
    const rawLocal = localStorage.getItem(SESSION_KEY);
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    const raw = rawLocal || rawSession;

    if (!raw) return null;

    try {
      const session: SessionData = JSON.parse(raw);
      const isExpired = Date.now() - session.lastActivityTime > INACTIVITY_TIMEOUT_MS;

      if (isExpired) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (e) {
      this.clearSession();
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
};
