const db = require('../core/db');
const audit = require('./audit.repository');
const { QUESTIONS } = require('../core/theory-seed');

function ensureTheory(db) {
  db.theory = db.theory || { questions: [], attempts: [] };
  db.theory.attempts = db.theory.attempts || [];
  let cur = db.theory.questions || [];
  if (cur.length === 0) {
    db.theory.questions = QUESTIONS.slice();
    return;
  }
  const existing = new Set(cur.map((q) => q.id));
  QUESTIONS.forEach((q) => {
    if (!existing.has(q.id)) {
      cur.push(q);
      existing.add(q.id);
    }
  });
  db.theory.questions = cur;
}

function listQuestionsForExam() {
  db.withDb((d) => {
    ensureTheory(d);
    return d;
  });
  const d = db.readDb();
  return d.theory.questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    options: q.options,
  }));
}

function submitExam(studentId, answerMap) {
  const d = db.ensureDb();
  ensureTheory(d);
  const questions = d.theory.questions;
  let ok = 0;
  questions.forEach((q) => {
    const picked = answerMap[q.id];
    if (picked === q.answerIndex) ok += 1;
  });
  const total = questions.length;
  const score = total ? Math.round((ok / total) * 100) : 0;
  const row = {
    id: `th_${Date.now()}`,
    studentId,
    at: Date.now(),
    ok,
    total,
    score,
    detail: answerMap,
  };
  db.withDb((x) => {
    ensureTheory(x);
    x.theory.attempts.unshift(row);
    if (x.theory.attempts.length > 100) x.theory.attempts.length = 100;
    return x;
  });
  audit.append({
    actorId: studentId,
    role: 'student',
    action: 'theory_submit',
    target: row.id,
    detail: { score },
  });
  return row;
}

function listAttempts(studentId) {
  db.withDb((d) => {
    ensureTheory(d);
    return d;
  });
  const d = db.readDb();
  return (d.theory.attempts || []).filter((a) => a.studentId === studentId);
}

module.exports = {
  listQuestionsForExam,
  submitExam,
  listAttempts,
  ensureTheory,
};
