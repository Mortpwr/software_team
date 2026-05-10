const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: { list: [], sms: [] },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const b = await request({ path: '/workbench/batches' });
      const s = await request({ path: '/workbench/sms' });
      this.setData({
        list: (b.list || []).map((x) => ({ ...x, t: formatTime(x.createdAt) })),
        sms: s.list || [],
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
