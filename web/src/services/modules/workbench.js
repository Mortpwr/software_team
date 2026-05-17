export function createWorkbenchApi(call) {
  return {
    getWorkbenchSummary: () => call({ path: "/workbench/summary" }),
    listKnowledgeMisses: () => call({ path: "/workbench/knowledge/misses" }),
    listAuditLogs: (query = {}) => call({ path: "/audit/logs", data: query }),
    getLeaderDashboard: () => call({ path: "/leader/dashboard" }),
  };
}
