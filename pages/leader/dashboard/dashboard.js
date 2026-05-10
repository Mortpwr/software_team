const app = getApp();
const roles = require('../../../constants/roles');
const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    dash: null,
    forbidden: false,
  },

  onShow() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    if (role !== roles.LEADER) {
      this.setData({ forbidden: true, dash: null });
      return;
    }
    this.setData({ forbidden: false });
    this.load();
  },

  async load() {
    try {
      const raw = await request({ path: '/leader/dashboard' });
      const byStatus = raw.applicationsByStatus || {};
      const statusRows = Object.keys(byStatus).map((k) => ({ label: k, count: byStatus[k] }));
      const lr = raw.lastReset;
      const lastResetText = lr && lr.resetAt ? formatTime(lr.resetAt) : '';
      this.setData({
        dash: { ...raw, statusRows, lastResetText },
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goLogs() {
    wx.navigateTo({ url: '/pages/workbench/logs/logs' });
  },
});
