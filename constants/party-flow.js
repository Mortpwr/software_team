/**
 * 党团阶段定义：管理端可改配置；学生端按 key 驱动时间线与提醒规则。
 * 与需求状态图节点名称对齐（可随甲方确认再改文案）。
 */
module.exports.DEFAULT_STAGES = [
  { key: 'applicant', name: '入党申请人', order: 1, desc: '提交入党申请书，完成团组织推优材料' },
  { key: 'activist', name: '积极分子', order: 2, desc: '培养教育满一年，按时提交思想汇报与实践记录' },
  { key: 'candidate', name: '发展对象', order: 3, desc: '政审材料、公示与支部审查，按要求参加集中培训' },
  { key: 'probationary', name: '预备党员', order: 4, desc: '预备期一年，季度汇报与考察登记表归档' },
  { key: 'full', name: '正式党员', order: 5, desc: '转正大会、党委审批，进入正式党员教育管理' },
];

module.exports.DEFAULT_RULES = [
  {
    id: 'r1',
    trigger: 'stage_enter',
    stageKey: 'activist',
    afterDays: 90,
    title: '积极分子培养期满前提醒',
    body: '请核对培养考察记录是否齐全，准备进入下一阶段评审材料。',
  },
  {
    id: 'r2',
    trigger: 'stage_enter',
    stageKey: 'probationary',
    afterDays: 300,
    title: '预备期满前提醒',
    body: '预备期满前请按支部安排提交转正申请书与相关材料。',
  },
];
