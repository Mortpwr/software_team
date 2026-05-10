const { request } = require('../../services/api');
const { formatTime } = require('../../utils/format');

Page({
  data: { item: null },

  onLoad(q) {
    this.load(q.id);
  },

  async load(id) {
    if (!id) return;
    try {
      const item = await request({ path: `/notices/${id}` });
      this.setData({ item: { ...item, t: formatTime(item.publishedAt) } });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
