const approval = require('../constants/approval');
const db = require('../core/db');
const { uid } = require('../utils/id');
const audit = require('./audit.repository');

const WINDOW_MS = 48 * 3600000;

function listForStudent(studentId) {
  const d = db.readDb();
  return d.applications.filter((a) => a.studentId === studentId).sort((x, y) => y.createdAt - x.createdAt);
}

function listAll({ status } = {}) {
  const d = db.readDb();
  let apps = d.applications.slice();
  if (status && status !== '全部') apps = apps.filter((a) => a.status === status);
  return apps.sort((x, y) => y.createdAt - x.createdAt);
}

function getById(id) {
  const d = db.readDb();
  return d.applications.find((a) => a.id === id) || null;
}

function pushTrail(app, actor, action, remark) {
  app.auditTrail = app.auditTrail || [];
  app.auditTrail.push({ at: Date.now(), actor, action, remark: remark || '' });
}

function createApp(payload) {
  const id = uid('app');
  const app = {
    id,
    studentId: payload.studentId,
    type: payload.type,
    subtype: payload.subtype || '',
    status: approval.PENDING,
    createdAt: Date.now(),
    form: payload.form || {},
    attachments: payload.attachments || [],
    teacherComment: '',
    decidedAt: null,
    auditTrail: [],
  };
  pushTrail(app, '学生', '提交', payload.remark || '');
  pushTrail(app, '系统', '进入审批队列', '');
  db.withDb((d) => {
    d.applications.unshift(app);
    return d;
  });
  audit.append({
    actorId: payload.studentId,
    role: 'student',
    action: 'application_create',
    target: id,
    detail: { type: app.type },
  });
  return app;
}

function assertTeacher(actor) {
  if (!actor || actor.role !== 'teacher') {
    throw new Error('FORBIDDEN');
  }
}

function withinWindow(app) {
  if (!app.decidedAt) return false;
  return Date.now() - app.decidedAt <= WINDOW_MS;
}

function approve(id, { comment, actorId, role }) {
  assertTeacher({ role });
  db.withDb((d) => {
    const app = d.applications.find((a) => a.id === id);
    if (!app || app.status !== approval.PENDING) throw new Error('INVALID_STATE');
    app.status = approval.APPROVED;
    app.teacherComment = comment || '同意。';
    app.decidedAt = Date.now();
    pushTrail(app, '管理老师', '通过', app.teacherComment);
    return d;
  });
  audit.append({ actorId, role, action: 'application_approve', target: id });
  return getById(id);
}

function reject(id, { reason, actorId, role }) {
  assertTeacher({ role });
  db.withDb((d) => {
    const app = d.applications.find((a) => a.id === id);
    if (!app || app.status !== approval.PENDING) throw new Error('INVALID_STATE');
    app.status = approval.REJECTED;
    app.teacherComment = reason || '驳回。';
    app.decidedAt = Date.now();
    pushTrail(app, '管理老师', '驳回', app.teacherComment);
    return d;
  });
  audit.append({ actorId, role, action: 'application_reject', target: id });
  return getById(id);
}

function revoke(id, { reason, actorId, role }) {
  assertTeacher({ role });
  db.withDb((d) => {
    const app = d.applications.find((a) => a.id === id);
    if (!app) throw new Error('NOT_FOUND');
    if (app.status !== approval.APPROVED && app.status !== approval.REJECTED) throw new Error('INVALID_STATE');
    if (!withinWindow(app)) throw new Error('WINDOW_CLOSED');
    app.status = approval.REVOKED;
    pushTrail(app, '管理老师', '撤回结论', reason || '');
    return d;
  });
  audit.append({ actorId, role, action: 'application_revoke', target: id, detail: { reason } });
  return getById(id);
}

function reapprove(id, { comment, newStatus, actorId, role }) {
  assertTeacher({ role });
  db.withDb((d) => {
    const app = d.applications.find((a) => a.id === id);
    if (!app) throw new Error('NOT_FOUND');
    if (app.status !== approval.APPROVED && app.status !== approval.REJECTED) throw new Error('INVALID_STATE');
    if (!withinWindow(app)) throw new Error('WINDOW_CLOSED');
    app.status = approval.RE_APPROVED;
    app.teacherComment = comment || '重批说明';
    app.decidedAt = Date.now();
    pushTrail(app, '管理老师', `重批:${newStatus || '调整结论'}`, app.teacherComment);
    return d;
  });
  audit.append({ actorId, role, action: 'application_reapprove', target: id });
  return getById(id);
}

module.exports = {
  listForStudent,
  listAll,
  getById,
  createApp,
  approve,
  reject,
  revoke,
  reapprove,
  withinWindow,
};
