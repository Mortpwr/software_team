import { APPROVAL, FLOW_STAGES, ROLE_LABEL, ROLES } from "./data/seed.js";
import { request } from "./api/client.js";
import { readDb, resetDb } from "./api/store.js";
import { getSession, setSession } from "./state/session.js";
import { escapeHtml as h, formatTime } from "./utils.js";

const app = document.querySelector("#app");

const navItems = [
  ["home", "首页"],
  ["knowledge", "政策知识库"],
  ["party", "党团流程"],
  ["apply", "办事申请"],
  ["notices", "通知消息"],
  ["honors", "奖励荣誉"],
  ["academic", "学业分析"],
  ["profile", "学生画像"],
  ["workbench", "管理工作台"],
];

const mobileTabs = ["home", "knowledge", "party", "apply", "profile"];
let state = { route: currentRoute(), session: getSession(readDb()), cache: {} };

window.addEventListener("hashchange", () => render(currentRoute()));
window.addEventListener("sessionchange", () => {
  state.session = getSession(readDb());
  render(currentRoute());
});

document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);

render(state.route);

function currentRoute() {
  return location.hash.replace(/^#\/?/, "") || "home";
}

async function api(path, options = {}) {
  return request({ path, session: state.session, ...options });
}

async function render(route = "home") {
  state.route = route;
  const db = readDb();
  state.session = getSession(db);
  const title = navItems.find(([id]) => id === route)?.[1] || "学院学生服务";
  app.innerHTML = layout(title, `<div class="empty">加载中...</div>`);
  try {
    const html = await routeHtml(route);
    app.innerHTML = layout(title, html);
  } catch (err) {
    app.innerHTML = layout(title, `<div class="card"><h3>页面加载失败</h3><p class="muted">${h(err.message)}</p></div>`);
  }
}

function layout(title, content) {
  const db = readDb();
  const students = db.students || [];
  const nav = navItems.map(([id, text]) => `<a href="#/${id}" class="${state.route === id ? "active" : ""}">${text}</a>`).join("");
  const mobile = mobileTabs.map((id) => `<a href="#/${id}" class="${state.route === id ? "active" : ""}">${navItems.find(([x]) => x === id)[1].slice(0, 4)}</a>`).join("");
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-title">学院学生综合服务</div>
          <div class="brand-sub">Web 适配版 · 模块化 API · 可切后端</div>
        </div>
        <nav class="nav">${nav}</nav>
      </aside>
      <main class="main">
        <div class="topbar">
          <h1 class="page-title">${h(title)}</h1>
          <div class="session-panel">
            <select data-action="role">
              ${Object.entries(ROLE_LABEL).map(([id, label]) => `<option value="${id}" ${state.session.role === id ? "selected" : ""}>${label}</option>`).join("")}
            </select>
            <select data-action="student">
              ${students.map((s) => `<option value="${s.studentId}" ${state.session.studentId === s.studentId ? "selected" : ""}>${s.name} ${s.studentId}</option>`).join("")}
            </select>
          </div>
        </div>
        ${content}
      </main>
    </div>
    <nav class="mobile-tabs">${mobile}</nav>
    <div id="toast-root"></div>
  `;
}

async function routeHtml(route) {
  if (route === "home") return homePage();
  if (route === "knowledge") return knowledgePage();
  if (route === "party") return partyPage();
  if (route === "apply") return applyPage();
  if (route === "notices") return noticesPage();
  if (route === "honors") return honorsPage();
  if (route === "academic") return academicPage();
  if (route === "profile") return profilePage();
  if (route === "workbench") return workbenchPage();
  return homePage();
}

async function homePage() {
  const [notices, inbox, me] = await Promise.all([api("/notices"), api("/messages/inbox"), api("/student/me")]);
  return `
    <div class="grid cols-2">
      <section class="card hero">
        <h2>一站式学生事务入口</h2>
        <p class="muted">当前身份：${h(me?.name)} · ${h(ROLE_LABEL[state.session.role])}。Web 端已与小程序主业务保持同构演示。</p>
      </section>
      <section class="card">
        <h3>站内消息</h3>
        <p><strong>${inbox.unread}</strong> 封未读，多渠道触达口径可在通知页查看。</p>
        <button class="primary" data-go="notices">查看消息</button>
      </section>
    </div>
    <div class="section-title">核心功能</div>
    <div class="grid cols-3">
      ${[
        ["knowledge", "政策与模板", "标准答案优先、未命中词沉淀"],
        ["party", "党团流程", "阶段、历史节点、提醒任务"],
        ["apply", "办事申请", "证明 / 请假 / 盖章审批闭环"],
        ["notices", "通知公告", "标签、定向推送、批次统计"],
        ["academic", "学业分析", "培养方案比对与风险提示"],
        ["workbench", "管理工作台", "审批、发布、统计、日志"],
      ].map(([id, title, desc]) => `<button class="card" data-go="${id}"><strong>${title}</strong><br><span class="muted">${desc}</span></button>`).join("")}
    </div>
    <div class="section-title">近期通知</div>
    <div class="stack">${notices.list.slice(0, 4).map(noticeCard).join("")}</div>
  `;
}

async function knowledgePage() {
  const q = state.cache.knowledgeQ || "";
  const category = state.cache.knowledgeCategory || "全部";
  const res = await api("/knowledge", { data: { q, category } });
  if (q && res.list.length === 0) await api("/knowledge/miss", { method: "POST", data: { keyword: q } });
  return `
    <form class="toolbar" data-form="knowledge-search">
      <input name="q" value="${h(q)}" placeholder="输入关键词，如：奖助学金、宿舍、休学" />
      <select name="category">${res.categories.map((c) => `<option ${c === category ? "selected" : ""}>${h(c)}</option>`).join("")}</select>
      <button class="primary">搜索</button>
    </form>
    <div class="grid cols-2">
      <section>
        <div class="section-title">政策条目</div>
        <div class="stack">${res.list.length ? res.list.map(knowledgeCard).join("") : `<div class="empty card">未命中，已写入高频未命中词队列。</div>`}</div>
      </section>
      <section>
        <div class="section-title">常用模板</div>
        <div class="stack">${res.templates.map((t) => `<div class="card row between"><div><strong>${h(t.name)}</strong><div class="muted">${h(t.scene)} · ${h(t.format)}</div></div><button data-toast="模板下载接口已预留，后端接入后返回文件流">下载</button></div>`).join("")}</div>
      </section>
    </div>
  `;
}

async function partyPage() {
  const flow = await api("/party/progress");
  const cur = FLOW_STAGES.find((s) => s.key === flow.currentKey);
  return `
    <div class="card">
      <h3>${h(flow.flowName)}</h3>
      <p class="muted">当前阶段：<strong>${h(cur?.name)}</strong>。提醒任务后续可接微信订阅消息或邮件。</p>
    </div>
    <div class="grid cols-2">
      <section>
        <div class="section-title">流程总览</div>
        <div class="card timeline">${FLOW_STAGES.map((s) => `<div class="step ${s.order < cur.order ? "done" : ""} ${s.key === flow.currentKey ? "current" : ""}"><div class="dot"></div><div><div class="step-name">${h(s.name)}</div><div class="muted">${h(s.desc)}</div></div></div>`).join("")}</div>
      </section>
      <section>
        <div class="section-title">待办提醒</div>
        <div class="stack">${flow.tasks.map((t) => `<div class="card"><strong>${h(t.title)}</strong><p class="muted">${h(t.body)}</p><p>建议完成：${formatTime(t.dueAt)}</p><button class="primary" data-party-task="${t.id}" ${t.done ? "disabled" : ""}>${t.done ? "已完成" : "标记完成"}</button></div>`).join("") || `<div class="empty card">暂无待办</div>`}</div>
        <div class="section-title">历史节点</div>
        <div class="stack">${flow.history.map((row) => `<div class="card"><strong>${h(FLOW_STAGES.find((s) => s.key === row.stageKey)?.name || row.stageKey)}</strong><div class="muted">${formatTime(row.at)} · ${h(row.remark)}</div></div>`).join("")}</div>
      </section>
    </div>
  `;
}

async function applyPage() {
  const res = await api("/applications");
  return `
    <div class="grid cols-2">
      <section class="card">
        <h3>发起办事申请</h3>
        <form class="form-grid" data-form="application-create">
          <label>申请类型<select name="type"><option>证明申请</option><option>请假申请</option><option>盖章申请</option></select></label>
          <label>子类<input name="subtype" value="在读证明" /></label>
          <label class="span-2">申请说明<textarea name="reason" required placeholder="请填写事由；涉密内容请备注并转线下流程"></textarea></label>
          <label>开始日期<input name="startDate" type="date" /></label>
          <label>结束日期<input name="endDate" type="date" /></label>
          <label class="span-2">附件<input name="attachments" type="file" multiple /></label>
          <div class="span-2 row"><button class="primary">提交审批</button><button type="button" data-draft>保存草稿</button></div>
        </form>
      </section>
      <section>
        <div class="section-title">我的申请</div>
        <div class="stack">${res.list.map(applicationCard).join("") || `<div class="empty card">暂无申请</div>`}</div>
      </section>
    </div>
  `;
}

async function noticesPage() {
  const [notices, inbox] = await Promise.all([api("/notices"), api("/messages/inbox")]);
  return `
    <div class="grid cols-2">
      <section>
        <div class="section-title">通知公告</div>
        <div class="stack">${notices.list.map(noticeCard).join("")}</div>
      </section>
      <section>
        <div class="section-title">站内信</div>
        <div class="stack">${inbox.list.map((m) => `<div class="card"><div class="row between"><strong>${h(m.title)}</strong><span class="tag ${m.readAt ? "gray" : "orange"}">${m.readAt ? "已读" : "未读"}</span></div><p class="muted">${h(m.summary)}</p><button data-read-msg="${m.id}">标记已读</button></div>`).join("")}</div>
      </section>
    </div>
  `;
}

async function honorsPage() {
  const res = await api("/honors", { data: state.cache.honorFilter || {} });
  return `
    <form class="toolbar" data-form="honor-filter">
      <input name="major" placeholder="专业关键词" value="${h(state.cache.honorFilter?.major || "")}" />
      <select name="category"><option value="">全部类别</option><option>国家级</option><option>校级</option><option>省部级</option></select>
      <button class="primary">筛选</button>
    </form>
    <div class="grid cols-3">${res.list.map((x) => `<div class="card"><h3>${h(x.title)}</h3><p>${h(x.winner)} · ${h(x.grade)} · ${h(x.major)}</p><p><span class="tag">${x.year}</span> <span class="tag green">${h(x.category)}</span></p><p class="muted">${h(x.intro)}</p></div>`).join("")}</div>
  `;
}

async function academicPage() {
  const report = await api("/academic/report");
  const plan = await api("/academic/plan");
  if (!report.ok) return `<div class="card">${h(report.message)}</div>`;
  return `
    <div class="grid cols-2">
      <section>
        <div class="card"><h3>综合风险：${h(report.riskLevel)}</h3><p class="muted">当前 Web 版保留成绩单解析接口位，先使用培养方案与自报学分比对。</p><button data-transcript>登记成绩单上传</button></div>
        <div class="section-title">模块学分缺口</div>
        <div class="stack">${report.modules.map((m) => `<div class="card row between"><div><strong>${h(m.name)}</strong><div class="muted">要求 ${m.required} · 已获 ${m.earned} · 缺口 ${m.gap}</div></div><span class="tag ${m.risk === "高" ? "orange" : "green"}">风险 ${m.risk}</span></div>`).join("")}</div>
      </section>
      <section class="card">
        <h3>维护已获学分</h3>
        <form class="stack" data-form="academic-progress">
          ${plan.plan.modules.map((m) => {
            const got = plan.progress.modules.find((x) => x.key === m.key);
            return `<label>${h(m.name)}（要求 ${m.required}）<input type="number" min="0" step="0.5" name="${m.key}" value="${got?.earned || 0}" /></label>`;
          }).join("")}
          <button class="primary">保存</button>
        </form>
      </section>
    </div>
    <div class="section-title">修读建议</div>
    <div class="stack">${report.suggestions.map((s) => `<div class="card">${h(s.hint)}</div>`).join("")}</div>
  `;
}

async function profilePage() {
  const me = await api("/student/me");
  return `
    <div class="grid cols-2">
      <section class="card">
        <h2>${h(me.name)}</h2>
        ${kv("学号", me.studentId)}
        ${kv("年级专业", `${me.grade} · ${me.major}`)}
        ${kv("班级", me.className)}
        ${kv("民族", me.nation)}
        ${kv("政治面貌", me.politicalStatus)}
        ${kv("手机", me.phoneMasked || me.phone || "—")}
        ${kv("导师", me.tutor)}
      </section>
      <section class="card">
        <h3>扩展画像</h3>
        <pre>${h(JSON.stringify(me.extension || {}, null, 2))}</pre>
        <p class="muted">字段级权限已通过 API 层裁剪；后续可替换为后端字段白名单策略。</p>
        <button data-reset-db class="danger">重置 Web 演示数据</button>
      </section>
    </div>
  `;
}

async function workbenchPage() {
  if (state.session.role === ROLES.STUDENT) return `<div class="card">当前为学生身份。请切换为管理老师、协同管理者或学院领导查看工作台。</div>`;
  const summary = await api("/workbench/summary");
  const apps = await api("/applications", { data: { scope: "workbench" } }).catch(() => ({ list: [] }));
  const batches = await api("/workbench/batches").catch(() => ({ list: [] }));
  const logs = await api("/audit/logs", { data: { limit: 20 } }).catch(() => ({ list: [] }));
  const leader = state.session.role === ROLES.LEADER ? await api("/leader/dashboard").catch(() => null) : null;
  return `
    <div class="grid cols-3">
      ${stat("在册学生", summary.students)}
      ${stat("待审批", summary.pendingApps)}
      ${stat("通知批次", summary.batches)}
    </div>
    ${leader ? `<div class="section-title">领导看板</div><div class="card">政策条目 ${leader.knowledgeCount} · 通知 ${leader.noticeCount} · 学业高风险 ${leader.academicHighRiskStudents}</div>` : ""}
    <div class="grid cols-2">
      <section>
        <div class="section-title">审批处理</div>
        <div class="stack">${apps.list.map(workbenchAppCard).join("") || `<div class="empty card">暂无可查看申请</div>`}</div>
      </section>
      <section class="card">
        <h3>定向通知发布</h3>
        <form class="stack" data-form="notice-publish">
          <input name="title" placeholder="标题" required />
          <input name="summary" placeholder="摘要" />
          <textarea name="content" placeholder="正文"></textarea>
          <input name="tags" value="通知,党团" placeholder="标签，逗号分隔" />
          <select name="kind"><option value="all">全体</option><option value="grade">按年级</option><option value="major">按专业</option></select>
          <input name="value" placeholder="规则值，如 2024级 / 软件工程" />
          <button class="primary" ${state.session.role === ROLES.LEADER ? "disabled" : ""}>发布</button>
        </form>
      </section>
    </div>
    <div class="section-title">批次统计</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>批次</th><th>渠道</th><th>发送/失败</th><th>送达/失败</th><th>已读</th></tr></thead><tbody>${batches.list.flatMap((b) => b.channels.map((c) => `<tr><td>${h(b.title)}<br><span class="muted">${h(b.id)}</span></td><td>${h(c.name)}</td><td>${c.sendOk}/${c.sendFail}</td><td>${c.deliverOk}/${c.deliverFail}</td><td>${c.read}</td></tr>`)).join("")}</tbody></table></div>
    <div class="section-title">审计日志</div>
    <div class="stack">${logs.list.map((l) => `<div class="card muted">${formatTime(l.at)} · ${h(l.role)} · ${h(l.actorId)} · ${h(l.action)} → ${h(l.target)}</div>`).join("")}</div>
  `;
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const fd = new FormData(form);
  const name = form.dataset.form;
  if (name === "knowledge-search") {
    state.cache.knowledgeQ = fd.get("q");
    state.cache.knowledgeCategory = fd.get("category");
    return render("knowledge");
  }
  if (name === "application-create") {
    const type = fd.get("type");
    const files = [...form.querySelector("[name=attachments]").files].map((f) => ({ name: f.name, size: f.size }));
    if (type === "盖章申请" && files.length === 0) return toast("盖章申请须上传附件");
    await api("/applications", {
      method: "POST",
      data: {
        type,
        subtype: fd.get("subtype"),
        form: {
          reason: fd.get("reason"),
          startDate: fd.get("startDate"),
          endDate: fd.get("endDate"),
        },
        attachments: files,
      },
    });
    toast("已提交审批");
    return render("apply");
  }
  if (name === "honor-filter") {
    state.cache.honorFilter = Object.fromEntries([...fd.entries()].filter(([, v]) => v));
    return render("honors");
  }
  if (name === "academic-progress") {
    const plan = await api("/academic/plan");
    const modules = plan.plan.modules.map((m) => ({ key: m.key, earned: Number(fd.get(m.key) || 0) }));
    await api("/academic/progress", { method: "PUT", data: { modules } });
    toast("已保存学业数据");
    return render("academic");
  }
  if (name === "notice-publish") {
    const tags = String(fd.get("tags") || "").split(/[,，]/).map((x) => x.trim()).filter(Boolean);
    await api("/workbench/notices/publish", { method: "POST", data: { title: fd.get("title"), summary: fd.get("summary"), content: fd.get("content"), tags, targetRule: { kind: fd.get("kind"), value: fd.get("value") } } });
    toast("已生成通知批次");
    return render("workbench");
  }
}

async function handleClick(event) {
  const el = event.target.closest("[data-go],[data-toast],[data-party-task],[data-read-msg],[data-reset-db],[data-transcript],[data-decision],[data-draft]");
  if (!el) return;
  if (el.dataset.go) location.hash = `#/${el.dataset.go}`;
  if (el.dataset.toast) toast(el.dataset.toast);
  if (el.dataset.partyTask) {
    await api(`/party/tasks/${el.dataset.partyTask}/done`, { method: "POST" });
    toast("已记录完成");
    render("party");
  }
  if (el.dataset.readMsg) {
    await api(`/messages/${el.dataset.readMsg}/read`, { method: "POST" });
    toast("已标记已读");
    render("notices");
  }
  if (el.dataset.resetDb !== undefined && confirm("确定重置 Web 演示数据？")) {
    resetDb();
    toast("已重置");
    render(state.route);
  }
  if (el.dataset.transcript !== undefined) {
    await api("/academic/transcript", { method: "POST", data: { meta: { name: "成绩单.pdf", note: "Web 演示：已登记元数据" } } });
    toast("已登记上传记录");
    render("academic");
  }
  if (el.dataset.draft !== undefined) {
    const form = el.closest("form");
    const fd = new FormData(form);
    await api("/applications/draft", {
      method: "POST",
      data: {
        type: fd.get("type"),
        subtype: fd.get("subtype"),
        form: {
          reason: fd.get("reason"),
          startDate: fd.get("startDate"),
          endDate: fd.get("endDate"),
        },
        attachments: [...form.querySelector("[name=attachments]").files].map((f) => ({ name: f.name, size: f.size })),
      },
    });
    toast("草稿已保存");
  }
  if (el.dataset.decision) {
    const [id, action] = el.dataset.decision.split(":");
    const payload = action === "reject" ? { reason: prompt("驳回原因", "材料不全，请补充后重提。") || "" } : { comment: prompt("审批意见", "同意。") || "" };
    await api(`/workbench/applications/${id}/${action}`, { method: "POST", data: payload });
    toast("操作完成");
    render("workbench");
  }
}

function handleChange(event) {
  const action = event.target.dataset.action;
  if (!action) return;
  const next = { ...state.session };
  if (action === "role") next.role = event.target.value;
  if (action === "student") next.studentId = event.target.value;
  setSession(next);
}

function knowledgeCard(item) {
  return `<article class="card"><div class="row between"><h3 class="item-title">${h(item.title)}</h3><span class="tag">${h(item.category)}</span></div><p>${h(item.summary)}</p><p>${(item.tags || []).map((t) => `<span class="tag gray">${h(t)}</span>`).join(" ")}</p>${item.sensitiveHint ? `<p class="muted">敏感内容仅展示摘要，请走官方渠道。</p>` : ""}</article>`;
}

function noticeCard(item) {
  return `<article class="card notice"><div class="row between"><strong>${h(item.title)}</strong><span class="muted">${formatTime(item.publishedAt)}</span></div><p>${h(item.summary)}</p><p>${(item.tags || []).map((t) => `<span class="tag">${h(t)}</span>`).join(" ")}</p></article>`;
}

function applicationCard(item) {
  return `<article class="card"><div class="row between"><strong>${h(item.type)} · ${h(item.subtype)}</strong><span class="tag">${h(item.status)}</span></div><p>${h(item.form?.reason)}</p><p class="muted">${formatTime(item.createdAt)} ${item.teacherComment ? `· ${h(item.teacherComment)}` : ""}</p></article>`;
}

function workbenchAppCard(item) {
  const actions = item.status === APPROVAL.PENDING
    ? `<button class="primary" data-decision="${item.id}:approve">通过</button><button data-decision="${item.id}:reject">驳回</button>`
    : [APPROVAL.APPROVED, APPROVAL.REJECTED].includes(item.status)
      ? `<button data-decision="${item.id}:revoke">撤回</button><button data-decision="${item.id}:reapprove">重批</button>`
      : "";
  return `<article class="card"><div class="row between"><strong>${h(item.type)} · ${h(item.subtype)}</strong><span class="tag">${h(item.status)}</span></div><p>${h(item.studentId)} · ${h(item.form?.reason)}</p><div class="row wrap">${state.session.role === ROLES.TEACHER ? actions : ""}</div></article>`;
}

function kv(key, value) {
  return `<div class="kv"><div class="k">${h(key)}</div><div>${h(value)}</div></div>`;
}

function stat(label, value) {
  return `<div class="card"><div class="muted">${h(label)}</div><div style="font-size:28px;font-weight:700">${h(value)}</div></div>`;
}

function toast(message) {
  const root = document.querySelector("#toast-root");
  if (!root) return;
  root.innerHTML = `<div class="toast">${h(message)}</div>`;
  setTimeout(() => { root.innerHTML = ""; }, 2200);
}
