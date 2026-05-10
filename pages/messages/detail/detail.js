const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    msg: null,
    notice: null,
  },

  onLoad(q) {
    this.id = q.id || '';
  },

  async onShow() {
    if (!this.id) return;
    await request({ path: `/messages/${this.id}/read`, method: 'POST', data: {} });
    const res = await request({ path: '/messages/inbox' });
    const msg = (res.list || []).find((m) => m.id === this.id);
    let notice = null;
    if (msg && msg.noticeId) {
      try {
        notice = await request({ path: `/notices/${msg.noticeId}` });
      } catch (e) {
        notice = null;
      }
    }
    this.setData({
      msg: msg
        ? {
            ...msg,
            t: formatTime(msg.createdAt),
          }
        : null,
      notice,
    });
  },
});
