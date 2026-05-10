const approval = require('../../../constants/approval');
const { request } = require('../../../services/api');
const profile = require('../../../repositories/profile.repository');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    tabs: ['审批中', '已通过', '已驳回', '已撤回', '已重批', '全部'],
    tabIndex: 0,
    list: [],
  },

  onShow() {
    this.reload();
  },

  mapTab(i) {
    const m = {
      0: approval.PENDING,
      1: approval.APPROVED,
      2: approval.REJECTED,
      3: approval.REVOKED,
      4: approval.RE_APPROVED,
      5: '全部',
    };
    return m[i];
  },

  onTab(e) {
    this.setData({ tabIndex: Number(e.currentTarget.dataset.i) }, () => this.reload());
  },

  async reload() {
    const status = this.mapTab(this.data.tabIndex);
    try {
      const res = await request({
        path: '/applications',
        data: { scope: 'workbench', status: status === '全部' ? '' : status },
      });
      const list = (res.list || []).map((a) => {
        const stu = profile.findStudent(a.studentId);
        return {
          ...a,
          t: formatTime(a.createdAt),
          stuName: stu ? stu.name : a.studentId,
        };
      });
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '无权限或加载失败', icon: 'none' });
    }
  },

  async doApprove(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await request({
        path: `/workbench/applications/${id}/approve`,
        method: 'POST',
        data: { comment: '审核通过（演示）' },
      });
      wx.showToast({ title: '已通过', icon: 'success' });
      this.reload();
    } catch (err) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async doReject(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await request({
        path: `/workbench/applications/${id}/reject`,
        method: 'POST',
        data: { reason: '材料不全，请补充后重提。' },
      });
      wx.showToast({ title: '已驳回', icon: 'success' });
      this.reload();
    } catch (err) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async doRevoke(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await request({
        path: `/workbench/applications/${id}/revoke`,
        method: 'POST',
        data: { reason: '演示：规则窗口内撤回结论' },
      });
      wx.showToast({ title: '已撤回', icon: 'success' });
      this.reload();
    } catch (err) {
      wx.showToast({ title: '失败(可能超出窗口)', icon: 'none' });
    }
  },

  async doReapprove(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await request({
        path: `/workbench/applications/${id}/reapprove`,
        method: 'POST',
        data: { comment: '演示：重批调整结论', newStatus: '更正' },
      });
      wx.showToast({ title: '已重批', icon: 'success' });
      this.reload();
    } catch (err) {
      wx.showToast({ title: '失败(可能超出窗口)', icon: 'none' });
    }
  },
});
