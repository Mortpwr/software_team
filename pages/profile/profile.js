const app = getApp();
const { request } = require('../../services/api');
const { setTabIndex } = require('../../utils/tabbar');
const roles = require('../../constants/roles');
const ROLE_LABEL = roles.LABEL;
const profileRepo = require('../../repositories/profile.repository');

Page({
  data: {
    student: null,
    envTip:
      '本地模式：业务数据写入微信 Storage（ss_platform_db_v3），覆盖办事、通知触达、党团、学业、审计日志等链路。对接服务端时将 useMock=false。',
    roleLabel: '',
    roleOptions: [
      { id: roles.STUDENT, name: ROLE_LABEL.student },
      { id: roles.TEACHER, name: ROLE_LABEL.teacher },
      { id: roles.LEADER, name: ROLE_LABEL.leader },
    ],
    roleIndex: 0,
    studentIds: [],
    studentIndex: 0,
  },

  onShow() {
    setTabIndex(this, 4);
    this.syncRoleIndex();
    this.loadStudentIds();
    this.load();
  },

  syncRoleIndex() {
    const r = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    const idx = this.data.roleOptions.findIndex((x) => x.id === r);
    this.setData({
      roleIndex: idx >= 0 ? idx : 0,
      roleLabel: ROLE_LABEL[r] || ROLE_LABEL.student,
    });
  },

  loadStudentIds() {
    const d = profileRepo.listStudents();
    const ids = d.map((x) => x.studentId);
    const cur = (app.globalData.session && app.globalData.session.studentId) || ids[0];
    const ix = Math.max(0, ids.indexOf(cur));
    this.setData({ studentIds: ids, studentIndex: ix });
  },

  async load() {
    try {
      const student = await request({ path: '/student/me' });
      this.setData({ student });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onRoleChange(e) {
    const roleIndex = Number(e.detail.value);
    const id = this.data.roleOptions[roleIndex].id;
    const cur = app.globalData.session || {};
    app.setSession({ ...cur, role: id });
    this.setData({ roleIndex, roleLabel: ROLE_LABEL[id] });
    wx.showToast({ title: `已切换为${ROLE_LABEL[id]}`, icon: 'none' });
    this.load();
  },

  onStudentChange(e) {
    const studentIndex = Number(e.detail.value);
    const studentId = this.data.studentIds[studentIndex];
    const cur = app.globalData.session || {};
    app.setSession({ ...cur, studentId });
    this.setData({ studentIndex });
    wx.showToast({ title: '已切换身份学号', icon: 'none' });
    this.load();
  },

  goWorkbench() {
    wx.navigateTo({ url: '/pages/workbench/home/home' });
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/messages/inbox/inbox' });
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/academic/plan/plan' });
  },

  async resetLocalDb() {
    const ok = await new Promise((resolve) => {
      wx.showModal({
        title: '重置本地数据库',
        content: '将清空办事进度、站内信、工作台审批等我们写入 Storage 的全部业务数据，并重新注入种子。确定？',
        success: (r) => resolve(!!r.confirm),
      });
    });
    if (!ok) return;
    try {
      await request({ path: '/danger/reset-db', method: 'POST', data: {} });
      wx.showToast({ title: '已重置', icon: 'success' });
      this.loadStudentIds();
      this.load();
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  loginDemo() {
    app.setSession({
      studentId: profileRepo.getDefaultStudentId(),
      token: 'mock-demo',
      role: roles.STUDENT,
    });
    this.loadStudentIds();
    this.load();
  },
});
