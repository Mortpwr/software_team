<script setup>
import { computed, provide, ref, watchEffect } from "vue";
import { ROLE_LABEL } from "./data/seed.js";
import { readDb } from "./api/store.js";
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

const route = ref(readRoute());
const db = ref(readDb());
const session = ref(getSession(db.value));
const toastText = ref("");
const loginBusy = ref(false);
const loginForm = ref({ studentId: session.value.studentId, role: session.value.role, password: "demo123456" });

const api = createApi(session);
const apiConfig = ref(api.getApiConfig());

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
};

const activeRoute = computed(() => (canAccessRoute(route.value, session.value.role) ? route.value : "home"));
const visibleNavRoutes = computed(() => getVisibleRoutes(session.value.role));
const currentView = computed(() => viewMap[activeRoute.value] || HomeView);
const currentTitle = computed(() => routes.find((item) => item.id === activeRoute.value)?.label || "首页");
const mobileRoutes = computed(() => visibleNavRoutes.value.filter((item) => mobileRouteIds.includes(item.id)));
const studentOptions = computed(() => db.value.students || []);

window.addEventListener("hashchange", () => {
  route.value = readRoute();
});

window.addEventListener("sessionchange", () => {
  db.value = readDb();
  session.value = getSession(db.value);
});

watchEffect(() => {
  document.title = `${currentTitle.value} - 学院学生综合服务`;
});

function onRoleChange(event) {
  const role = event.target.value;
  setSession({ ...session.value, role });
  loginForm.value.role = role;
  if (!canAccessRoute(route.value, role)) go("home");
}

function onStudentChange(event) {
  const studentId = event.target.value;
  setSession({ ...session.value, studentId });
  loginForm.value.studentId = studentId;
}

function switchApiMode(mode) {
  const baseUrl = mode === "remote" ? (apiConfig.value.baseUrl || "http://127.0.0.1:8000/api") : apiConfig.value.baseUrl;
  api.configureApi({ mode, baseUrl });
  apiConfig.value = api.getApiConfig();
  if (mode === "remote") {
    setSession({ ...session.value, token: "" });
  } else if (!session.value.token) {
    setSession({ ...session.value, token: "web-mock" });
  }
  showToast(mode === "remote" ? "已切换到 FastAPI 后端" : "已切换到本地 mock");
}

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
  setSession({ ...session.value, token: "" });
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
  db.value = readDb();
  session.value = getSession(db.value);
  loginForm.value.studentId = session.value.studentId;
  loginForm.value.role = session.value.role;
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">学院学生综合服务</div>
        <div class="brand-sub">Vue 3 + Vite · 模块化 API · 可切后端</div>
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
          <span class="tag" :class="apiConfig.mode === 'remote' ? 'green' : 'gray'">
            API {{ apiConfig.mode }}
          </span>
          <button v-if="apiConfig.mode !== 'remote'" @click="switchApiMode('remote')">Remote</button>
          <button v-else @click="switchApiMode('mock')">Mock</button>
          <template v-if="apiConfig.mode === 'remote'">
            <select v-model="loginForm.role" :disabled="Boolean(session.token)">
              <option v-for="(label, id) in ROLE_LABEL" :key="id" :value="id">{{ label }}</option>
            </select>
            <select v-model="loginForm.studentId" :disabled="Boolean(session.token)">
              <option v-for="student in studentOptions" :key="student.studentId" :value="student.studentId">
                {{ student.name }} {{ student.studentId }}
              </option>
            </select>
            <input v-if="!session.token" v-model="loginForm.password" type="password" placeholder="登录口令" />
            <button v-if="!session.token" :disabled="loginBusy" @click="loginRemote">
              {{ loginBusy ? "登录中" : "登录" }}
            </button>
            <button v-else @click="logoutRemote">退出</button>
          </template>
          <select v-if="apiConfig.mode !== 'remote'" :value="session.role" @change="onRoleChange">
            <option v-for="(label, id) in ROLE_LABEL" :key="id" :value="id">{{ label }}</option>
          </select>
          <select v-if="apiConfig.mode !== 'remote'" :value="session.studentId" @change="onStudentChange">
            <option v-for="student in studentOptions" :key="student.studentId" :value="student.studentId">
              {{ student.name }} {{ student.studentId }}
            </option>
          </select>
        </div>
      </div>

      <component :is="currentView" />
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
