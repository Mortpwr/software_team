const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: { list: [] },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/audit/logs', data: { limit: 200 } });
      this.setData({
        list: (res.list || []).map((x) => ({ ...x, t: formatTime(x.at) })),
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
