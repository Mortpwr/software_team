export function createSystemApi(call, { getApiConfig, configureApi }) {
  return {
    getApiConfig,
    configureApi,
    login: (payload) => call({ path: "/auth/login", method: "POST", data: payload }),
    getRuntime: () => call({ path: "/runtime" }),
    getSessionInfo: () => call({ path: "/session" }),
  };
}
