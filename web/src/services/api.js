import { request as rawRequest, requestBlob } from "../api/client.js";

function apiPath(path) {
  if (!path) return "";
  return path.startsWith("/api/") ? path.slice(4) : path;
}

export function createApi(sessionRef) {
  const call = (options) => rawRequest({
    ...options,
    session: sessionRef.value,
  });

  return {
    request: call,
    getCurrentStudent: () => call({ path: "/student/me" }),
    listStudents: () => call({ path: "/students" }),
    exportStudents: () => requestBlob({ path: "/students/export", session: sessionRef.value }),

    searchKnowledge: (query) => call({ path: "/knowledge", data: query }),
    recordKnowledgeMiss: (keyword) => call({ path: "/knowledge/miss", method: "POST", data: { keyword } }),
    listKnowledgeAdmin: () => call({ path: "/knowledge/admin/list" }),
    createKnowledge: (payload) => call({ path: "/knowledge", method: "POST", data: payload }),
    updateKnowledge: (id, payload) => call({ path: `/knowledge/${id}`, method: "PUT", data: payload }),
    setKnowledgeOnline: (id, online) => call({ path: `/knowledge/${id}/online`, method: "POST", data: { online } }),
    downloadTemplate: (template) => requestBlob({
      path: `/templates/${template.id}/download`,
      data: { name: template.name },
      session: sessionRef.value,
    }),

    getPartyProgress: () => call({ path: "/party/progress" }),
    completePartyTask: (taskId) => call({ path: `/party/tasks/${taskId}/done`, method: "POST" }),
    advancePartyStage: (payload) => call({ path: "/workbench/party/advance", method: "POST", data: payload }),

    listApplications: (query = {}) => call({ path: "/applications", data: query }),
    getApplication: (id) => call({ path: `/applications/${id}` }),
    getApplicationDraft: () => call({ path: "/applications/draft" }),
    saveApplicationDraft: (payload) => call({ path: "/applications/draft", method: "POST", data: payload }),
    submitApplication: (payload) => call({ path: "/applications", method: "POST", data: payload }),
    submitApplicationById: (id, payload) => call({ path: `/applications/${id}/submit`, method: "POST", data: payload }),
    uploadFile: (file, business = "application") => {
      const data = new FormData();
      data.append("file", file);
      data.append("business", business);
      return call({ path: "/files/upload", method: "POST", data });
    },
    downloadFile: (file) => requestBlob({
      path: apiPath(file.url || `/files/${file.id}/download`),
      data: { name: file.name },
      session: sessionRef.value,
    }),
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
    createHonor: (payload) => call({ path: "/honors", method: "POST", data: payload }),
    updateHonor: (id, payload) => call({ path: `/honors/${id}`, method: "PUT", data: payload }),

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
