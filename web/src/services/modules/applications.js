export function createApplicationsApi(call, { requestBlob, sessionRef }) {
  return {
    listApplications: (query = {}) => call({ path: "/applications", data: query }),
    getApplication: (id) => call({ path: `/applications/${id}` }),
    downloadApplicationDocument: (id) => requestBlob({
      path: `/applications/${id}/document`,
      data: { format: "doc" },
      session: sessionRef.value,
    }),
    getApplicationDraft: () => call({ path: "/applications/draft" }),
    saveApplicationDraft: (payload) => call({ path: "/applications/draft", method: "POST", data: payload }),
    submitApplication: (payload) => call({ path: "/applications", method: "POST", data: payload }),
    submitApplicationById: (id, payload) => call({ path: `/applications/${id}/submit`, method: "POST", data: payload }),
    decideApplication: (id, action, payload) => call({
      path: `/workbench/applications/${id}/${action}`,
      method: "POST",
      data: payload,
    }),
  };
}
