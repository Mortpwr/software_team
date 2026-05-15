import { request as rawRequest } from "../api/client.js";

export function createApi(sessionRef) {
  const call = (options) => rawRequest({
    ...options,
    session: sessionRef.value,
  });

  return {
    request: call,
    getCurrentStudent: () => call({ path: "/student/me" }),

    searchKnowledge: (query) => call({ path: "/knowledge", data: query }),
    recordKnowledgeMiss: (keyword) => call({ path: "/knowledge/miss", method: "POST", data: { keyword } }),

    getPartyProgress: () => call({ path: "/party/progress" }),
    completePartyTask: (taskId) => call({ path: `/party/tasks/${taskId}/done`, method: "POST" }),

    listApplications: (query = {}) => call({ path: "/applications", data: query }),
    getApplication: (id) => call({ path: `/applications/${id}` }),
    getApplicationDraft: () => call({ path: "/applications/draft" }),
    saveApplicationDraft: (payload) => call({ path: "/applications/draft", method: "POST", data: payload }),
    submitApplication: (payload) => call({ path: "/applications", method: "POST", data: payload }),
    submitApplicationById: (id, payload) => call({ path: `/applications/${id}/submit`, method: "POST", data: payload }),
    decideApplication: (id, action, payload) => call({
      path: `/workbench/applications/${id}/${action}`,
      method: "POST",
      data: payload,
    }),

    listNotices: () => call({ path: "/notices" }),
    getInbox: () => call({ path: "/messages/inbox" }),
    markMessageRead: (id) => call({ path: `/messages/${id}/read`, method: "POST" }),
    publishNotice: (payload) => call({ path: "/workbench/notices/publish", method: "POST", data: payload }),

    listHonors: (query = {}) => call({ path: "/honors", data: query }),

    getAcademicReport: () => call({ path: "/academic/report" }),
    getAcademicPlan: () => call({ path: "/academic/plan" }),
    saveAcademicProgress: (modules) => call({ path: "/academic/progress", method: "PUT", data: { modules } }),
    uploadTranscript: (meta) => call({ path: "/academic/transcript", method: "POST", data: { meta } }),

    getWorkbenchSummary: () => call({ path: "/workbench/summary" }),
    listWorkbenchBatches: () => call({ path: "/workbench/batches" }),
    listKnowledgeMisses: () => call({ path: "/workbench/knowledge/misses" }),
    listSmsSimulations: () => call({ path: "/workbench/sms" }),
    listAuditLogs: (query = {}) => call({ path: "/audit/logs", data: query }),
    getLeaderDashboard: () => call({ path: "/leader/dashboard" }),
  };
}
