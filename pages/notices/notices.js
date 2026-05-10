const { request } = require('../../services/api');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    list: [],
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/notices' });
      const list = (res.list || []).map((n) => ({
        ...n,
        publishedText: formatTime(n.publishedAt),
      }));
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  open(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/notice-detail/notice-detail?id=${id}` });
  },
});
