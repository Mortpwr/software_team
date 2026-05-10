const db = require('../core/db');
const audit = require('./audit.repository');
const roles = require('../constants/roles');

function getProgress(studentId) {
  const d = db.readDb();
  const flow = d.leagueFlow;
  const prog = d.leagueByStudent && d.leagueByStudent[studentId];
  if (!prog || !flow) return null;
  return { flowName: '共青团员发展流程（配置可维护）', stages: flow.stages, ...prog };
}

function completeTask(studentId, taskId) {
  db.withDb((d) => {
    const p = d.leagueByStudent[studentId];
    if (!p || !p.tasks) return d;
    const t = p.tasks.find((x) => x.id === taskId);
    if (t) t.done = true;
    return d;
  });
  audit.append({ actorId: studentId, role: 'student', action: 'league_task_done', target: taskId });
  return { ok: true };
}

function advanceStage({ studentId, nextKey, remark, actorId, role }) {
  if (role !== roles.TEACHER) throw new Error('FORBIDDEN');
  db.withDb((d) => {
    const flow = d.leagueFlow;
    const p = d.leagueByStudent[studentId];
    if (!p || !flow) return d;
    const prev = p.currentKey;
    p.history = p.history || [];
    p.history.push({
      stageKey: prev,
      at: Date.now(),
      remark: remark || '入团阶段调整',
    });
    p.currentKey = nextKey;
    p.tasks = (flow.rules || [])
      .filter((r) => r.stageKey === nextKey)
      .map((r) => ({
        id: `lt_${studentId}_${r.id}_${Date.now()}`,
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
    action: 'league_advance',
    target: `${studentId}->${nextKey}`,
  });
  return { ok: true };
}

module.exports = { getProgress, completeTask, advanceStage };
