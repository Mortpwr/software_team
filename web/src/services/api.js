import { configureApi, getApiConfig, request as rawRequest, requestBlob } from "../api/client.js";
import { createAcademicApi } from "./modules/academic.js";
import { createApplicationsApi } from "./modules/applications.js";
import { createFilesApi } from "./modules/files.js";
import { createHonorsApi } from "./modules/honors.js";
import { createKnowledgeApi } from "./modules/knowledge.js";
import { createNoticesApi } from "./modules/notices.js";
import { createPartyTheoryApi } from "./modules/partyTheory.js";
import { createStudentsApi } from "./modules/students.js";
import { createSystemApi } from "./modules/system.js";
import { createWorkbenchApi } from "./modules/workbench.js";

function apiPath(path) {
  if (!path) return "";
  return path.startsWith("/api/") ? path.slice(4) : path;
}

export function createApi(sessionRef) {
  const call = (options) => rawRequest({
    ...options,
    session: sessionRef.value,
  });
  const helpers = { apiPath, configureApi, getApiConfig, requestBlob, sessionRef };

  return {
    request: call,
    ...createSystemApi(call, helpers),
    ...createStudentsApi(call, helpers),
    ...createFilesApi(call, helpers),
    ...createKnowledgeApi(call, helpers),
    ...createPartyTheoryApi(call, helpers),
    ...createApplicationsApi(call, helpers),
    ...createNoticesApi(call, helpers),
    ...createHonorsApi(call, helpers),
    ...createAcademicApi(call, helpers),
    ...createWorkbenchApi(call, helpers),
  };
}
