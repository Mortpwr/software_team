const { request } = require('../../services/api');
const { setTabIndex } = require('../../utils/tabbar');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    flow: null,
  },

  onShow() {
    setTabIndex(this, 2);
    this.load();
  },

  async load() {
    try {
      const flow = await request({ path: '/party/progress' });
      const stagesDef = flow.stages || [];
      const current = stagesDef.find((x) => x.key === flow.currentKey);
      const curOrder = current ? current.order : 0;

      const stages = stagesDef.map((s) => ({
        ...s,
        done: s.order < curOrder,
        current: s.key === flow.currentKey,
        upcoming: s.order > curOrder,
      }));

      const history = (flow.history || []).map((h) => {
        const sn = stagesDef.find((s) => s.key === h.stageKey);
        return {
          ...h,
          atText: formatTime(h.at),
          stageName: sn ? sn.name : h.stageKey,
        };
      });

      const taskSource = flow.tasks || flow.nextTasks || [];
      const nextTasks = taskSource.map((t) => ({
        ...t,
        dueText: t.dueAt ? formatTime(t.dueAt) : '',
      }));

      this.setData({ flow: { ...flow, history, stages, nextTasks } });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async markDone(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    try {
      await request({ path: `/party/tasks/${id}/done`, method: 'POST', data: {} });
      wx.showToast({ title: '已记录完成', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});
