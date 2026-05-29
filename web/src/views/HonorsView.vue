<script setup>
import { inject, onMounted, reactive, ref } from "vue";

const api = inject("api");
const toast = inject("toast");
const filter = reactive({ major: "", category: "", year: "", grade: "", q: "" });
const honors = ref([]);

onMounted(load);

async function load() {
  const data = Object.fromEntries(Object.entries(filter).filter(([, value]) => value));
  const res = await api.listHonors(data);
  honors.value = res.list || [];
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
</template>
