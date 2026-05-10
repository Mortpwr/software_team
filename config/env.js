/**
 * 环境配置：上线/联调时集中修改，避免散落魔法字符串。
 * 与 app.js globalData 保持语义一致。
 */
module.exports = {
  /** @type {string} */
  DEFAULT_API_BASE: '',
  /** 开发期默认走 mock */
  DEFAULT_USE_MOCK: true,
};
