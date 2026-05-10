const app = getApp();
const roles = require('../../../constants/roles');
const { request } = require('../../../services/api');

Page({
  data: {
    summary: null,
    role: '',
    warn: '',
  },

  onShow() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    this.setData({
      role,
      warn:
        role === roles.STUDENT
          ? '当前为学生身份，工作台仅演示管理链路。请在「我的」切换为管理老师。'
          : role === roles.LEADER
            ? '领导身份可查看统计与日志；变更类操作需使用「管理老师」或「班团骨干」账号演示。'
            : role === roles.COORDINATOR
              ? '协同身份可发布定向通知、查看工作台汇总；办事审批与党团阶段推进仍需管理老师。'
              : '',
    });
    if (role === roles.STUDENT) {
      this.setData({ summary: null });
      return;
    }
    this.loadSummary();
  },

  async loadSummary() {
    try {
      const summary = await request({ path: '/workbench/summary' });
      this.setData({ summary });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  go(e) {
    const p = e.currentTarget.dataset.path;
    if (p) wx.navigateTo({ url: p });
  },
});
