/**
 * 与需求 7.3.4 渠道口径一致：统计层可扩展，此处给最小可用集合。
 */
module.exports = {
  IN_APP: '站内',
  WECHAT: '微信',
  EMAIL: '邮件',
  SMS_SIM: '短信(模拟)',
};

module.exports.STATES = {
  SEND_OK: '发送请求成功',
  SEND_FAIL: '发送失败',
  DELIVER_OK: '送达成功',
  DELIVER_FAIL: '送达失败',
  READ: '已读',
  UNOBSERVABLE: '不可观测',
};
