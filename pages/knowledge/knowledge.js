const { request } = require('../../services/api');
const { setTabIndex } = require('../../utils/tabbar');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    keyword: '',
    list: [],
    templates: [],
    categories: ['全部'],
    categoryIndex: 0,
  },

  onShow() {
    setTabIndex(this, 1);
    this.fetch('');
  },

  onSearchConfirm() {
    this.fetch(this.data.keyword);
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onCategoryChange(e) {
    const categoryIndex = Number(e.detail.value);
    this.setData({ categoryIndex }, () => this.fetch(this.data.keyword));
  },

  async fetch(q) {
    wx.showLoading({ title: '检索中', mask: true });
    const category = this.data.categories[this.data.categoryIndex] || '全部';
    try {
      const res = await request({ path: '/knowledge', data: { q, category } });
      const list = (res.list || []).map((k) => ({
        ...k,
        updatedText: formatTime(k.updatedAt),
      }));
      const categories = res.categories && res.categories.length ? res.categories : this.data.categories;
      this.setData({
        list,
        templates: res.templates || [],
        categories,
      });
      if ((q || '').trim() && list.length === 0) {
        await request({ path: '/knowledge/miss', method: 'POST', data: { keyword: q.trim() } });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/knowledge-detail/knowledge-detail?id=${id}` });
  },
});
