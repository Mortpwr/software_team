import { mockRequest } from "./mockGateway.js";

const config = {
  mode: localStorage.getItem("ss_web_api_mode") || "mock",
  baseUrl: localStorage.getItem("ss_web_api_base_url") || "",
};

export function configureApi(next) {
  Object.assign(config, next || {});
}

function isFormData(data) {
  return typeof FormData !== "undefined" && data instanceof FormData;
}

function buildUrl(path, data = {}) {
  const url = new URL(`${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url;
}

function authHeaders(session, includeJson = true) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: session?.token ? `Bearer ${session.token}` : "",
    "X-Student-Id": session?.studentId || "",
    "X-Role": session?.role || "student",
  };
}

export async function request({ path, method = "GET", data = {}, session }) {
  if (config.mode === "mock") {
    return mockRequest({ path, method, data, session });
  }
  const verb = method.toUpperCase();
  const upload = isFormData(data);
  const url = buildUrl(path, verb === "GET" ? data : {});
  const res = await fetch(url.toString(), {
    method,
    headers: authHeaders(session, !upload),
    body: verb === "GET" ? undefined : upload ? data : JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function requestBlob({ path, data = {}, session }) {
  if (config.mode === "mock") {
    const label = data?.name || path.split("/").filter(Boolean).pop() || "download";
    return new Blob([`Mock download: ${label}\n`], { type: "text/plain;charset=utf-8" });
  }
  const res = await fetch(buildUrl(path, data).toString(), {
    method: "GET",
    headers: authHeaders(session, false),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
