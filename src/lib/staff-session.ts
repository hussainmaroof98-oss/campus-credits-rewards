// PLACEHOLDER STAFF SESSION STORE
// -----------------------------------------------------------------------------
// Mock/demo session persistence for the CampCredit staff panel. Replaced by the
// real university staff directory / SSO integration later, at which point staff
// permissions will also be scoped to the clubs and events they actually own.
// -----------------------------------------------------------------------------

export type StaffSession = {
  id: string;
  staff_code: string;
  name: string;
  department: string;
};

const KEY = "campcredit.staff";

export function saveStaffSession(staff: StaffSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(staff));
}

export function loadStaffSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

export function clearStaffSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
