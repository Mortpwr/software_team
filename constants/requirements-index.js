/**
 * 与《初版需求分析文档 v3.0》章节目录对齐的功能索引（用于「需求追踪」页展示与验收自测）。
 * screen：小程序内路由；api：local-gateway 路径前缀示意。
 */
module.exports.MODULES = [
  {
    id: 'M1',
    name: '智能问答与政策知识库',
    priority: 'P0',
    items: [
      { fr: 'FR1-1~FR1-6', desc: '政策维护、关键词检索、标准答案优先、敏感摘要、模板分类', screen: '/pages/knowledge/knowledge', api: '/knowledge' },
      { fr: 'FR1-7', desc: '高频未命中词统计', screen: '/pages/workbench/misses/misses', api: '/workbench/knowledge/misses' },
      { fr: '扩展·收藏', desc: '收藏条目', screen: '/pages/knowledge/favorites/favorites', api: 'GET /knowledge/favorites' },
      { fr: '扩展·最近', desc: '最近浏览', screen: '/pages/knowledge/recent/recent', api: 'GET /knowledge/recent' },
      { fr: '扩展·热门', desc: '点击量排序（演示）', screen: '/pages/knowledge/trending/trending', api: 'GET /knowledge/trending' },
    ],
  },
  {
    id: 'M2',
    name: '党团事务流程管理',
    priority: 'P0',
    items: [
      { fr: 'FR2-1~FR2-5', desc: '入党阶段、历史节点、提醒任务', screen: '/pages/party/party', api: '/party/progress' },
      { fr: '入团（扩展）', desc: '共青团发展流程独立进度', screen: '/pages/league/league', api: '/league/progress' },
      { fr: '工作台·入党', desc: '入党阶段维护', screen: '/pages/workbench/party-mgmt/party-mgmt', api: '/workbench/party/advance' },
      { fr: '工作台·入团', desc: '入团阶段维护', screen: '/pages/workbench/league-mgmt/league-mgmt', api: '/workbench/league/advance' },
    ],
  },
  {
    id: 'M3',
    name: '信息集成与精准推送',
    priority: 'P1',
    items: [
      { fr: 'FR3-1~FR3-7', desc: '通知、标签、定向规则、批次与短信模拟', screen: '/pages/notices/notices', api: '/notices' },
      { fr: '站内信', desc: '多通道口径展示', screen: '/pages/messages/inbox/inbox', api: '/messages/inbox' },
      { fr: '发布', desc: '老师/协同管理者在本班范围发布', screen: '/pages/workbench/publish/publish', api: '/workbench/notices/publish' },
    ],
  },
  {
    id: 'M4',
    name: '电子证明与审批',
    priority: 'P0',
    items: [
      { fr: 'FR4-1~FR4-12', desc: '申请、审批状态机、盖章附件、驳回重提', screen: '/pages/apply/list/list', api: '/applications' },
      { fr: '草稿', desc: '本地草稿暂存（发起页加载/保存）', screen: '/pages/apply/create/create', api: '/applications/draft' },
    ],
  },
  {
    id: 'M5',
    name: '奖励荣誉展示',
    priority: 'P1',
    items: [{ fr: 'FR5-1~FR5-4', desc: '检索筛选', screen: '/pages/honors/honors', api: '/honors' }],
  },
  {
    id: 'M6',
    name: '学生画像与信息',
    priority: 'P1',
    items: [
      { fr: 'FR6-1~FR6-5', desc: '基础/扩展画像、字段级权限', screen: '/pages/profile/profile', api: '/student/me' },
      { fr: '扩展字段', desc: '竞赛/科研/实践等 JSON 扩展展示', screen: '/pages/profile/extension/extension', api: '/student/me' },
    ],
  },
  {
    id: 'M7',
    name: '学业分析与预警（P2）',
    priority: 'P2',
    items: [
      { fr: 'FR7-1~FR7-7', desc: '培养方案比对、学分缺口、建议（非选课引擎）', screen: '/pages/academic/academic', api: '/academic/report' },
    ],
  },
  {
    id: 'M8',
    name: '理论自测（P2 可选）',
    priority: 'P2',
    items: [{ fr: 'FR2-6~FR2-7', desc: '题库练习、计分、记录', screen: '/pages/theory/exam/exam', api: '/theory' }],
  },
  {
    id: 'M9',
    name: '管理端 / 领导视图',
    priority: '—',
    items: [
      { fr: '权限矩阵', desc: '四级角色、协同管理者不可审批', screen: '/pages/workbench/home/home', api: '/workbench/*' },
      { fr: '学院领导', desc: '只读运行概览', screen: '/pages/leader/dashboard/dashboard', api: '/leader/dashboard' },
    ],
  },
  {
    id: 'M10',
    name: '工程元数据',
    priority: '—',
    items: [
      {
        fr: '需求索引',
        desc: '本页：模块—功能点—路由—网关路径，支持一键跳转与复制',
        screen: '/pages/help/trace/trace',
        api: '(静态索引)',
      },
    ],
  },
];

module.exports.NFR_HINTS = [
  { code: 'NFR12~15', desc: '移动端体验、状态可感知、用语贴近学工场景' },
  { code: 'NFR16~18', desc: '模块化扩展：新增路由+仓储即可接入' },
  { code: 'NFR19~23', desc: '数据库 Kingbase、导入导出、微信身份——线上对接时在 api.js 切换' },
];
