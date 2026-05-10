const app = getApp();
const { request } = require('../../../services/api');
const roles = require('../../../constants/roles');

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (Array.isArray(val)) return val.join('、');
  if (typeof val === 'object') return JSON.stringify(val, null, 0);
  return String(val);
}

function extensionRows(ext) {
  const src = ext && typeof ext === 'object' ? ext : {};
  return Object.keys(src).map((key) => ({
    key,
    value: formatValue(src[key]),
  }));
}

Page({
  data: {
    student: null,
    rows: [],
    roleLabel: '',
    hint: '',
  },

  onShow() {
    const role = (app.globalData.session && app.globalData.session.role) || roles.STUDENT;
    const roleLabel = roles.LABEL[role] || roles.LABEL.student;
    let hint = '';
    if (role === roles.STUDENT) {
      hint = '学生视角：扩展字段为自助展示用途；敏感项正式环境应由服务端按权限裁剪。';
    } else if (role === roles.TEACHER) {
      hint = '管理老师：可查看更完整学籍辅线信息（与 /student/me 权限模型一致）。';
    } else if (role === roles.COORDINATOR) {
      hint = '协同角色：与本班业务相关的公共扩展字段可见；涉密字段仍走线下。';
    } else if (role === roles.LEADER) {
      hint = '学院领导：聚合视图见「领导看板」；个人扩展页以脱敏口径展示。';
    }
    this.setData({ roleLabel, hint });
    this.load();
  },

  async load() {
    try {
      const student = await request({ path: '/student/me' });
      const rows = extensionRows(student && student.extension);
      this.setData({
        student,
        rows,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
