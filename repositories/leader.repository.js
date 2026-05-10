const db = require('../core/db');
const KEYS = require('../core/keys');
const approval = require('../constants/approval');
const knowledge = require('./knowledge.repository');

function academicRiskCount() {
  const d = db.readDb();
  let high = 0;
  (d.students || []).forEach((s) => {
    const key = `${s.grade}|${s.major}`;
    const plan = d.academic.plansByKey[key];
    const prog = d.academic.progressByStudent[s.studentId];
    if (!plan || !prog) return;
    let bad = false;
    plan.modules.forEach((m) => {
      const g = (prog.modules || []).find((x) => x.key === m.key);
      const earned = g ? Number(g.earned || 0) : 0;
      if (m.required - earned >= 4) bad = true;
    });
    if (bad) high += 1;
  });
  return high;
}

function dashboard() {
  const d = db.readDb();
  const apps = d.applications || [];
  const byStatus = {};
  apps.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  });
  const missTop = knowledge.listMisses().slice(0, 5);
  return {
    students: (d.students || []).length,
    knowledgeCount: (d.knowledge || []).length,
    noticeCount: (d.notices || []).length,
    pendingApps: apps.filter((a) => a.status === approval.PENDING).length,
    applicationsByStatus: byStatus,
    missKeywordsTop: missTop,
    academicHighRiskStudents: academicRiskCount(),
    batches: (d.batches || []).length,
    lastReset: wx.getStorageSync(KEYS.BOOTSTRAP_META),
  };
}

module.exports = { dashboard, academicRiskCount };
