export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  COORDINATOR: "coordinator",
  LEADER: "leader",
};

export const ROLE_LABEL = {
  student: "学生",
  teacher: "管理老师",
  coordinator: "三级协同管理者",
  leader: "学院领导",
};

export const APPROVAL = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  PENDING: "审批中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  REVOKED: "已撤回",
  RE_APPROVED: "已重批",
};

export const FLOW_STAGES = [
  { key: "applicant", name: "入党申请人", desc: "递交申请书，完成谈话记录。", order: 1 },
  { key: "activist", name: "入党积极分子", desc: "培养教育不少于 1 年。", order: 2 },
  { key: "candidate", name: "发展对象", desc: "政审、公示、集中培训。", order: 3 },
  { key: "probationary", name: "预备党员", desc: "支部审批并进入预备期。", order: 4 },
  { key: "member", name: "正式党员", desc: "转正审批通过。", order: 5 },
];

const now = Date.now();

export function createSeedDatabase() {
  const students = [
    {
      studentId: "2024201581",
      name: "朱启哲",
      grade: "2024级",
      major: "软件工程",
      className: "软工2401",
      nation: "汉族",
      phone: "13800001581",
      politicalStatus: "共青团员",
      tutor: "张老师",
      hometown: "北京",
      extension: { research: "可信软件", club: "开源技术协会", volunteerHours: 24 },
    },
    {
      studentId: "2023200444",
      name: "赵子涵",
      grade: "2023级",
      major: "计算机科学与技术",
      className: "计科2302",
      nation: "汉族",
      phone: "13900004444",
      politicalStatus: "入党积极分子",
      tutor: "李老师",
      hometown: "上海",
      extension: { contest: "蓝桥杯省一", volunteerHours: 32 },
    },
    {
      studentId: "2022200999",
      name: "李煜南",
      grade: "2022级",
      major: "信息安全",
      className: "信安2201",
      nation: "回族",
      phone: "13700009999",
      politicalStatus: "中共预备党员",
      tutor: "王老师",
      hometown: "深圳",
      extension: { internship: "安全岗实习", awards: ["校级优秀团员"], volunteerHours: 60 },
    },
    {
      studentId: "2024210888",
      name: "钱晨",
      grade: "2024级",
      major: "软件工程",
      className: "软工2402",
      nation: "汉族",
      phone: "13500008888",
      politicalStatus: "共青团员",
      tutor: "张老师",
      hometown: "南京",
      extension: { contest: "CCPC 区域赛铜牌", research: "缺陷预测", volunteerHours: 48 },
    },
  ];

  const knowledge = [
    mkKnowledge("k_award", "奖助学金：资格、材料与时间线", "奖助政策", ["奖助学金", "贫困认定"], "以学院当年细则为准，困难认定需提交家庭经济信息采集表。", false),
    mkKnowledge("k_dorm", "宿舍调整：申请—审批—物业流转", "后勤事务", ["宿舍", "调整"], "向辅导员说明原因，经学院审批后进入物业调宿流程。", false),
    mkKnowledge("k_leave", "休学/复学：学籍规则与材料清单", "学籍事务", ["休学", "复学"], "按学校学籍管理规定提交申请与佐证材料。", false),
    mkKnowledge("k_party", "入党申请人与积极分子材料说明", "党团事务", ["入党", "积极分子"], "递交申请书后，团支部推优，支部安排谈话并留存记录。", false),
    mkKnowledge("k_cert", "在读证明：抬头、份数与英文版", "证明模板", ["在读证明", "英文证明"], "提交申请时写清抬头、份数、是否需要英文版。", false),
    mkKnowledge("k_seal", "盖章申请：附件必传与涉密转线下", "行政事务", ["盖章", "用印"], "盖章申请必须上传材料，涉密内容备注后转线下流转。", true),
  ];

  const notices = [
    mkNotice("n_practice", "2026 春季社会实践项目申报", ["实践", "竞赛"], "面向本科与研究生开放申报，请按附件要求组队。", now - 86400000 * 2),
    mkNotice("n_award", "奖助学金材料补交通知", ["奖助学金"], "尚未补齐材料的同学请在周五前补交扫描件。", now - 86400000 * 4),
    mkNotice("n_party", "支部组织生活会安排", ["党团"], "本周五晚进行专题组织生活会，请提前准备发言提纲。", now - 3600000 * 9),
  ];

  const applications = [
    mkApp("app_pending", "2024201581", "证明申请", "在读证明", APPROVAL.PENDING, "大厂实习入职", []),
    mkApp("app_reject", "2024201581", "盖章申请", "行政用印", APPROVAL.REJECTED, "社团年审材料", [{ name: "年审材料.pdf" }], "缺少指导单位签字页，请补充后重提。"),
    mkApp("app_approved", "2023200444", "请假申请", "病假", APPROVAL.APPROVED, "急性胃炎复诊", [{ name: "诊断证明.jpg" }], "同意。"),
  ];

  return {
    schemaVersion: 1,
    students,
    knowledge,
    templates: [
      { id: "tpl_leave", name: "请假条（通用）", scene: "日常请假", format: "docx" },
      { id: "tpl_budget", name: "学生活动经费预算表", scene: "团学活动", format: "xlsx" },
      { id: "tpl_report", name: "思想汇报模板", scene: "党团材料", format: "docx" },
    ],
    notices,
    batches: [],
    inboxByStudent: Object.fromEntries(students.map((s) => [s.studentId, notices.map((n, i) => ({
      id: `msg_${s.studentId}_${n.id}`,
      noticeId: n.id,
      title: n.title,
      summary: n.summary,
      batchId: "seed",
      createdAt: n.publishedAt + i * 1000,
      readAt: i % 2 ? now - 3600000 : null,
      channels: [{ name: "站内", state: "发送请求成功", detail: "送达成功" }, { name: "邮件", state: "发送请求成功", detail: "不可观测" }],
    }))])),
    partyByStudent: Object.fromEntries(students.map((s, i) => [s.studentId, makeParty(s.studentId, i)])),
    applications,
    honors: [
      { id: "h1", title: "国家奖学金", winner: "李某", year: 2025, major: "计算机科学与技术", grade: "2022级", category: "国家级", intro: "学年绩点与综合素质评价列前。" },
      { id: "h2", title: "校级优秀共青团员", winner: "王某", year: 2024, major: "软件工程", grade: "2023级", category: "校级", intro: "志愿服务与团支部建设突出。" },
      { id: "h3", title: "CCPC 区域赛铜牌", winner: "钱晨", year: 2026, major: "软件工程", grade: "2024级", category: "省部级", intro: "程序设计竞赛团队赛获奖。" },
    ],
    academic: makeAcademic(students),
    missKeywords: [],
    auditLogs: [],
    smsSimulation: [],
  };
}

function mkKnowledge(id, title, category, tags, summary, sensitiveHint) {
  return { id, title, category, tags, summary, body: `${summary}\n请以学院官网与辅导员最新通知为准。`, sensitiveHint, updatedAt: now - Math.random() * 86400000 * 8, hitCount: 0 };
}

function mkNotice(id, title, tags, summary, publishedAt) {
  return { id, title, tags, summary, content: `${summary}\n\n本通知由学院学工发布，具体材料要求请关注附件或后续补充说明。`, source: "学院学工", publishedAt };
}

function mkApp(id, studentId, type, subtype, status, reason, attachments, teacherComment = "") {
  const createdAt = now - 86400000;
  const auditTrail = [{ at: createdAt, actor: "学生", action: "提交", remark: "" }, { at: createdAt + 1000, actor: "系统", action: "进入审批队列", remark: "" }];
  if (status === APPROVAL.APPROVED || status === APPROVAL.REJECTED) {
    auditTrail.push({ at: now - 3600000, actor: "管理老师", action: status === APPROVAL.APPROVED ? "通过" : "驳回", remark: teacherComment });
  }
  return { id, studentId, type, subtype, status, createdAt, form: { reason, startDate: "", endDate: "", extraNote: "" }, attachments, teacherComment, decidedAt: status === APPROVAL.PENDING ? null : now - 3600000, auditTrail };
}

function makeParty(studentId, index) {
  const keys = ["activist", "candidate", "probationary"];
  const currentKey = keys[index % keys.length];
  const cur = FLOW_STAGES.find((s) => s.key === currentKey);
  return {
    studentId,
    currentKey,
    history: FLOW_STAGES.filter((s) => s.order < cur.order).map((s) => ({ stageKey: s.key, at: now - (8 - s.order) * 86400000 * 14, remark: "阶段已完成" })),
    tasks: [{ id: `task_${studentId}_1`, title: "提交阶段材料", body: "按当前阶段材料清单补齐纸质/电子材料。", dueAt: now + 86400000 * 7, done: false }],
  };
}

function makeAcademic(students) {
  const modules = [
    { key: "gen_req", name: "通识必修", required: 12 },
    { key: "gen_ele", name: "通识选修", required: 8 },
    { key: "major_core", name: "专业核心", required: 28 },
    { key: "major_ele", name: "专业选修", required: 14 },
    { key: "practice", name: "实践环节", required: 8 },
  ];
  const plansByKey = {};
  const progressByStudent = {};
  students.forEach((s, i) => {
    plansByKey[`${s.grade}|${s.major}`] = { key: `${s.grade}|${s.major}`, modules };
    progressByStudent[s.studentId] = { modules: modules.map((m, idx) => ({ key: m.key, earned: Math.max(0, m.required - ((i + idx) % 4)) })), uploads: [] };
  });
  return { plansByKey, progressByStudent };
}
