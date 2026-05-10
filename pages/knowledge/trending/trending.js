const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: { list: [] },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/knowledge/trending', data: { limit: 30 } });
      const list = (res.list || []).map((k) => ({
        ...k,
        updatedText: formatTime(k.updatedAt),
      }));
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/knowledge-detail/knowledge-detail?id=${id}` });
  },
});
