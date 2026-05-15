import { mockRequest } from "./mockGateway.js";

const config = {
  mode: localStorage.getItem("ss_web_api_mode") || "mock",
  baseUrl: localStorage.getItem("ss_web_api_base_url") || "",
};

export function configureApi(next) {
  Object.assign(config, next || {});
}

export async function request({ path, method = "GET", data = {}, session }) {
  if (config.mode === "mock") {
    return mockRequest({ path, method, data, session });
  }
  const res = await fetch(`${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: session?.token ? `Bearer ${session.token}` : "",
      "X-Student-Id": session?.studentId || "",
      "X-Role": session?.role || "student",
    },
    body: method.toUpperCase() === "GET" ? undefined : JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
