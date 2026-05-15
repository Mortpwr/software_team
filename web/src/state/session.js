import { ROLES } from "../data/seed.js";

const KEY = "ss_web_session_v1";

export function getSession(db) {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && saved.studentId) return saved;
  const first = db.students[0];
  const session = { studentId: first?.studentId || "", role: ROLES.STUDENT, token: "web-mock" };
  setSession(session);
  return session;
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("sessionchange"));
}
