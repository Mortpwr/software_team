const db = require('../core/db');
const audit = require('./audit.repository');

function planKey(studentId) {
  const d = db.readDb();
  const s = d.students.find((x) => x.studentId === studentId);
  if (!s) return null;
  return `${s.grade}|${s.major}`;
}

function getPlan(studentId) {
  const d = db.readDb();
  const key = planKey(studentId);
  if (!key) return null;
  return d.academic.plansByKey[key] || null;
}

function getProgress(studentId) {
  const d = db.readDb();
  return d.academic.progressByStudent[studentId] || null;
}

function putProgress(studentId, modules, { actorId, role }) {
  db.withDb((d) => {
    d.academic.progressByStudent[studentId] = d.academic.progressByStudent[studentId] || { modules: [], uploads: [] };
    d.academic.progressByStudent[studentId].modules = modules;
    return d;
  });
  audit.append({
    actorId,
    role,
    action: 'academic_progress_put',
    target: studentId,
  });
  return { ok: true };
}

function report(studentId) {
  const plan = getPlan(studentId);
  const prog = getProgress(studentId);
  if (!plan || !prog) {
    return { ok: false, message: '缺少培养方案或进度，请先在学业中心维护。' };
  }
  const gaps = [];
  plan.modules.forEach((m) => {
    const got = prog.modules.find((x) => x.key === m.key);
    const earned = got ? Number(got.earned || 0) : 0;
    const gap = Math.max(0, Number(m.required) - earned);
    gaps.push({
      key: m.key,
      name: m.name,
      required: m.required,
      earned,
      gap,
      risk: gap >= 4 ? '高' : gap >= 2 ? '中' : '低',
    });
  });
  const suggestions = gaps
    .filter((g) => g.gap > 0)
    .map((g) => ({
      focus: g.name,
      hint: `仍需修读约 ${g.gap} 学分，请关注本学期开设的 ${g.name} 相关课程（规则推荐，非选课引擎）。`,
    }));
  const riskLevel = gaps.some((g) => g.risk === '高') ? '高' : gaps.some((g) => g.risk === '中') ? '中' : '低';
  return {
    ok: true,
    modules: gaps,
    suggestions,
    riskLevel,
    uploads: prog.uploads || [],
  };
}

function attachTranscriptMeta(studentId, meta, { actorId, role }) {
  db.withDb((d) => {
    const p = d.academic.progressByStudent[studentId] || { modules: [], uploads: [] };
    p.uploads = p.uploads || [];
    p.uploads.unshift({ ...meta, at: Date.now() });
    d.academic.progressByStudent[studentId] = p;
    return d;
  });
  audit.append({
    actorId,
    role,
    action: 'academic_transcript_meta',
    target: studentId,
    detail: meta,
  });
  return { ok: true };
}

module.exports = { getPlan, getProgress, putProgress, report, attachTranscriptMeta };
