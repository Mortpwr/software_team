/**
 * 共青团员发展流程（简化版，与入党流程分立，满足「党团事务」双轨演示）。
 */
module.exports.DEFAULT_STAGES = [
  { key: 'l_apply', name: '入团申请', order: 1, desc: '递交入团申请书，参加团课学习' },
  { key: 'l_activist', name: '入团积极分子', order: 2, desc: '培养考察，完成志愿服务时长要求（以支部为准）' },
  { key: 'l_develop', name: '发展对象', order: 3, desc: '支部评议、公示与审批' },
  { key: 'l_member', name: '共青团员', order: 4, desc: '入团宣誓、档案归档' },
];

module.exports.DEFAULT_RULES = [
  {
    id: 'lr1',
    trigger: 'stage_enter',
    stageKey: 'l_activist',
    afterDays: 30,
    title: '志愿服务时长核对',
    body: '按团支部要求补充志愿北京/第二课堂记录截图（如需）。',
  },
];
