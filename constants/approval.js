/**
 * 与《初版需求分析文档》7.4.4 审批状态机一致，供前后端统一引用。
 */
module.exports = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  PENDING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  REVOKED: '已撤回',
  RE_APPROVED: '已重批',
};

module.exports.STATUS_ORDER = [
  module.exports.DRAFT,
  module.exports.SUBMITTED,
  module.exports.PENDING,
  module.exports.APPROVED,
];

module.exports.SEAL_REQUIRES_ATTACHMENT = true;
