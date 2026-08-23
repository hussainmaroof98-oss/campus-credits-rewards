// PLACEHOLDER AUTH SESSION STORE
// -----------------------------------------------------------------------------
// Mock/demo session persistence for the CampCredit login. This will be replaced
// by the real university SSO/LDAP integration (token exchange + secure session)
// once the university data partnership is in place.
// -----------------------------------------------------------------------------

export type StudentSession = {
  id: string;
  enrollment_number: string;
  name: string;
  section: string;
  branch: string;
  year: number;
  credit_balance: number;
  personal_rank: number | null;
};

const KEY = "campcredit.student";

export function saveSession(student: StudentSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(student));
}

export function loadSession(): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
