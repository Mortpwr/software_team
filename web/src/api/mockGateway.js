import { APPROVAL, FLOW_STAGES, ROLES } from "../data/seed.js";
import { maskPhone, rank, uid } from "../utils.js";
import { readDb, readMeta, resetDb, withDb } from "./store.js";

const WINDOW_MS = 48 * 3600000;

export async function mockRequest({ path, method = "GET", data = {}, session }) {
  const verb = method.toUpperCase();
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  await new Promise((resolve) => setTimeout(resolve, 60));

  if (parts[0] === "student" && parts[1] === "me") return getMe(session);
  if (parts[0] === "students") return { list: readDb().students.map((s) => publicStudent(s, ROLES.TEACHER)) };

  if (parts[0] === "knowledge" && parts.length === 1 && verb === "GET") return knowledgeList(data);
  if (parts[0] === "knowledge" && parts.length === 1 && verb === "POST") return createKnowledge(data, session);
  if (parts[0] === "knowledge" && parts[1] === "admin" && parts[2] === "list") return knowledgeAdminList(session);
  if (parts[0] === "knowledge" && parts[1] === "miss" && verb === "POST") return recordMiss(data.keyword, session);
  if (parts[0] === "knowledge" && parts[2] === "online" && verb === "POST") return setKnowledgeOnline(parts[1], data, session);
  if (parts[0] === "knowledge" && parts[1] && verb === "PUT") return updateKnowledge(parts[1], data, session);
  if (parts[0] === "knowledge" && parts[1]) return knowledgeDetail(parts[1], session);

  if (parts[0] === "files" && parts[1] === "upload" && verb === "POST") return uploadFileMeta(data, session);

  if (parts[0] === "party" && parts[1] === "progress") return partyProgress(session.studentId);
  if (parts[0] === "party" && parts[1] === "tasks" && parts[3] === "done" && verb === "POST") return completePartyTask(session.studentId, parts[2]);

  if (parts[0] === "notices" && parts.length === 1) return { list: readDb().notices.slice().sort((a, b) => b.publishedAt - a.publishedAt) };
  if (parts[0] === "notices" && parts[1]) return readDb().notices.find((n) => n.id === parts[1]);
  if (parts[0] === "messages" && parts[1] === "inbox") return inbox(session.studentId);
  if (parts[0] === "messages" && parts[2] === "read" && verb === "POST") return markRead(session.studentId, parts[1]);

  if (parts[0] === "applications" && parts.length === 1 && verb === "GET") return applicationsList(data, session);
  if (parts[0] === "applications" && parts.length === 1 && verb === "POST") return createApplication(data, session);
  if (parts[0] === "applications" && parts[1] === "draft" && verb === "GET") return readDb().applicationDraftsByStudent?.[session.studentId] || null;
  if (parts[0] === "applications" && parts[1] === "draft" && verb === "POST") return saveDraft(data, session);
  if (parts[0] === "applications" && parts[2] === "submit" && verb === "POST") return submitExistingApplication(parts[1], data, session);
  if (parts[0] === "applications" && parts[1]) return applicationDetail(parts[1], session);

  if (parts[0] === "honors" && parts.length === 1 && verb === "GET") return honors(data);
  if (parts[0] === "honors" && parts.length === 1 && verb === "POST") return createHonor(data, session);
  if (parts[0] === "honors" && parts[1] && verb === "PUT") return updateHonor(parts[1], data, session);
  if (parts[0] === "academic" && parts[1] === "report") return academicReport(session.studentId);
  if (parts[0] === "academic" && parts[1] === "plan") return academicPlan(session.studentId);
  if (parts[0] === "academic" && parts[1] === "progress" && verb === "PUT") return saveAcademicProgress(data, session);
  if (parts[0] === "academic" && parts[1] === "transcript" && verb === "POST") return saveTranscript(data, session);

  if (parts[0] === "workbench" && parts[1] === "summary") return workbenchSummary(session);
  if (parts[0] === "workbench" && parts[1] === "knowledge" && parts[2] === "misses") return { list: readDb().missKeywords.sort((a, b) => b.count - a.count) };
  if (parts[0] === "workbench" && parts[1] === "notices" && parts[2] === "publish" && verb === "POST") return publishNotice(data, session);
  if (parts[0] === "workbench" && parts[1] === "batches") return { list: batchesWithReadStats() };
  if (parts[0] === "workbench" && parts[1] === "sms") return { list: readDb().smsSimulation };
  if (parts[0] === "workbench" && parts[1] === "party" && parts[2] === "advance" && verb === "POST") return advanceParty(data, session);
  if (parts[0] === "workbench" && parts[1] === "applications" && parts[2]) return decideApplication(parts[2], parts[3], data, session);

  if (parts[0] === "leader" && parts[1] === "dashboard") return leaderDashboard(session);
  if (parts[0] === "audit" && parts[1] === "logs") return { list: readDb().auditLogs.slice(0, data.limit || 200) };
  if (parts[0] === "danger" && parts[1] === "reset-db" && verb === "POST") return resetDb();

  throw new Error(`ROUTE_NOT_FOUND:${path}`);
}

function getMe(session) {
  const db = readDb();
  const student = db.students.find((s) => s.studentId === session.studentId);
  return student ? publicStudent(student, session.role) : null;
}

function publicStudent(s, role) {
  const base = {
    studentId: s.studentId,
    name: s.name,
    grade: s.grade,
    major: s.major,
    className: s.className,
    nation: s.nation,
    politicalStatus: s.politicalStatus,
    tutor: s.tutor,
    extension: s.extension,
  };
  if (role === ROLES.TEACHER) return { ...base, phone: s.phone, phoneMasked: maskPhone(s.phone), hometown: s.hometown, idCardMasked: "**************" };
  if (role === ROLES.LEADER) return { ...base, phoneMasked: maskPhone(s.phone), hometown: s.hometown?.slice(0, 1) + "**" };
  return { ...base, phoneMasked: maskPhone(s.phone) };
}

function knowledgeList({ q, category }) {
  const db = readDb();
  const categories = ["全部", ...new Set(db.knowledge.map((k) => k.category))];
  let list = db.knowledge.filter((k) => k.online !== false);
  if (category && category !== "全部") list = list.filter((k) => k.category === category);
  list = q ? rank(q, list, (k) => [k.title, k.category, k.summary, k.body, (k.tags || []).join(",")]) : list;
  return { list, categories, templates: db.templates };
}

function requireTeacher(session) {
  if (session.role !== ROLES.TEACHER) throw new Error("FORBIDDEN");
}

function knowledgePayload(data) {
  return {
    title: data.title,
    category: data.category || "未分类",
    tags: data.tags || [],
    summary: data.summary || "",
    body: data.body || "",
    sensitiveHint: Boolean(data.sensitiveHint),
    online: data.online !== false,
  };
}

function knowledgeAdminList(session) {
  if (![ROLES.TEACHER, ROLES.LEADER].includes(session.role)) throw new Error("FORBIDDEN");
  return { list: readDb().knowledge.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) };
}

function createKnowledge(data, session) {
  requireTeacher(session);
  let row;
  withDb((db) => {
    row = {
      id: uid("k"),
      ...knowledgePayload(data),
      attachments: data.attachments || [],
      hitCount: 0,
      updatedAt: Date.now(),
    };
    db.knowledge.unshift(row);
    appendAudit(db, session, "knowledge_create", row.id);
  });
  return row;
}

function updateKnowledge(id, data, session) {
  requireTeacher(session);
  let row;
  withDb((db) => {
    row = db.knowledge.find((item) => item.id === id);
    if (!row) throw new Error("NOT_FOUND");
    Object.assign(row, knowledgePayload(data), { updatedAt: Date.now() });
    appendAudit(db, session, "knowledge_update", id);
  });
  return row;
}

function setKnowledgeOnline(id, data, session) {
  requireTeacher(session);
  let row;
  withDb((db) => {
    row = db.knowledge.find((item) => item.id === id);
    if (!row) throw new Error("NOT_FOUND");
    row.online = data.online;
    row.updatedAt = Date.now();
    appendAudit(db, session, data.online ? "knowledge_online" : "knowledge_offline", id);
  });
  return row;
}

function recordMiss(keyword, session) {
  const k = (keyword || "").trim();
  if (!k) return { ok: false };
  withDb((db) => {
    const found = db.missKeywords.find((x) => x.keyword === k);
    if (found) {
      found.count += 1;
      found.lastAt = Date.now();
    } else {
      db.missKeywords.unshift({ id: uid("miss"), keyword: k, count: 1, lastAt: Date.now() });
    }
    appendAudit(db, session, "knowledge_miss", k);
  });
  return { ok: true };
}

function knowledgeDetail(id, session) {
  let item;
  withDb((db) => {
    item = db.knowledge.find((k) => k.id === id);
    if (item) item.hitCount = (item.hitCount || 0) + 1;
    appendAudit(db, session, "knowledge_read", id);
  });
  return item;
}

function uploadFileMeta(data, session) {
  const file = typeof FormData !== "undefined" && data instanceof FormData ? data.get("file") : null;
  const business = typeof FormData !== "undefined" && data instanceof FormData ? data.get("business") : "general";
  const meta = {
    id: uid("file"),
    name: file?.name || "mock-file",
    size: file?.size || 0,
    contentType: file?.type || "application/octet-stream",
    business,
    url: "",
    uploadedAt: Date.now(),
  };
  withDb((db) => appendAudit(db, session, "file_upload", meta.id));
  return meta;
}

function partyProgress(studentId) {
  const db = readDb();
  return { flowName: "入党流程", stages: FLOW_STAGES, ...db.partyByStudent[studentId] };
}

function completePartyTask(studentId, taskId) {
  withDb((db) => {
    const progress = db.partyByStudent[studentId];
    const task = progress?.tasks.find((t) => t.id === taskId);
    if (task) task.done = true;
  });
  return { ok: true };
}

function inbox(studentId) {
  const list = readDb().inboxByStudent[studentId] || [];
  return { list: list.slice().sort((a, b) => b.createdAt - a.createdAt), unread: list.filter((m) => !m.readAt).length };
}

function markRead(studentId, id) {
  withDb((db) => {
    const msg = (db.inboxByStudent[studentId] || []).find((m) => m.id === id);
    if (msg && !msg.readAt) msg.readAt = Date.now();
  });
  return { ok: true };
}

function batchesWithReadStats() {
  const db = readDb();
  const messages = Object.values(db.inboxByStudent || {}).flat();
  return db.batches.map((batch) => {
    const read = messages.filter((item) => item.batchId === batch.id && item.readAt).length;
    return {
      ...batch,
      channels: (batch.channels || []).map((channel) => (channel.name === "站内" ? { ...channel, read } : channel)),
    };
  });
}

function applicationsList(data, session) {
  const db = readDb();
  let list = data.scope === "workbench" && [ROLES.TEACHER, ROLES.LEADER, ROLES.COORDINATOR].includes(session.role)
    ? db.applications.slice()
    : db.applications.filter((a) => a.studentId === session.studentId);
  if (data.scope === "workbench" && session.role === ROLES.COORDINATOR) {
    const me = db.students.find((s) => s.studentId === session.studentId);
    const classIds = db.students.filter((s) => s.className === me?.className).map((s) => s.studentId);
    list = list.filter((a) => classIds.includes(a.studentId));
  }
  const draft = db.applicationDraftsByStudent?.[session.studentId];
  if (draft && data.scope !== "workbench") list = [draft, ...list];
  if (data.status) list = list.filter((a) => a.status === data.status);
  return { list: list.sort((a, b) => b.createdAt - a.createdAt) };
}

function createApplication(data, session) {
  const created = {
    id: uid("app"),
    studentId: session.studentId,
    type: data.type,
    subtype: data.subtype,
    status: APPROVAL.PENDING,
    createdAt: Date.now(),
    form: data.form || {},
    attachments: data.attachments || [],
    teacherComment: "",
    decidedAt: null,
    auditTrail: [
      { at: Date.now(), actor: "学生", action: "提交", remark: data.remark || "" },
      { at: Date.now() + 500, actor: "系统", action: "进入审批队列", remark: "" },
    ],
  };
  withDb((db) => {
    db.applications.unshift(created);
    db.applicationDraftsByStudent = db.applicationDraftsByStudent || {};
    delete db.applicationDraftsByStudent[session.studentId];
    appendAudit(db, session, "application_create", created.id);
  });
  return created;
}

function saveDraft(data, session) {
  let draft;
  withDb((db) => {
    db.applicationDraftsByStudent = db.applicationDraftsByStudent || {};
    const previous = db.applicationDraftsByStudent[session.studentId] || {};
    draft = {
      id: previous.id || uid("draft"),
      studentId: session.studentId,
      type: data.type,
      subtype: data.subtype,
      status: APPROVAL.DRAFT,
      createdAt: previous.createdAt || Date.now(),
      updatedAt: Date.now(),
      form: data.form || {},
      attachments: data.attachments || [],
      teacherComment: "",
      decidedAt: null,
      auditTrail: [
        ...(previous.auditTrail || []),
        { at: Date.now(), actor: "学生", action: "保存草稿", remark: data.remark || "" },
      ],
    };
    db.applicationDraftsByStudent[session.studentId] = draft;
    appendAudit(db, session, "application_draft_save", session.studentId);
  });
  return draft;
}

function submitExistingApplication(id, data, session) {
  let result;
  withDb((db) => {
    const draft = db.applicationDraftsByStudent?.[session.studentId];
    let app = db.applications.find((a) => a.id === id);
    if (!app && draft?.id === id) {
      app = { ...draft };
      db.applications.unshift(app);
      delete db.applicationDraftsByStudent[session.studentId];
    }
    if (!app || app.studentId !== session.studentId) throw new Error("NOT_FOUND");
    if (![APPROVAL.DRAFT, APPROVAL.REJECTED].includes(app.status)) throw new Error("INVALID_STATE");
    if (data.type === "盖章申请" && !(data.attachments || []).length) throw new Error("SEAL_ATTACHMENT_REQUIRED");
    const wasRejected = app.status === APPROVAL.REJECTED;
    Object.assign(app, {
      type: data.type,
      subtype: data.subtype,
      status: APPROVAL.PENDING,
      form: data.form || {},
      attachments: data.attachments || [],
      teacherComment: "",
      decidedAt: null,
      auditTrail: [
        ...(app.auditTrail || []),
        { at: Date.now(), actor: "学生", action: wasRejected ? "重提" : "已提交", remark: data.remark || "" },
        { at: Date.now() + 500, actor: "系统", action: "进入审批队列", remark: "" },
      ],
    });
    appendAudit(db, session, wasRejected ? "application_resubmit" : "application_submit", id);
    result = app;
  });
  return result;
}

function applicationDetail(id, session) {
  const app = readDb().applications.find((a) => a.id === id);
  if (!app) throw new Error("NOT_FOUND");
  if (app.studentId !== session.studentId && ![ROLES.TEACHER, ROLES.LEADER, ROLES.COORDINATOR].includes(session.role)) throw new Error("FORBIDDEN");
  return app;
}

function honors(data) {
  let list = readDb().honors.slice();
  if (data.year) list = list.filter((h) => String(h.year) === String(data.year));
  if (data.category) list = list.filter((h) => h.category === data.category);
  if (data.major) list = list.filter((h) => h.major.includes(data.major));
  return { list };
}

function honorPayload(data) {
  return {
    title: data.title,
    winner: data.winner,
    year: Number(data.year),
    major: data.major || "",
    grade: data.grade || "",
    category: data.category || "",
    intro: data.intro || "",
  };
}

function createHonor(data, session) {
  requireTeacher(session);
  let row;
  withDb((db) => {
    row = { id: uid("honor"), ...honorPayload(data) };
    db.honors.unshift(row);
    appendAudit(db, session, "honor_create", row.id);
  });
  return row;
}

function updateHonor(id, data, session) {
  requireTeacher(session);
  let row;
  withDb((db) => {
    row = db.honors.find((item) => item.id === id);
    if (!row) throw new Error("NOT_FOUND");
    Object.assign(row, honorPayload(data));
    appendAudit(db, session, "honor_update", id);
  });
  return row;
}

function academicPlan(studentId) {
  const db = readDb();
  const s = db.students.find((x) => x.studentId === studentId);
  const key = `${s.grade}|${s.major}`;
  return { plan: db.academic.plansByKey[key], progress: db.academic.progressByStudent[studentId] };
}

function academicReport(studentId) {
  const { plan, progress } = academicPlan(studentId);
  if (!plan || !progress) return { ok: false, message: "缺少培养方案或学业进度。" };
  const modules = plan.modules.map((m) => {
    const got = progress.modules.find((x) => x.key === m.key);
    const earned = Number(got?.earned || 0);
    const gap = Math.max(0, m.required - earned);
    return { ...m, earned, gap, risk: gap >= 4 ? "高" : gap >= 2 ? "中" : "低" };
  });
  return {
    ok: true,
    modules,
    riskLevel: modules.some((m) => m.risk === "高") ? "高" : modules.some((m) => m.risk === "中") ? "中" : "低",
    suggestions: modules.filter((m) => m.gap > 0).map((m) => ({ focus: m.name, hint: `仍需约 ${m.gap} 学分，请关注 ${m.name} 相关课程。` })),
    uploads: progress.uploads || [],
  };
}

function saveAcademicProgress(data, session) {
  withDb((db) => {
    db.academic.progressByStudent[session.studentId].modules = data.modules || [];
    appendAudit(db, session, "academic_progress_put", session.studentId);
  });
  return { ok: true };
}

function saveTranscript(data, session) {
  withDb((db) => {
    const progress = db.academic.progressByStudent[session.studentId];
    progress.uploads = progress.uploads || [];
    progress.uploads.unshift({ ...data.meta, at: Date.now() });
    appendAudit(db, session, "academic_transcript_meta", session.studentId);
  });
  return { ok: true };
}

function workbenchSummary(session) {
  if (session.role === ROLES.STUDENT) throw new Error("FORBIDDEN");
  const db = readDb();
  return {
    students: db.students.length,
    pendingApps: db.applications.filter((a) => a.status === APPROVAL.PENDING).length,
    miss: db.missKeywords.length,
    batches: db.batches.length,
    sms: db.smsSimulation.length,
  };
}

function publishNotice(data, session) {
  if (![ROLES.TEACHER, ROLES.COORDINATOR].includes(session.role)) throw new Error("FORBIDDEN");
  const notice = { id: uid("n"), title: data.title, tags: data.tags || [], summary: data.summary || data.title, content: data.content || data.summary, source: "Web 工作台", publishedAt: Date.now() };
  const batchId = uid("batch");
  let reach = 0;
  withDb((db) => {
    const targets = db.students.filter((s) => matchRule(data.targetRule, s, session));
    reach = targets.length;
    db.notices.unshift(notice);
    db.batches.unshift({
      id: batchId,
      title: notice.title,
      targetRule: data.targetRule || { kind: "all" },
      createdAt: Date.now(),
      channels: [
        { name: "站内", sendOk: reach, sendFail: 0, deliverOk: reach, deliverFail: 0, read: 0, observability: "可读" },
        { name: "邮件", sendOk: reach, sendFail: 0, deliverOk: 0, deliverFail: 0, read: 0, observability: "不可观测" },
        { name: "短信(模拟)", sendOk: reach, sendFail: 0, deliverOk: 0, deliverFail: 0, read: 0, observability: "模拟" },
      ],
    });
    targets.forEach((s) => {
      db.inboxByStudent[s.studentId] = db.inboxByStudent[s.studentId] || [];
      db.inboxByStudent[s.studentId].unshift({ id: uid("msg"), noticeId: notice.id, title: notice.title, summary: notice.summary, batchId, createdAt: Date.now(), readAt: null, channels: [{ name: "站内", state: "发送请求成功", detail: "送达成功" }, { name: "邮件", state: "发送请求成功", detail: "不可观测" }] });
    });
    db.smsSimulation.unshift({ id: uid("sms"), batchId, at: Date.now(), audience: targets.map((s) => s.studentId), text: `[模拟短信] ${notice.title}` });
    appendAudit(db, session, "notice_publish", batchId);
  });
  return { notice, batchId, reach };
}

function matchRule(rule, student, session) {
  if (session.role === ROLES.COORDINATOR) {
    const me = readDb().students.find((s) => s.studentId === session.studentId);
    return me?.className === student.className;
  }
  if (!rule || rule.kind === "all") return true;
  if (rule.kind === "grade") return student.grade === rule.value;
  if (rule.kind === "major") return student.major.includes(rule.value || "");
  if (rule.kind === "class") return student.className === rule.value;
  return true;
}

function advanceParty(data, session) {
  if (session.role !== ROLES.TEACHER) throw new Error("FORBIDDEN");
  withDb((db) => {
    const p = db.partyByStudent[data.studentId];
    p.currentKey = data.nextKey;
    p.history.push({ stageKey: data.nextKey, at: Date.now(), remark: data.remark || "管理端推进阶段" });
    appendAudit(db, session, "party_advance", data.studentId);
  });
  return { ok: true };
}

function decideApplication(id, action, data, session) {
  if (session.role !== ROLES.TEACHER) throw new Error("FORBIDDEN");
  let result;
  withDb((db) => {
    const app = db.applications.find((a) => a.id === id);
    if (!app) throw new Error("NOT_FOUND");
    const trail = (act, remark) => app.auditTrail.push({ at: Date.now(), actor: "管理老师", action: act, remark });
    if (action === "approve" && app.status === APPROVAL.PENDING) {
      app.status = APPROVAL.APPROVED;
      app.teacherComment = data.comment || "同意。";
      app.decidedAt = Date.now();
      trail("通过", app.teacherComment);
    } else if (action === "reject" && app.status === APPROVAL.PENDING) {
      app.status = APPROVAL.REJECTED;
      app.teacherComment = data.reason || "材料不全，请补充后重提。";
      app.decidedAt = Date.now();
      trail("驳回", app.teacherComment);
    } else if (["revoke", "reapprove"].includes(action) && [APPROVAL.APPROVED, APPROVAL.REJECTED].includes(app.status)) {
      if (Date.now() - app.decidedAt > WINDOW_MS) throw new Error("WINDOW_CLOSED");
      app.status = action === "revoke" ? APPROVAL.REVOKED : APPROVAL.RE_APPROVED;
      app.teacherComment = data.reason || data.comment || "规则窗口内调整结论。";
      trail(action === "revoke" ? "撤回结论" : "重批", app.teacherComment);
    } else {
      throw new Error("INVALID_STATE");
    }
    appendAudit(db, session, `application_${action}`, id);
    result = app;
  });
  return result;
}

function leaderDashboard(session) {
  if (session.role !== ROLES.LEADER) throw new Error("FORBIDDEN");
  const db = readDb();
  const byStatus = {};
  db.applications.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  return {
    students: db.students.length,
    knowledgeCount: db.knowledge.length,
    noticeCount: db.notices.length,
    pendingApps: db.applications.filter((a) => a.status === APPROVAL.PENDING).length,
    applicationsByStatus: byStatus,
    missKeywordsTop: db.missKeywords.slice(0, 5),
    academicHighRiskStudents: db.students.filter((s) => academicReport(s.studentId).riskLevel === "高").length,
    batches: db.batches.length,
    lastReset: readMeta(),
  };
}

function appendAudit(db, session, action, target) {
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift({ id: uid("log"), at: Date.now(), actorId: session?.studentId || "unknown", role: session?.role || "unknown", action, target, result: "ok" });
}
