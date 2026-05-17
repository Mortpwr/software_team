export function createNoticesApi(call) {
  return {
    listNotices: () => call({ path: "/notices" }),
    getInbox: () => call({ path: "/messages/inbox" }),
    markMessageRead: (id) => call({ path: `/messages/${id}/read`, method: "POST" }),
    publishNotice: (payload) => call({ path: "/workbench/notices/publish", method: "POST", data: payload }),
    dispatchScheduledNotices: () => call({ path: "/workbench/notices/scheduled/dispatch", method: "POST" }),
    listWorkbenchBatches: (query = {}) => call({ path: "/workbench/batches", data: query }),
    listSmsSimulations: () => call({ path: "/workbench/sms" }),
  };
}
