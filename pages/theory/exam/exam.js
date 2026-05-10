const { request } = require('../../../services/api');
const { formatTime } = require('../../../utils/format');

Page({
  data: {
    questions: [],
    answers: {},
    result: null,
    history: [],
    showHistory: false,
  },

  onShow() {
    this.loadQuestions();
    this.loadHistory();
  },

  async loadQuestions() {
    try {
      const res = await request({ path: '/theory/questions' });
      const list = res.list || [];
      const answers = {};
      list.forEach((q) => {
        answers[q.id] = null;
      });
      this.setData({ questions: list, answers, result: null });
    } catch (e) {
      wx.showToast({ title: '加载题库失败', icon: 'none' });
    }
  },

  async loadHistory() {
    try {
      const res = await request({ path: '/theory/attempts' });
      const history = (res.list || []).map((r) => ({
        ...r,
        atText: formatTime(r.at),
      }));
      this.setData({ history });
    } catch (e) {
      /* ignore */
    }
  },

  onPick(e) {
    const { qid, index } = e.currentTarget.dataset;
    if (!qid) return;
    const answers = { ...this.data.answers };
    answers[qid] = Number(index);
    this.setData({ answers });
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory });
  },

  retake() {
    this.setData({ result: null });
    this.loadQuestions();
  },

  async submit() {
    const { questions, answers } = this.data;
    const missing = questions.some((q) => answers[q.id] === undefined || answers[q.id] === null);
    if (missing) {
      wx.showToast({ title: '请答完所有题目', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '交卷中', mask: true });
      const result = await request({
        path: '/theory/submit',
        method: 'POST',
        data: { answers },
      });
      wx.hideLoading();
      this.setData({
        result: {
          score: result.score,
          ok: result.ok,
          total: result.total,
        },
      });
      wx.showToast({ title: `得分 ${result.score}`, icon: 'none' });
      this.loadHistory();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },
});
