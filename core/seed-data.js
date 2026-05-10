const approval = require('../constants/approval');
const partyFlow = require('../constants/party-flow');
const channels = require('../constants/notice-channels');

/**
 * 构造“可运行”的本地首包数据：不是零散假样例，而是一张可一致演化的关系图。
 * - 学生画像、通知受众、办事单、站内信、党团进度彼此引用同一批学号
 * - 真正随机/增量来自用户操作与仓储写入（而不是写死页面文案）
 *
 * @returns {import('./types').PlatformDatabase}
 */
function createInitialDatabase() {
  const now = Date.now();
  const students = [
    {
      studentId: '2024201581',
      name: '朱启哲',
      grade: '2024级',
      major: '软件工程',
      className: '软工2401',
      nation: '汉族',
      phone: '13800001581',
      idCardCipher: 'ENC:110101199901011234',
      politicalStatus: '共青团员',
      tutor: '张老师',
      hometown: '北京',
      extension: { research: '可信软件', club: '开源技术协会' },
    },
    {
      studentId: '2023200444',
      name: '赵子涵',
      grade: '2023级',
      major: '计算机科学与技术',
      className: '计科2302',
      nation: '汉族',
      phone: '13900004444',
      idCardCipher: 'ENC:310115200201021111',
      politicalStatus: '入党积极分子',
      tutor: '李老师',
      hometown: '上海',
      extension: { contest: '蓝桥杯省一' },
    },
    {
      studentId: '2022200999',
      name: '李煜南',
      grade: '2022级',
      major: '信息安全',
      className: '信安2201',
      nation: '回族',
      phone: '13700009999',
      idCardCipher: 'ENC:440300199903031333',
      politicalStatus: '中共预备党员',
      tutor: '王老师',
      hometown: '深圳',
      extension: { internship: '某国资企业安全岗' },
    },
  ];

  const knowledge = [
    mkKnowledge(
      'k_award_01',
      '奖助学金：资格、材料与时间线',
      '奖助政策',
      ['奖助学金', '贫困认定', '综合测评'],
      '标准答案：奖助学金评审以当年学院学生工作细则为准；困难认定需按学院通知提交家庭经济信息采集表。',
      '常见问答：\n1）是否必须家庭经济困难认定？——申请国家励志奖学金、国家助学金等通常需要。\n2）挂科是否影响？——多数奖项要求学年无不及格记录，以细则为准。\n3）时间节点？——以辅导员群发与系统公告为准，请开启站内消息。',
      false,
      now - 86400000 * 2,
    ),
    mkKnowledge(
      'k_dorm_01',
      '宿舍调整：申请—审批—物业流转',
      '后勤事务',
      ['宿舍', '调整', '物业'],
      '标准答案：向班主任/辅导员说明原因 → 学院审批 → 学工备案 → 物业调宿。跨楼调整需等待床位释放。',
      '材料：申请表、家长知晓（如学院模板要求）、医疗证明（因病调整）。涉敏细节请线下咨询宿管中心。',
      false,
      now - 86400000 * 5,
    ),
    mkKnowledge(
      'k_leave_school_01',
      '休学/复学：学籍规则与材料清单',
      '学籍事务',
      ['休学', '复学', '学籍'],
      '标准答案：休学须符合学校学籍管理规定并提供佐证材料；复学需按开学前通知线上/线下办理。',
      '因病休学通常需要校医院或三甲医院诊断证明；复学时应完成学费缴纳与注册手续。具体以教务最新模板为准。',
      false,
      now - 86400000 * 9,
    ),
    mkKnowledge(
      'k_party_entry_01',
      '入党申请人：共青团推优与谈话记录',
      '党团事务',
      ['入党', '推优', '谈话'],
      '标准答案：递交入党申请书后，团支部进行推优，支部安排谈话并留存记录。',
      '提醒：请按支部模板书写申请书；思想汇报建议按季度提交。涉密材料勿在公网传播。',
      false,
      now - 86400000 * 1,
    ),
    mkKnowledge(
      'k_party_stage_01',
      '积极分子与发展对象：时间节点与材料差异',
      '党团事务',
      ['积极分子', '发展对象', '政审'],
      '标准答案：积极分子培养教育一般不少于 1 年；发展对象阶段涉及政审、公示与集中培训。',
      '若对时间线有疑问，以支部备案的时间戳为准，可在本小程序党团进度页查看节点记录。',
      false,
      now - 86400000 * 3,
    ),
    mkKnowledge(
      'k_cert_01',
      '在读证明：抬头、份数与英文版',
      '证明模板',
      ['在读证明', '英文证明'],
      '标准答案：提交办事申请时写清抬头全称、份数、是否需要英文版；审批通过后按学院用章流程领取。',
      '涉密或涉外场景，系统可备注走线下纸质流转（与需求 FR4-10/11 对齐）。',
      false,
      now - 86400000 * 4,
    ),
    mkKnowledge(
      'k_seal_01',
      '盖章申请：必须上传附件与涉密转线下',
      '行政事务',
      ['盖章', '用印', '附件'],
      '标准答案：盖章类申请必须上传用印材料电子版；若内容涉密，请在备注说明并转线下审批。',
      '注意：本系统仅为流程数字化，不产生法定电子签章效力（与需求非功能约束一致）。',
      false,
      now - 86400000 * 6,
    ),
    mkKnowledge(
      'k_job_01',
      '就业与三方协议：常见材料说明',
      '就业指导',
      ['就业', '三方', '档案'],
      '标准答案：就业手续以学院就业指导中心发布流程为准；网签与纸质签约以当年政策为准。',
      '敏感个人信息请在学院指定系统提交，不要通过微信私发完整证件照片。',
      true,
      now - 86400000 * 7,
    ),
    mkKnowledge(
      'k_intern_01',
      '实习与实践：学分认定与保险',
      '实践教学',
      ['实习', '社会实践', '学分'],
      '标准答案：实习学分认定以培养方案与实践课程要求为准；外出实践请关注保险与安全管理要求。',
      '若涉及校外驻点，请同步提交安全教育回执（以学院模板为准）。',
      false,
      now - 86400000 * 8,
    ),
    mkKnowledge(
      'k_grad_01',
      '毕业审核：学分结构核对思路',
      '学业事务',
      ['毕业', '学分', '培养方案'],
      '标准答案：按培养方案核对通识/专业/实践模块学分，注意必修与选修边界。',
      '成绩单解析为 P2 能力；本小程序提供本地学业核对表作为替代路径，数据来源为学生自行维护。',
      false,
      now - 86400000 * 10,
    ),
    mkKnowledge(
      'k_aid_01',
      '困难认定：隐私保护与官方入口',
      '奖助政策',
      ['困难认定', '隐私'],
      '标准答案：困难认定通过学院指定渠道提交；系统仅展示政策摘要，不展示他人隐私信息。',
      '如需帮助，请联系辅导员预约线下沟通。',
      true,
      now - 86400000 * 11,
    ),
    mkKnowledge(
      'k_discipline_01',
      '违纪处理与申诉：学生权利说明',
      '学生管理',
      ['违纪', '申诉'],
      '标准答案：处理程序以学校纪律处分规定为准，学生可在规定期限内提出书面申诉。',
      '本条目不提供个案结论，请到学院学工/法务官方渠道办理。',
      false,
      now - 86400000 * 12,
    ),
  ];

  const templates = [
    mkTpl('tpl_leave', '请假条（通用）', '日常请假', 'docx'),
    mkTpl('tpl_budget', '学生活动经费预算表', '团学活动', 'xlsx'),
    mkTpl('tpl_report_thought', '思想汇报（党支部模板）', '党团材料', 'docx'),
    mkTpl('tpl_social', '社会实践登记表', '社会实践', 'docx'),
    mkTpl('tpl_cert_zh', '在读证明信息收集表', '证明办事', 'docx'),
    mkTpl('tpl_intern_safe', '实习安全承诺书', '实习事务', 'pdf'),
  ];

  const honors = [
    mkHonor('h1', '国家奖学金', '李某', 2025, '计算机科学与技术', '2022级', '国家级', '学年绩点与综合素质评价列前。'),
    mkHonor('h2', '校级优秀共青团员', '王某', 2024, '软件工程', '2023级', '校级', '志愿服务与团支部建设突出。'),
    mkHonor('h3', '国家励志奖学金', '周某', 2024, '信息安全', '2022级', '国家级', '困难认定合规且学业优良。'),
    mkHonor('h4', '校级优秀学生干部', '赵某', 2023, '计算机科学与技术', '2021级', '校级', '承担学院大型活动组织工作。'),
    mkHonor('h5', '科技创新标兵', '孙某', 2025, '软件工程', '2024级', '院级', '省部级竞赛获奖。'),
  ];

  const notices = [
    mkNotice(
      'n_comp_2026spring',
      '2026春季社会实践项目申报',
      ['实践', '竞赛'],
      '面向本科与研究生开放申报，请按附件要求组队并提交项目书。',
      '系统内仅展示摘要；附件请到学院官网下载。评审结果将通过站内信+邮件(模拟)同步。',
      now - 86400000 * 2,
    ),
    mkNotice(
      'n_award_patch',
      '奖助学金材料补交通知',
      ['奖助学金'],
      '尚未补齐志愿时长与成绩单的同学请在周五前补交扫描件。',
      '补交通道：按辅导员指引通过邮箱/线下。系统记录批次为「教务材料补充」。',
      now - 86400000 * 5,
    ),
    mkNotice(
      'n_party_meeting',
      '支部组织生活会安排',
      ['党团', '组织生活'],
      '本周五晚进行专题组织生活会，请预备党员与积极分子提前准备发言提纲。',
      '请假须向支部书记报备，并在系统内同步提交请假申请以便统计。',
      now - 86400000,
    ),
    mkNotice(
      'n_job_fair',
      '学院专场宣讲与简历门诊',
      ['就业', '招聘'],
      '某科技公司与学院合作专场，提供简历一对一辅导。',
      '报名与场地以就业中心小程序为准；本通知用于画像匹配演示。',
      now - 3600000 * 6,
    ),
  ];

  const applications = [
    mkApplication({
      id: 'app_demo_pending',
      studentId: '2024201581',
      type: '证明申请',
      subtype: '在读证明',
      status: approval.PENDING,
      createdAt: now - 86400000,
      form: { reason: '大厂实习入职', extraNote: '中英文各 1 份', startDate: '', endDate: '' },
      attachments: [],
      decidedAt: null,
    }),
    mkApplication({
      id: 'app_demo_reject',
      studentId: '2024201581',
      type: '盖章申请',
      subtype: '行政用印',
      status: approval.REJECTED,
      createdAt: now - 86400000 * 4,
      form: { reason: '社团年审材料', extraNote: '涉敏字段走线下' },
      attachments: [{ name: '年审材料.pdf', path: 'local:demo' }],
      decidedAt: now - 86400000 * 3,
      teacherComment: '缺少社团指导单位签字页，请补扫后重提。',
    }),
    mkApplication({
      id: 'app_demo_other',
      studentId: '2023200444',
      type: '请假申请',
      subtype: '病假',
      status: approval.APPROVED,
      createdAt: now - 86400000 * 6,
      form: { reason: '急性胃炎复诊', startDate: '2026-05-08', endDate: '2026-05-10', extraNote: '' },
      attachments: [{ name: '诊断证明.jpg', path: 'local:demo' }],
      decidedAt: now - 86400000 * 5,
      teacherComment: '同意，注意复课手续。',
    }),
  ];

  const partyByStudent = {};
  students.forEach((s, idx) => {
    partyByStudent[s.studentId] = buildPartyProgress(s.studentId, idx, now);
  });

  const inboxByStudent = {};
  students.forEach((s) => {
    inboxByStudent[s.studentId] = buildInboxForStudent(s, notices, now);
  });

  const batches = [
    {
      id: 'batch_1',
      title: '系统初始化：全量站内触达',
      targetRule: { kind: 'all' },
      createdAt: now - 86400000 * 2,
      channels: [
        { name: channels.IN_APP, sendOk: 40, sendFail: 0, deliverOk: 38, deliverFail: 0, read: 12, observability: '可读' },
        { name: channels.EMAIL, sendOk: 40, sendFail: 2, deliverOk: 0, deliverFail: 0, read: 0, observability: '不可观测' },
        { name: channels.WECHAT, sendOk: 0, sendFail: 0, deliverOk: 0, deliverFail: 0, read: 0, observability: '未对接' },
      ],
    },
  ];

  const academic = buildAcademicDefaults(students);

  return {
    schemaVersion: 3,
    students,
    knowledge,
    templates,
    honors,
    notices,
    batches,
    inboxByStudent,
    partyFlow: {
      stages: partyFlow.DEFAULT_STAGES,
      rules: partyFlow.DEFAULT_RULES,
    },
    partyByStudent,
    applications,
    missKeywords: [],
    auditLogs: [],
    smsSimulation: [],
    academic,
  };
}

function mkKnowledge(id, title, category, tags, summary, body, sensitiveHint, updatedAt) {
  return {
    id,
    title,
    category,
    tags,
    summary,
    body,
    links: [],
    attachments: [],
    sensitiveHint,
    updatedAt,
    hitCount: 0,
  };
}

function mkTpl(id, name, scene, format) {
  return { id, name, scene, format, version: '2026.05', fileUrl: '' };
}

function mkHonor(id, title, winner, year, major, grade, category, intro) {
  return {
    id,
    title,
    winner,
    year,
    major,
    grade,
    category,
    intro,
    visibility: 'public',
    sensitiveAttachment: false,
  };
}

function mkNotice(id, title, tags, summary, content, publishedAt) {
  return { id, title, tags, summary, content, publishedAt, source: '学院学工' };
}

function mkApplication(params) {
  const auditTrail = [
    { at: params.createdAt, actor: '学生', action: '提交', remark: '' },
    { at: params.createdAt + 800, actor: '系统', action: '进入审批队列', remark: '' },
  ];
  if (params.status === approval.APPROVED) {
    auditTrail.push({
      at: params.decidedAt,
      actor: '管理老师',
      action: '通过',
      remark: params.teacherComment || '',
    });
  } else if (params.status === approval.REJECTED) {
    auditTrail.push({
      at: params.decidedAt,
      actor: '管理老师',
      action: '驳回',
      remark: params.teacherComment || '',
    });
  }
  return {
    id: params.id,
    studentId: params.studentId,
    type: params.type,
    subtype: params.subtype,
    status: params.status,
    createdAt: params.createdAt,
    form: params.form,
    attachments: params.attachments || [],
    teacherComment: params.teacherComment || '',
    decidedAt: params.decidedAt || null,
    auditTrail,
  };
}

function buildPartyProgress(studentId, idx, now) {
  const stages = partyFlow.DEFAULT_STAGES;
  const pick = idx % 3;
  const currentKey = pick === 0 ? 'activist' : pick === 1 ? 'candidate' : 'probationary';
  const history = [];
  stages.forEach((s) => {
    if (s.order < stages.find((x) => x.key === currentKey).order) {
      history.push({
        stageKey: s.key,
        at: now - (6 - s.order) * 86400000 * 20,
        remark: '节点已完成（本地演示数据，可在工作台改进度）',
      });
    }
  });
  const rules = partyFlow.DEFAULT_RULES
    .filter((r) => r.stageKey === currentKey)
    .map((r) => ({
      id: `task_${studentId}_${r.id}`,
      ruleId: r.id,
      title: r.title,
      body: r.body,
      dueAt: now + r.afterDays * 86400000,
      done: false,
    }));
  return {
    studentId,
    currentKey,
    history,
    tasks: rules,
  };
}

function buildInboxForStudent(student, notices, now) {
  const match = notices.filter((n) => {
    if (n.tags.includes('就业') && !student.grade.includes('202')) return false;
    return true;
  });
  return match.map((n, i) => ({
    id: `msg_${student.studentId}_${n.id}`,
    studentId: student.studentId,
    noticeId: n.id,
    title: n.title,
    summary: n.summary,
    batchId: 'batch_1',
    createdAt: n.publishedAt + i * 1000,
    readAt: i % 2 === 0 ? null : now - 3600000,
    channels: [
      { name: channels.IN_APP, state: channels.STATES.SEND_OK, detail: channels.STATES.DELIVER_OK },
      { name: channels.EMAIL, state: channels.STATES.SEND_OK, detail: channels.STATES.UNOBSERVABLE },
    ],
  }));
}

function buildAcademicDefaults(students) {
  const plansByKey = {};
  const progressByStudent = {};
  students.forEach((s) => {
    const key = `${s.grade}|${s.major}`;
    if (!plansByKey[key]) {
      plansByKey[key] = {
        key,
        modules: [
          { key: 'gen_req', name: '通识必修', required: 12 },
          { key: 'gen_ele', name: '通识选修', required: 8 },
          { key: 'major_core', name: '专业核心', required: 28 },
          { key: 'major_ele', name: '专业选修', required: 14 },
          { key: 'practice', name: '实践环节', required: 8 },
        ],
      };
    }
    progressByStudent[s.studentId] = {
      modules: plansByKey[key].modules.map((m, idx) => ({
        key: m.key,
        earned: Math.max(0, m.required - (idx % 3) - 1),
      })),
      uploads: [],
    };
  });
  return { plansByKey, progressByStudent, reports: [] };
}

module.exports = { createInitialDatabase };
