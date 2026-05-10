const app = getApp();
const roles = require('../../../constants/roles');
const leagueFlow = require('../../../constants/league-flow');
const { request } = require('../../../services/api');
const profile = require('../../../repositories/profile.repository');

Page({
  data: {
    students: [],
    studentIndex: 0,
    stages: leagueFlow.DEFAULT_STAGES,
    stageIndex: 0,
  },

  onShow() {
    this.reloadStudents();
  },

  reloadStudents() {
    const raw = profile
      .listStudents()
      .map((x) => `${x.name} ${x.studentId}`)
      .filter(Boolean);
    this.setData({ students: raw, studentIndex: 0 });
  },

  onStu(e) {
    this.setData({ studentIndex: Number(e.detail.value) });
  },

  onStage(e) {
    this.setData({ stageIndex: Number(e.detail.value) });
  },

  currentStudentId() {
    const list = profile.listStudents();
    const i = this.data.studentIndex;
    return list[i] ? list[i].studentId : '';
  },

  async submit() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    if (role !== roles.TEACHER) {
      wx.showToast({ title: '需管理老师', icon: 'none' });
      return;
    }
    const st = this.data.stages[this.data.stageIndex];
    const sid = this.currentStudentId();
    if (!sid) return;
    try {
      await request({
        path: '/workbench/league/advance',
        method: 'POST',
        data: { studentId: sid, nextKey: st.key, remark: '工作台调整入团阶段（演示）' },
      });
      wx.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },
});
