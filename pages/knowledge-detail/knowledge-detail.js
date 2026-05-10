const { request } = require('../../services/api');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    item: null,
  },

  onLoad(q) {
    const id = q.id;
    this.load(id);
  },

  async load(id) {
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const item = await request({ path: `/knowledge/${id}` });
      this.setData({
        item: { ...item, updatedText: formatTime(item.updatedAt) },
      });
    } catch (e) {
      wx.showToast({ title: '条目不存在', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
