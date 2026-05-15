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

const api = createApi(session);

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
  if (!canAccessRoute(route.value, role)) go("home");
}

function onStudentChange(event) {
  setSession({ ...session.value, studentId: event.target.value });
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
          <select :value="session.role" @change="onRoleChange">
            <option v-for="(label, id) in ROLE_LABEL" :key="id" :value="id">{{ label }}</option>
          </select>
          <select :value="session.studentId" @change="onStudentChange">
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
