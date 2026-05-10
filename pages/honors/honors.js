const { request } = require('../../services/api');

Page({
  data: {
    list: [],
    yearIndex: 0,
    years: ['全部', '2025', '2024', '2023'],
    majorKeyword: '',
    categoryIndex: 0,
    categories: ['全部', '国家级', '校级'],
  },

  onShow() {
    this.fetch();
  },

  buildQuery() {
    const q = {};
    const y = this.data.years[this.data.yearIndex];
    if (y && y !== '全部') q.year = y;
    const c = this.data.categories[this.data.categoryIndex];
    if (c && c !== '全部') q.category = c;
    const mk = (this.data.majorKeyword || '').trim();
    if (mk) q.major = mk;
    return q;
  },

  async fetch() {
    wx.showLoading({ title: '加载', mask: true });
    try {
      const res = await request({ path: '/honors', data: this.buildQuery() });
      this.setData({ list: res.list || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onYearChange(e) {
    this.setData({ yearIndex: Number(e.detail.value) }, () => this.fetch());
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) }, () => this.fetch());
  },

  onMajorInput(e) {
    this.setData({ majorKeyword: e.detail.value });
  },

  searchMajor() {
    this.fetch();
  },
});
