import { ROLES } from "../data/seed.js";

const allRoles = [ROLES.STUDENT, ROLES.TEACHER, ROLES.COORDINATOR, ROLES.LEADER];
const managementRoles = [ROLES.TEACHER, ROLES.COORDINATOR, ROLES.LEADER];

export const routes = [
  { id: "home", label: "首页", roles: allRoles },
  { id: "knowledge", label: "政策知识库", roles: allRoles },
  { id: "party", label: "党团流程", roles: [ROLES.STUDENT, ROLES.TEACHER] },
  { id: "apply", label: "办事申请", roles: [ROLES.STUDENT, ROLES.TEACHER] },
  { id: "notices", label: "通知消息", roles: allRoles },
  { id: "honors", label: "奖励荣誉", roles: allRoles },
  { id: "academic", label: "学业分析", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.LEADER] },
  { id: "profile", label: "学生画像", roles: allRoles },
  { id: "workbench", label: "管理工作台", roles: managementRoles },
];

export const mobileRouteIds = ["home", "knowledge", "party", "apply", "profile"];

export function readRoute() {
  return window.location.hash.replace(/^#\/?/, "") || "home";
}

export function go(routeId) {
  window.location.hash = `#/${routeId}`;
}

export function canAccessRoute(routeId, role) {
  const route = routes.find((item) => item.id === routeId);
  return Boolean(route && route.roles.includes(role));
}

export function visibleRoutes(role) {
  return routes.filter((item) => item.roles.includes(role));
}
