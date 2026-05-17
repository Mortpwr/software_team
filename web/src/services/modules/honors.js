export function createHonorsApi(call) {
  return {
    listHonors: (query = {}) => call({ path: "/honors", data: query }),
    createHonor: (payload) => call({ path: "/honors", method: "POST", data: payload }),
    updateHonor: (id, payload) => call({ path: `/honors/${id}`, method: "PUT", data: payload }),
  };
}
