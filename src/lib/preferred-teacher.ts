const KEY = "maljaa.preferredTeacher";

export function getPreferredTeacher(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPreferredTeacher(code: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, code);
  } catch {}
}

export function clearPreferredTeacher() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
