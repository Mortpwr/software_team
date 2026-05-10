const app = getApp();
const roles = require('../../../constants/roles');
const { request } = require('../../../services/api');

Page({
  data: {
    title: '',
    summary: '',
    content: '',
    tagsInput: '通知,党团',
    ruleKindIndex: 0,
    ruleKinds: ['全体', '按年级', '按专业包含'],
    grade: '2024级',
    majorKw: '软件工程',
  },

  onShow() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    if (role !== roles.TEACHER) {
      wx.showToast({ title: '需管理老师角色', icon: 'none' });
    }
  },

  onTitle(e) {
    this.setData({ title: e.detail.value });
  },
  onSummary(e) {
    this.setData({ summary: e.detail.value });
  },
  onContent(e) {
    this.setData({ content: e.detail.value });
  },
  onTags(e) {
    this.setData({ tagsInput: e.detail.value });
  },
  onGrade(e) {
    this.setData({ grade: e.detail.value });
  },
  onMajor(e) {
    this.setData({ majorKw: e.detail.value });
  },
  onRuleKind(e) {
    this.setData({ ruleKindIndex: Number(e.detail.value) });
  },

  buildRule() {
    const k = this.data.ruleKindIndex;
    if (k === 0) return { kind: 'all' };
    if (k === 1) return { kind: 'grade', value: this.data.grade };
    return { kind: 'major', value: this.data.majorKw };
  },

  async submit() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    if (role !== roles.TEACHER) {
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    const tags = this.data.tagsInput
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await request({
        path: '/workbench/notices/publish',
        method: 'POST',
        data: {
          title: this.data.title || '未命名通知',
          summary: this.data.summary || this.data.title,
          content: this.data.content || this.data.summary,
          tags,
          targetRule: this.buildRule(),
          source: '管理老师（演示）',
        },
      });
      wx.showModal({
        title: '已发布',
        content: `批次 ${res.batchId}，目标人数约 ${res.reach}，已 fan-out 站内信并写短信模拟记录。`,
        showCancel: false,
      });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },
});
