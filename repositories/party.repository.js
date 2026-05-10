const db = require('../core/db');
const audit = require('./audit.repository');
const roles = require('../constants/roles');

function getProgress(studentId) {
  const d = db.readDb();
  const flow = d.partyFlow;
  const prog = d.partyByStudent[studentId];
  if (!prog) return null;
  return { flowName: '发展党员流程（配置可后台维护）', stages: flow.stages, ...prog };
}

function completeTask(studentId, taskId) {
  db.withDb((d) => {
    const p = d.partyByStudent[studentId];
    if (!p || !p.tasks) return d;
    const t = p.tasks.find((x) => x.id === taskId);
    if (t) t.done = true;
    return d;
  });
  audit.append({
    actorId: studentId,
    role: 'student',
    action: 'party_task_done',
    target: taskId,
  });
  return { ok: true };
}

function advanceStage({ studentId, nextKey, remark, actorId, role }) {
  if (role !== roles.TEACHER) throw new Error('FORBIDDEN');
  db.withDb((d) => {
    const flow = d.partyFlow;
    const p = d.partyByStudent[studentId];
    if (!p) return d;
    const prev = p.currentKey;
    p.history = p.history || [];
    p.history.push({
      stageKey: prev,
      at: Date.now(),
      remark: remark || '阶段推进（工作台演示）',
    });
    p.currentKey = nextKey;
    const cur = flow.stages.find((s) => s.key === nextKey);
    const order = cur ? cur.order : 999;
    p.tasks = (flow.rules || [])
      .filter((r) => r.stageKey === nextKey)
      .map((r) => ({
        id: `task_${studentId}_${r.id}_${Date.now()}`,
        ruleId: r.id,
        title: r.title,
        body: r.body,
        dueAt: Date.now() + r.afterDays * 86400000,
        done: false,
      }));
    return d;
  });
  audit.append({
    actorId: actorId || 'teacher',
    role: role || 'teacher',
    action: 'party_advance',
    target: `${studentId}->${nextKey}`,
  });
  return { ok: true };
}

module.exports = { getProgress, completeTask, advanceStage };
