const approval = require('../../../constants/approval');
const { request } = require('../../../services/api');

const MAIN_TYPES = ['证明申请', '请假申请', '盖章申请'];

Page({
  data: {
    mainTypes: MAIN_TYPES,
    mainIndex: 0,
    proofSubs: ['在读证明', '其他证明'],
    proofSubIndex: 0,
    leaveSubs: ['事假', '病假', '其他'],
    leaveSubIndex: 0,
    sealSubs: ['行政用印', '证明材料用印', '其他'],
    sealSubIndex: 0,
    reason: '',
    startDate: '',
    endDate: '',
    extraNote: '',
    attachments: [],
    draftFromReject: null,
  },

  onLoad(q) {
    if (q.draft) {
      try {
        const draft = JSON.parse(decodeURIComponent(q.draft));
        this.applyDraft(draft);
      } catch (e) {
        /* ignore */
      }
    } else {
      this.hydrateDraftFromServer();
    }
  },

  async hydrateDraftFromServer() {
    try {
      const draft = await request({ path: '/applications/draft' });
      if (draft && draft.type) {
        this.applyDraft(draft, true);
        wx.showToast({ title: '已恢复本地草稿', icon: 'none' });
      }
    } catch (e) {
      /* ignore */
    }
  },

  applyDraft(draft, silent) {
    const idx = MAIN_TYPES.indexOf(draft.type);
    const base = {
      draftFromReject: draft,
      mainIndex: idx >= 0 ? idx : 0,
      reason: (draft.form && draft.form.reason) || '',
      startDate: (draft.form && draft.form.startDate) || '',
      endDate: (draft.form && draft.form.endDate) || '',
      extraNote: (draft.form && draft.form.extraNote) || '',
      attachments: draft.attachments || [],
    };

    const sub = draft.subtype;
    if (draft.type === '证明申请' && sub) {
      const pi = this.data.proofSubs.indexOf(sub);
      if (pi >= 0) base.proofSubIndex = pi;
    }
    if (draft.type === '请假申请' && sub) {
      const li = this.data.leaveSubs.indexOf(sub);
      if (li >= 0) base.leaveSubIndex = li;
    }
    if (draft.type === '盖章申请' && sub) {
      const si = this.data.sealSubs.indexOf(sub);
      if (si >= 0) base.sealSubIndex = si;
    }

    this.setData(base);
    if (!silent) wx.showToast({ title: '已载入上次填写内容', icon: 'none' });
  },

  onMainTypeChange(e) {
    this.setData({ mainIndex: Number(e.detail.value) });
  },

  onProofSubChange(e) {
    this.setData({ proofSubIndex: Number(e.detail.value) });
  },

  onLeaveSubChange(e) {
    this.setData({ leaveSubIndex: Number(e.detail.value) });
  },

  onSealSubChange(e) {
    this.setData({ sealSubIndex: Number(e.detail.value) });
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  onStartChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEndChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  onExtraInput(e) {
    this.setData({ extraNote: e.detail.value });
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 3,
      type: 'file',
      success: (res) => {
        const files = (res.tempFiles || []).map((f) => ({ name: f.name, path: f.path }));
        this.setData({ attachments: [...this.data.attachments, ...files] });
      },
    });
  },

  removeFile(e) {
    const { index } = e.currentTarget.dataset;
    const attachments = [...this.data.attachments];
    attachments.splice(index, 1);
    this.setData({ attachments });
  },

  async saveDraft() {
    const type = MAIN_TYPES[this.data.mainIndex];
    const subtype = this.currentSubtype();
    const form = {
      reason: this.data.reason,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      extraNote: this.data.extraNote,
    };
    try {
      await request({
        path: '/applications/draft',
        method: 'POST',
        data: {
          type,
          subtype,
          form,
          attachments: this.data.attachments.map((a) => ({ name: a.name, path: a.path })),
        },
      });
      wx.showToast({ title: '草稿已保存', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  currentSubtype() {
    const t = MAIN_TYPES[this.data.mainIndex];
    if (t === '证明申请') return this.data.proofSubs[this.data.proofSubIndex];
    if (t === '请假申请') return this.data.leaveSubs[this.data.leaveSubIndex];
    return this.data.sealSubs[this.data.sealSubIndex];
  },

  async submit() {
    const type = MAIN_TYPES[this.data.mainIndex];
    const subtype = this.currentSubtype();
    const reason = (this.data.reason || '').trim();

    if (!reason) {
      wx.showToast({ title: '请填写申请说明', icon: 'none' });
      return;
    }

    if (type === '请假申请') {
      if (!this.data.startDate || !this.data.endDate) {
        wx.showToast({ title: '请选择请假起止日期', icon: 'none' });
        return;
      }
    }

    if (type === '盖章申请') {
      if (approval.SEAL_REQUIRES_ATTACHMENT && this.data.attachments.length === 0) {
        wx.showToast({ title: '盖章申请须上传附件', icon: 'none' });
        return;
      }
    }

    const form = {
      reason,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      extraNote: this.data.extraNote,
    };

    try {
      wx.showLoading({ title: '提交中', mask: true });
      const created = await request({
        path: '/applications',
        method: 'POST',
        data: {
          type,
          subtype,
          form,
          attachments: this.data.attachments.map((a) => ({ name: a.name, path: a.path })),
          remark: this.data.draftFromReject ? '重新提交（保留上次信息）' : '',
        },
      });
      wx.hideLoading();
      wx.showToast({ title: '已提交', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/apply/detail/detail?id=${created.id}` });
      }, 400);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },
});
