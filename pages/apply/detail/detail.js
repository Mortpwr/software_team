const approval = require('../../../constants/approval');
const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    id: '',
    item: null,
  },

  onLoad(q) {
    if (q.id) this.setData({ id: q.id });
  },

  onShow() {
    if (this.data.id) this.load(this.data.id);
  },

  async load(id) {
    try {
      const item = await request({ path: `/applications/${id}` });
      const auditTrail = (item.auditTrail || []).map((a) => ({
        ...a,
        atText: formatTime(a.at),
      }));
      const fmtCreated = formatTime(item.createdAt);
      this.setData({ item: { ...item, auditTrail, fmtCreated } });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  reSubmit() {
    const item = this.data.item;
    if (!item || item.status !== approval.REJECTED) return;
    const draft = encodeURIComponent(
      JSON.stringify({
        type: item.type,
        subtype: item.subtype,
        form: item.form || {},
        attachments: item.attachments || [],
      }),
    );
    wx.navigateTo({ url: `/pages/apply/create/create?draft=${draft}` });
  },
});
