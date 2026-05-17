export function createKnowledgeApi(call) {
  return {
    searchKnowledge: (query) => call({ path: "/knowledge", data: query }),
    recordKnowledgeMiss: (keyword) => call({ path: "/knowledge/miss", method: "POST", data: { keyword } }),
    listKnowledgeAdmin: () => call({ path: "/knowledge/admin/list" }),
    createKnowledge: (payload) => call({ path: "/knowledge", method: "POST", data: payload }),
    updateKnowledge: (id, payload) => call({ path: `/knowledge/${id}`, method: "PUT", data: payload }),
    setKnowledgeOnline: (id, online) => call({ path: `/knowledge/${id}/online`, method: "POST", data: { online } }),
  };
}
