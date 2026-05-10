Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页', icon: '⌂' },
      { pagePath: '/pages/knowledge/knowledge', text: '政策', icon: '◎' },
      { pagePath: '/pages/party/party', text: '党团', icon: '☆' },
      { pagePath: '/pages/apply/list/list', text: '办事', icon: '≡' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '◉' },
    ],
  },

  methods: {
    onTap(e) {
      const { index, path } = e.currentTarget.dataset;
      if (typeof index !== 'number' || !path) return;
      if (index === this.data.selected) return;
      wx.switchTab({ url: path });
    },
  },
});
