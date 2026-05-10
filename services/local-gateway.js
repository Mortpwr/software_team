const profile = require('../repositories/profile.repository');
const knowledge = require('../repositories/knowledge.repository');
const party = require('../repositories/party.repository');
const notices = require('../repositories/notices.repository');
const honors = require('../repositories/honors.repository');
const applications = require('../repositories/applications.repository');
const messages = require('../repositories/messages.repository');
const academic = require('../repositories/academic.repository');
const audit = require('../repositories/audit.repository');
const league = require('../repositories/league.repository');
const theory = require('../repositories/theory.repository');
const leaderRepo = require('../repositories/leader.repository');
const db = require('../core/db');
const approval = require('../constants/approval');
const roles = require('../constants/roles');

/**
 * @typedef {{ studentId:string, role:string, token?:string }} SessionCtx
 */

function parsePath(path) {
  const p = path.replace(/^\//, '');
  return p.split('/').filter(Boolean);
}

function workbenchReader(ctx) {
  return ctx.role === roles.TEACHER || ctx.role === roles.LEADER || ctx.role === roles.COORDINATOR;
}

function assertOwnerOrTeacher(ctx, app) {
  if (!app) throw new Error('NOT_FOUND');
  if (app.studentId === ctx.studentId) return;
  if (ctx.role === roles.TEACHER || ctx.role === roles.LEADER) return;
  throw new Error('FORBIDDEN');
}

/**
 * @param {{ method:string, path:string, data:any, session:SessionCtx }} opt
 */
async function dispatch(opt) {
  const method = (opt.method || 'GET').toUpperCase();
  const parts = parsePath(opt.path);
  const data = opt.data || {};
  const ctx = opt.session || { studentId: '', role: roles.STUDENT };

  if (parts[0] === 'student' && parts[1] === 'me' && method === 'GET') {
    return profile.getMe({ studentId: ctx.studentId, role: ctx.role });
  }

  if (parts[0] === 'knowledge' && parts.length === 1 && method === 'GET') {
    return knowledge.list({ q: data.q || data.keyword, category: data.category });
  }

  if (parts[0] === 'knowledge' && parts[1] === 'miss' && method === 'POST') {
    return knowledge.recordMiss({ keyword: data.keyword, studentId: ctx.studentId });
  }

  if (parts[0] === 'knowledge' && parts[1] === 'favorites' && method === 'GET') {
    return { list: knowledge.listFavorites(ctx.studentId) };
  }

  if (parts[0] === 'knowledge' && parts[1] === 'recent' && method === 'GET') {
    return { list: knowledge.listRecent(ctx.studentId) };
  }

  if (parts[0] === 'knowledge' && parts[1] === 'trending' && method === 'GET') {
    return { list: knowledge.trending(data.limit || 15) };
  }

  if (parts[0] === 'knowledge' && parts[1] && parts[2] === 'favorite' && method === 'POST') {
    return knowledge.toggleFavoriteResolved(ctx.studentId, parts[1]);
  }

  if (parts[0] === 'knowledge' && parts[1] && parts.length === 2 && method === 'GET') {
    const item = knowledge.getById(parts[1]);
    if (!item) throw new Error('NOT_FOUND');
    knowledge.recordHit(parts[1]);
    if (ctx.studentId) knowledge.recordRecent(ctx.studentId, parts[1]);
    const d = db.readDb();
    const fav = (d.favoriteByStudent && d.favoriteByStudent[ctx.studentId]) || [];
    const favorited = !!(ctx.studentId && fav.indexOf(parts[1]) >= 0);
    return { ...item, favorited };
  }

  if (parts[0] === 'party' && parts[1] === 'progress' && method === 'GET') {
    return party.getProgress(ctx.studentId);
  }

  if (
    parts[0] === 'party' &&
    parts[1] === 'tasks' &&
    parts[3] === 'done' &&
    method === 'POST'
  ) {
    return party.completeTask(ctx.studentId, parts[2]);
  }

  if (parts[0] === 'league' && parts[1] === 'progress' && method === 'GET') {
    return league.getProgress(ctx.studentId);
  }

  if (
    parts[0] === 'league' &&
    parts[1] === 'tasks' &&
    parts[3] === 'done' &&
    method === 'POST'
  ) {
    return league.completeTask(ctx.studentId, parts[2]);
  }

  if (parts[0] === 'notices' && parts.length === 1 && method === 'GET') {
    return { list: notices.listNotices() };
  }

  if (parts[0] === 'notices' && parts[1] && method === 'GET') {
    const n = notices.getNotice(parts[1]);
    if (!n) throw new Error('NOT_FOUND');
    return n;
  }

  if (parts[0] === 'honors' && parts.length === 1 && method === 'GET') {
    return { list: honors.list(data) };
  }

  if (parts[0] === 'applications' && parts.length === 1 && method === 'GET') {
    if (data.scope === 'workbench' && (ctx.role === roles.TEACHER || ctx.role === roles.LEADER)) {
      return { list: applications.listAll({ status: data.status }) };
    }
    return { list: applications.listForStudent(ctx.studentId) };
  }

  if (parts[0] === 'applications' && parts[1] === 'draft' && method === 'GET') {
    return applications.getDraft(ctx.studentId);
  }

  if (parts[0] === 'applications' && parts[1] === 'draft' && method === 'POST') {
    return applications.saveDraft(ctx.studentId, data);
  }

  if (parts[0] === 'applications' && parts.length === 1 && method === 'POST') {
    const created = applications.createApp({
      studentId: ctx.studentId,
      type: data.type,
      subtype: data.subtype,
      form: data.form,
      attachments: data.attachments,
      remark: data.remark,
    });
    applications.clearDraft(ctx.studentId);
    return created;
  }

  if (parts[0] === 'applications' && parts[1] && method === 'GET') {
    const app = applications.getById(parts[1]);
    assertOwnerOrTeacher(ctx, app);
    return app;
  }

  if (parts[0] === 'messages' && parts[1] === 'inbox' && method === 'GET') {
    return { list: messages.inbox(ctx.studentId), unread: messages.unreadCount(ctx.studentId) };
  }

  if (parts[0] === 'messages' && parts[1] && parts[2] === 'read' && method === 'POST') {
    return messages.markRead(ctx.studentId, parts[1]);
  }

  if (parts[0] === 'academic' && parts[1] === 'report' && method === 'GET') {
    return academic.report(ctx.studentId);
  }

  if (parts[0] === 'academic' && parts[1] === 'plan' && method === 'GET') {
    return { plan: academic.getPlan(ctx.studentId), progress: academic.getProgress(ctx.studentId) };
  }

  if (parts[0] === 'academic' && parts[1] === 'progress' && method === 'PUT') {
    return academic.putProgress(ctx.studentId, data.modules || [], {
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }

  if (parts[0] === 'academic' && parts[1] === 'transcript' && method === 'POST') {
    return academic.attachTranscriptMeta(ctx.studentId, data.meta || {}, {
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }

  if (parts[0] === 'meta' && parts[1] === 'unread' && method === 'GET') {
    return { unread: messages.unreadCount(ctx.studentId) };
  }

  if (parts[0] === 'theory' && parts[1] === 'questions' && method === 'GET') {
    return { list: theory.listQuestionsForExam() };
  }

  if (parts[0] === 'theory' && parts[1] === 'submit' && method === 'POST') {
    return theory.submitExam(ctx.studentId, data.answers || data.answerMap || {});
  }

  if (parts[0] === 'theory' && parts[1] === 'attempts' && method === 'GET') {
    return { list: theory.listAttempts(ctx.studentId) };
  }

  if (parts[0] === 'leader' && parts[1] === 'dashboard' && method === 'GET') {
    if (ctx.role !== roles.LEADER) throw new Error('FORBIDDEN');
    return leaderRepo.dashboard();
  }

  if (parts[0] === 'danger' && parts[1] === 'reset-db' && method === 'POST') {
    db.resetDb();
    audit.append({ actorId: ctx.studentId, role: ctx.role, action: 'db_reset', target: 'local' });
    return { ok: true };
  }

  if (parts[0] === 'workbench' && parts[1] === 'summary' && method === 'GET') {
    if (!workbenchReader(ctx)) throw new Error('FORBIDDEN');
    const d = db.readDb();
    return {
      students: d.students.length,
      pendingApps: d.applications.filter((a) => a.status === approval.PENDING).length,
      miss: knowledge.listMisses().length,
      batches: (d.batches || []).length,
      sms: (d.smsSimulation || []).length,
    };
  }

  if (parts[0] === 'workbench' && parts[1] === 'students' && method === 'GET') {
    if (!workbenchReader(ctx)) throw new Error('FORBIDDEN');
    return { list: profile.listStudents() };
  }

  if (parts[0] === 'workbench' && parts[1] === 'knowledge' && parts[2] === 'misses' && method === 'GET') {
    if (!workbenchReader(ctx)) throw new Error('FORBIDDEN');
    return { list: knowledge.listMisses() };
  }

  if (parts[0] === 'workbench' && parts[1] === 'batches' && method === 'GET') {
    if (!workbenchReader(ctx)) throw new Error('FORBIDDEN');
    return { list: notices.listBatches() };
  }

  if (parts[0] === 'workbench' && parts[1] === 'sms' && method === 'GET') {
    if (!workbenchReader(ctx)) throw new Error('FORBIDDEN');
    const d = db.readDb();
    return { list: d.smsSimulation || [] };
  }

  if (parts[0] === 'workbench' && parts[1] === 'notices' && parts[2] === 'publish' && method === 'POST') {
    if (ctx.role !== roles.TEACHER && ctx.role !== roles.COORDINATOR) throw new Error('FORBIDDEN');
    return notices.publish({ payload: data, actorId: ctx.studentId, role: ctx.role });
  }

  if (parts[0] === 'workbench' && parts[1] === 'party' && parts[2] === 'advance' && method === 'POST') {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return party.advanceStage({
      studentId: data.studentId,
      nextKey: data.nextKey,
      remark: data.remark,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }

  if (parts[0] === 'workbench' && parts[1] === 'league' && parts[2] === 'advance' && method === 'POST') {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return league.advanceStage({
      studentId: data.studentId,
      nextKey: data.nextKey,
      remark: data.remark,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }

  if (
    parts[0] === 'workbench' &&
    parts[1] === 'applications' &&
    parts[2] &&
    parts[3] === 'approve' &&
    method === 'POST'
  ) {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return applications.approve(parts[2], {
      comment: data.comment,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }
  if (
    parts[0] === 'workbench' &&
    parts[1] === 'applications' &&
    parts[2] &&
    parts[3] === 'reject' &&
    method === 'POST'
  ) {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return applications.reject(parts[2], {
      reason: data.reason,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }
  if (
    parts[0] === 'workbench' &&
    parts[1] === 'applications' &&
    parts[2] &&
    parts[3] === 'revoke' &&
    method === 'POST'
  ) {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return applications.revoke(parts[2], {
      reason: data.reason,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }
  if (
    parts[0] === 'workbench' &&
    parts[1] === 'applications' &&
    parts[2] &&
    parts[3] === 'reapprove' &&
    method === 'POST'
  ) {
    if (ctx.role !== roles.TEACHER) throw new Error('FORBIDDEN');
    return applications.reapprove(parts[2], {
      comment: data.comment,
      newStatus: data.newStatus,
      actorId: ctx.studentId,
      role: ctx.role,
    });
  }

  if (parts[0] === 'audit' && parts[1] === 'logs' && method === 'GET') {
    if (ctx.role !== roles.TEACHER && ctx.role !== roles.LEADER) throw new Error('FORBIDDEN');
    return { list: audit.list({ limit: data.limit || 120 }) };
  }

  throw new Error(`ROUTE_NOT_FOUND:${parts.join('/')}`);
}

function handle(opt) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(dispatch(opt));
      } catch (e) {
        reject(e);
      }
    }, 20);
  });
}

module.exports = { dispatch, handle, parsePath };
