const app = getApp();
const { handle } = require('./local-gateway');

function buildSession() {
  const s = app.globalData.session || {};
  return {
    studentId: s.studentId || '',
    role: s.role || 'student',
    token: s.token,
  };
}

/**
 * 统一请求：本地模式走 local-gateway（仓储 + 规则），线上走 wx.request。
 * @param {{ path: string, method?: string, data?: object }} opt
 * @returns {Promise<any>}
 */
function request(opt) {
  const useMock = app.globalData.useMock;
  if (useMock) {
    return handle({
      path: opt.path,
      method: opt.method || 'GET',
      data: opt.data || {},
      session: buildSession(),
    }).then((res) => {
      if (!res && res !== 0) return res;
      return res;
    });
  }

  const base = app.globalData.apiBaseUrl || '';
  const url = `${base}${opt.path.startsWith('/') ? opt.path : `/${opt.path}`}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: opt.method || 'GET',
      data: opt.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: app.globalData.session && app.globalData.session.token
          ? `Bearer ${app.globalData.session.token}`
          : '',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error((res.data && res.data.message) || `HTTP ${res.statusCode}`));
        }
      },
      fail: reject,
    });
  });
}

module.exports = { request };
