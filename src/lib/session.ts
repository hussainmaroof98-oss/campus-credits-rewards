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

// Temporary preview mode: the student experience opens directly as Aarav.
// Restore real authentication here when university sign-in is ready.
export const DEMO_STUDENT: StudentSession = {
  id: "bc0da362-a22f-4bac-8974-2f0ebee9ea8c",
  enrollment_number: "2023CSE042",
  name: "Aarav Mehta",
  section: "A",
  branch: "BTech CSE",
  year: 2,
  credit_balance: 0,
  personal_rank: null,
};

export function saveSession(student: StudentSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(student));
}

export function loadSession(): StudentSession | null {
  if (typeof window === "undefined") return DEMO_STUDENT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : DEMO_STUDENT;
  } catch {
    return DEMO_STUDENT;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
