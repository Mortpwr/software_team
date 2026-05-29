<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from "vue";

const api = inject("api");
const toast = inject("toast");
const session = inject("session");
const filter = reactive({ major: "", category: "", year: "", grade: "", q: "" });
const honors = ref([]);
const loadError = ref("");
const scholarshipItems = computed(() => honors.value.filter((item) => String(item.category || "").includes("奖学金")));

onMounted(load);
watch(() => session.value.token, (token) => {
  if (token) load();
  else {
    honors.value = [];
    loadError.value = "请先登录后查看奖励荣誉。";
  }
});

async function load() {
  if (!session.value.token) {
    honors.value = [];
    loadError.value = "请先登录后查看奖励荣誉。";
    return;
  }
  try {
    const data = Object.fromEntries(Object.entries(filter).filter(([, value]) => value));
    const res = await api.listHonors(data);
    honors.value = res.list || [];
    loadError.value = "";
  } catch (error) {
    honors.value = [];
    loadError.value = error.message || "荣誉数据加载失败";
  }
}

function useCategory(category) {
  filter.category = category;
  load();
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadAttachment(file) {
  try {
    const blob = await api.downloadFile(file);
    saveBlob(blob, file.name || "honor-attachment");
    toast("证明材料下载已开始");
  } catch (error) {
    toast(error.message || "证明材料下载失败");
  }
}
</script>

<template>
  <form class="toolbar" @submit.prevent="load">
    <input v-model="filter.q" placeholder="荣誉名/获奖人" />
    <input v-model="filter.year" type="number" placeholder="年份" min="2000" max="2100" />
    <input v-model="filter.grade" placeholder="年级，如 2024级" />
    <input v-model="filter.major" placeholder="专业关键词" />
    <select v-model="filter.category">
      <option value="">全部类别</option>
      <option>国家级</option>
      <option>校级</option>
      <option>省部级</option>
      <option>综合类奖学金</option>
      <option>捐赠类奖学金</option>
    </select>
    <button class="primary">筛选</button>
  </form>

  <div v-if="loadError" class="card">
    <strong>荣誉数据加载失败</strong>
    <p class="muted">{{ loadError }}</p>
  </div>

  <section v-if="scholarshipItems.length" class="card scholarship-panel">
    <div class="row between wrap">
      <div>
        <h3>2025 综合类奖学金评审</h3>
        <p class="muted">已入库 {{ scholarshipItems.length }} 个奖项，包含综合类奖学金与捐赠类奖学金。</p>
      </div>
      <div class="row wrap">
        <button type="button" @click="useCategory('综合类奖学金')">综合类</button>
        <button type="button" @click="useCategory('捐赠类奖学金')">捐赠类</button>
      </div>
    </div>
    <div class="scholarship-list">
      <article v-for="item in scholarshipItems.slice(0, 6)" :key="item.id" class="scholarship-item">
        <strong>{{ item.title }}</strong>
        <span class="tag green">{{ item.category }}</span>
        <p class="muted">{{ item.intro }}</p>
      </article>
    </div>
  </section>

  <div class="grid cols-3">
    <article v-for="item in honors" :key="item.id" class="card">
      <h3>{{ item.title }}</h3>
      <p>{{ item.winner }} · {{ item.grade }} · {{ item.major }}</p>
      <p>
        <span class="tag">{{ item.year }}</span>
        <span class="tag green">{{ item.category }}</span>
      </p>
      <p class="muted">{{ item.intro }}</p>
      <div v-if="item.attachments?.length" class="row wrap">
        <button v-for="file in item.attachments" :key="file.id || file.name" @click="downloadAttachment(file)">
          {{ file.name }}
        </button>
      </div>
    </article>
  </div>

  <div v-if="!loadError && !honors.length" class="card">
    <p class="muted">暂无匹配荣誉条目，请调整筛选条件。</p>
  </div>
</template>

<style scoped>
.scholarship-panel {
  margin-bottom: 16px;
}
.scholarship-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.scholarship-item {
  min-height: 128px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.72);
}
.scholarship-item strong {
  display: block;
  margin-bottom: 8px;
  line-height: 1.4;
}
.scholarship-item p {
  margin-bottom: 0;
  line-height: 1.6;
}
@media (max-width: 900px) {
  .scholarship-list {
    grid-template-columns: 1fr;
  }
}
</style>
