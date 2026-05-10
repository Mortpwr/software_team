const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    list: [],
    unread: 0,
  },

  onShow() {
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/messages/inbox' });
      const list = (res.list || []).map((m) => ({
        ...m,
        t: formatTime(m.createdAt),
        unread: !m.readAt,
      }));
      this.setData({ list, unread: res.unread || 0 });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  open(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/messages/detail/detail?id=${id}` });
  },
});
