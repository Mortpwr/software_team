<script setup>
import { computed, onMounted, provide, ref, watchEffect } from "vue";
import { ROLE_LABEL } from "./data/seed.js";
import { configureApi, getApiConfig } from "./api/client.js";
import { getSession, setSession } from "./state/session.js";
import { createApi } from "./services/api.js";
import { canAccessRoute, go, mobileRouteIds, readRoute, routes, visibleRoutes as getVisibleRoutes } from "./state/routes.js";
import HomeView from "./views/HomeView.vue";
import KnowledgeView from "./views/KnowledgeView.vue";
import PartyView from "./views/PartyView.vue";
import ApplyView from "./views/ApplyView.vue";
import NoticesView from "./views/NoticesView.vue";
import HonorsView from "./views/HonorsView.vue";
import AcademicView from "./views/AcademicView.vue";
import ProfileView from "./views/ProfileView.vue";
import WorkbenchView from "./views/WorkbenchView.vue";
import HelpView from "./views/HelpView.vue";

const route = ref(readRoute());
const session = ref(getSession());
const toastText = ref("");
const loginBusy = ref(false);
const loginForm = ref({ studentId: session.value.studentId, password: "" });

const api = createApi(session);
const apiConfig = ref(getApiConfig());

provide("api", api);
provide("session", session);
provide("toast", showToast);
provide("reloadShell", reloadShell);

const viewMap = {
  home: HomeView,
  knowledge: KnowledgeView,
  party: PartyView,
  apply: ApplyView,
  notices: NoticesView,
  honors: HonorsView,
  academic: AcademicView,
  profile: ProfileView,
  workbench: WorkbenchView,
  help: HelpView,
};

const activeRoute = computed(() => (canAccessRoute(route.value, session.value.role) ? route.value : "home"));
const visibleNavRoutes = computed(() => getVisibleRoutes(session.value.role));
const currentView = computed(() => viewMap[activeRoute.value] || HomeView);
const currentTitle = computed(() => routes.find((item) => item.id === activeRoute.value)?.label || "首页");
const mobileRoutes = computed(() => visibleNavRoutes.value.filter((item) => mobileRouteIds.includes(item.id)));
const roleLabel = computed(() => ROLE_LABEL[session.value.role] || "未登录");
const apiBaseUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || "/api";

window.addEventListener("hashchange", () => {
  route.value = readRoute();
});

window.addEventListener("sessionchange", () => {
  session.value = getSession();
});

window.addEventListener("authrequired", () => {
  setSession({ studentId: "", role: "student", token: "" });
  loginForm.value = { studentId: "", password: "" };
  go("home");
  showToast("登录已过期，请重新登录");
});

onMounted(() => {
  configureApi({ mode: "remote", baseUrl: apiBaseUrl });
  apiConfig.value = getApiConfig();
});

watchEffect(() => {
  document.title = `${currentTitle.value} - 学院学生综合服务`;
});

async function loginRemote() {
  loginBusy.value = true;
  try {
    const result = await api.login(loginForm.value);
    setSession({ studentId: result.studentId, role: result.role, token: result.token });
    if (!canAccessRoute(route.value, result.role)) go("home");
    showToast("登录成功");
  } catch (error) {
    showToast("登录失败，请检查身份与口令");
  } finally {
    loginBusy.value = false;
  }
}

function logoutRemote() {
  setSession({ studentId: "", role: "student", token: "" });
  loginForm.value = { studentId: "", password: "" };
  go("home");
  showToast("已退出登录");
}

function showToast(message) {
  toastText.value = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastText.value = "";
  }, 2200);
}

function reloadShell() {
  session.value = getSession();
  loginForm.value.studentId = session.value.studentId;
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">学院学生综合服务与党团管理平台</div>
        <div class="brand-sub">学生事务 · 党团管理 · 综合服务</div>
      </div>
      <nav class="nav">
        <a
          v-for="item in visibleNavRoutes"
          :key="item.id"
          href="#"
          :class="{ active: activeRoute === item.id }"
          @click.prevent="go(item.id)"
        >
          {{ item.label }}
        </a>
      </nav>
    </aside>

    <main class="main">
      <div class="topbar">
      <h1 class="page-title">{{ currentTitle }}</h1>
        <div class="session-panel">
          <span class="tag green">
            数据源 正式服务
          </span>
          <template v-if="!session.token">
            <input v-model="loginForm.studentId" placeholder="请输入学号" />
            <input v-model="loginForm.password" type="password" placeholder="请输入登录密码" />
            <button :disabled="loginBusy" @click="loginRemote">
              {{ loginBusy ? "登录中" : "登录" }}
            </button>
          </template>
          <template v-else>
            <span class="tag gray">{{ roleLabel }}</span>
            <span class="tag gray">{{ session.studentId }}</span>
            <button @click="logoutRemote">退出</button>
          </template>
        </div>
      </div>

      <div class="view-stage" :key="activeRoute">
        <component :is="currentView" />
      </div>
    </main>
  </div>

  <nav class="mobile-tabs">
    <a
      v-for="item in mobileRoutes"
      :key="item.id"
      href="#"
      :class="{ active: activeRoute === item.id }"
      @click.prevent="go(item.id)"
    >
      {{ item.label.slice(0, 4) }}
    </a>
  </nav>

  <div id="toast-root">
    <div v-if="toastText" class="toast">{{ toastText }}</div>
  </div>
</template>
