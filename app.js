const { bootstrap } = require('./core/bootstrap');
const profile = require('./repositories/profile.repository');
const roles = require('./constants/roles');

App({
  globalData: {
    apiBaseUrl: '',
    useMock: true,
    session: null,
  },

  onLaunch() {
    bootstrap();
    const saved = wx.getStorageSync('session');
    if (saved && saved.studentId) {
      this.globalData.session = {
        studentId: saved.studentId,
        token: saved.token,
        role: saved.role || roles.STUDENT,
      };
    } else {
      this.setSession({
        studentId: profile.getDefaultStudentId(),
        token: 'mock-demo',
        role: roles.STUDENT,
      });
    }
  },

  setSession(session) {
    if (!session) {
      this.globalData.session = null;
      wx.removeStorageSync('session');
      return;
    }
    this.globalData.session = session;
    wx.setStorageSync('session', {
      studentId: session.studentId,
      token: session.token,
      role: session.role || roles.STUDENT,
    });
  },
});
