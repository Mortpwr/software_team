const { MODULES, NFR_HINTS } = require('../../../constants/requirements-index');

const TAB_PATHS = new Set([
  '/pages/home/home',
  '/pages/knowledge/knowledge',
  '/pages/party/party',
  '/pages/apply/list/list',
  '/pages/profile/profile',
]);

Page({
  data: {
    modules: MODULES,
    nfrList: NFR_HINTS,
  },

  openPage(e) {
    const raw = e.currentTarget.dataset.screen;
    if (!raw || raw === '—') return;
    const path = raw.split('?')[0];
    if (TAB_PATHS.has(path)) {
      wx.switchTab({ url: path });
    } else {
      wx.navigateTo({ url: raw });
    }
  },

  copyApi(e) {
    const api = e.currentTarget.dataset.api;
    if (!api || api === '(静态索引)') {
      wx.showToast({ title: '无 API 文本', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: api,
      success: () => wx.showToast({ title: '已复制', icon: 'none' }),
    });
  },
});
