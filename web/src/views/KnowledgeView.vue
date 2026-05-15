<script setup>
import { inject, onMounted, reactive, ref } from "vue";
import { formatTime } from "../utils.js";

const api = inject("api");
const toast = inject("toast");
const query = reactive({ q: "", category: "全部" });
const list = ref([]);
const categories = ref(["全部"]);
const templates = ref([]);

onMounted(load);

async function load() {
  const res = await api.searchKnowledge(query);
  list.value = res.list || [];
  categories.value = res.categories || ["全部"];
  templates.value = res.templates || [];
  if (query.q.trim() && list.value.length === 0) {
    await api.recordKnowledgeMiss(query.q.trim());
  }
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadTemplate(item) {
  const blob = await api.downloadTemplate(item);
  saveBlob(blob, `${item.name}.${item.format || "txt"}`);
  toast("模板下载已开始");
}
</script>

<template>
  <form class="toolbar" @submit.prevent="load">
    <input v-model="query.q" placeholder="输入关键词，如：奖助学金、宿舍、休学" />
    <select v-model="query.category" @change="load">
      <option v-for="item in categories" :key="item">{{ item }}</option>
    </select>
    <button class="primary">搜索</button>
  </form>

  <div class="grid cols-2">
    <section>
      <div class="section-title">政策条目</div>
      <div v-if="list.length" class="stack">
        <article v-for="item in list" :key="item.id" class="card">
          <div class="row between">
            <h3 class="item-title">{{ item.title }}</h3>
            <span class="tag">{{ item.category }}</span>
          </div>
          <p>{{ item.summary }}</p>
          <p>
            <span v-for="tag in item.tags" :key="tag" class="tag gray">{{ tag }}</span>
          </p>
          <p class="muted">更新：{{ formatTime(item.updatedAt) }}</p>
          <p v-if="item.sensitiveHint" class="muted">敏感内容仅展示摘要，请走官方渠道。</p>
        </article>
      </div>
      <div v-else class="empty card">未命中，已写入高频未命中词队列。</div>
    </section>

    <section>
      <div class="section-title">常用模板</div>
      <div class="stack">
        <div v-for="item in templates" :key="item.id" class="card row between">
          <div>
            <strong>{{ item.name }}</strong>
            <div class="muted">{{ item.scene }} · {{ item.format }}</div>
          </div>
          <button @click="downloadTemplate(item)">下载</button>
        </div>
      </div>
    </section>
  </div>
</template>
