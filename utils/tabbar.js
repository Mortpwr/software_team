/**
 * 自定义 tabBar 选中态同步（官方要求在 tab 页 onShow 内设置）。
 * @param {any} page this
 * @param {number} index 与 app.json tabBar.list 顺序一致
 */
function setTabIndex(page, index) {
  if (page && typeof page.getTabBar === 'function') {
    const bar = page.getTabBar();
    if (bar) bar.setData({ selected: index });
  }
}

module.exports = { setTabIndex };
