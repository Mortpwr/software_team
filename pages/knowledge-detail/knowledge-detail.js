const { request } = require('../../services/api');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    item: null,
    knowId: '',
    favorited: false,
  },

  onLoad(q) {
    const id = q.id;
    this.setData({ knowId: id });
    this.load(id);
  },

  async load(id) {
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const item = await request({ path: `/knowledge/${id}` });
      this.setData({
        item: { ...item, updatedText: formatTime(item.updatedAt) },
        favorited: !!item.favorited,
      });
    } catch (e) {
      wx.showToast({ title: '条目不存在', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async toggleFavorite() {
    const id = this.data.knowId;
    if (!id) return;
    try {
      const r = await request({ path: `/knowledge/${id}/favorite`, method: 'POST', data: {} });
      this.setData({ favorited: !!r.favorited });
      wx.showToast({ title: r.favorited ? '已加入收藏' : '已取消收藏', icon: 'none' });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});
