const { request } = require('../../services/api');
const { setTabIndex } = require('../../utils/tabbar');

Page({
  data: {
    report: null,
    loading: true,
  },

  onShow() {
    setTabIndex(this, -1);
    this.load();
  },

  async load() {
    try {
      const report = await request({ path: '/academic/report' });
      this.setData({ report, loading: false });
    } catch (e) {
      this.setData({ loading: false, report: { ok: false, message: '加载失败' } });
    }
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/academic/plan/plan' });
  },

  async mockUpload() {
    try {
      await request({
        path: '/academic/transcript',
        method: 'POST',
        data: { meta: { name: '成绩单.pdf', note: '演示：跳过 OCR，仅存元数据' } },
      });
      wx.showToast({ title: '已登记上传记录', icon: 'success' });
      this.load();
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },
});
