const { request } = require('../../services/api');
const { setTabIndex } = require('../../utils/tabbar');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    notices: [],
    loaded: false,
    unread: 0,
  },

  onShow() {
    setTabIndex(this, 0);
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/notices' });
      const list = (res.list || []).slice(0, 5);
      const u = await request({ path: '/meta/unread' });
      this.setData({
        notices: list.map((n) => ({ ...n, publishedAtText: formatTime(n.publishedAt) })),
        unread: u.unread || 0,
        loaded: true,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goNotices() {
    wx.navigateTo({ url: '/pages/notices/notices' });
  },

  goHonors() {
    wx.navigateTo({ url: '/pages/honors/honors' });
  },

  goAcademic() {
    wx.navigateTo({ url: '/pages/academic/academic' });
  },

  goLeague() {
    wx.navigateTo({ url: '/pages/league/league' });
  },

  goTheory() {
    wx.navigateTo({ url: '/pages/theory/exam/exam' });
  },

  goTrace() {
    wx.navigateTo({ url: '/pages/help/trace/trace' });
  },

  goCreateApply() {
    wx.navigateTo({ url: '/pages/apply/create/create' });
  },

  goKnowledge() {
    wx.switchTab({ url: '/pages/knowledge/knowledge' });
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/messages/inbox/inbox' });
  },

  openNotice(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      this.goNotices();
      return;
    }
    wx.navigateTo({ url: `/pages/notice-detail/notice-detail?id=${id}` });
  },
});
