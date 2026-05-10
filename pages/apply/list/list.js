const { request } = require('../../../services/api');
const { setTabIndex } = require('../../../utils/tabbar');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    list: [],
  },

  onShow() {
    setTabIndex(this, 3);
    this.load();
  },

  async load() {
    try {
      const res = await request({ path: '/applications' });
      const list = (res.list || []).map((a) => ({
        ...a,
        createdText: formatTime(a.createdAt),
      }));
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/apply/create/create' });
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/apply/detail/detail?id=${id}` });
  },
});
