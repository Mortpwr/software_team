const { request } = require('../../../services/api');

Page({
  data: {
    plan: null,
    editors: [],
  },

  onShow() {
    this.reload();
  },

  async reload() {
    try {
      const res = await request({ path: '/academic/plan' });
      const plan = res.plan;
      const progress = res.progress || { modules: [] };
      const editors = (plan && plan.modules ? plan.modules : []).map((m) => {
        const g = (progress.modules || []).find((x) => x.key === m.key);
        return {
          key: m.key,
          name: m.name,
          required: m.required,
          earned: g ? g.earned : 0,
        };
      });
      this.setData({ plan, editors });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onEarnedInput(e) {
    const { key } = e.currentTarget.dataset;
    const val = e.detail.value;
    const editors = this.data.editors.map((row) =>
      row.key === key ? { ...row, earned: val } : row,
    );
    this.setData({ editors });
  },

  async save() {
    const modules = this.data.editors.map((row) => ({
      key: row.key,
      earned: Number(row.earned) || 0,
    }));
    try {
      await request({ path: '/academic/progress', method: 'PUT', data: { modules } });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
