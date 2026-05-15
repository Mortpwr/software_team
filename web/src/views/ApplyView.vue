<script setup>
import { inject, onMounted, reactive, ref } from "vue";
import { APPROVAL } from "../data/seed.js";
import { formatTime } from "../utils.js";

const api = inject("api");
const toast = inject("toast");
const applications = ref([]);
const selected = ref(null);
const form = reactive({
  id: "",
  status: "",
  type: "证明申请",
  subtype: "在读证明",
  reason: "",
  startDate: "",
  endDate: "",
  files: [],
});

onMounted(load);

async function load() {
  const [res, draft] = await Promise.all([
    api.listApplications(),
    api.getApplicationDraft().catch(() => null),
  ]);
  applications.value = res.list || [];
  if (draft && !form.id) fillForm(draft);
}

function onFiles(event) {
  form.files = Array.from(event.target.files || []);
}

function buildPayload() {
  return {
    type: form.type,
    subtype: form.subtype,
    form: {
      reason: form.reason,
      startDate: form.startDate,
      endDate: form.endDate,
    },
    attachments: form.files.map((file) => ({ name: file.name, size: file.size })),
  };
}

function fillForm(item) {
  Object.assign(form, {
    id: item.id || "",
    status: item.status || "",
    type: item.type || "证明申请",
    subtype: item.subtype || "在读证明",
    reason: item.form?.reason || "",
    startDate: item.form?.startDate || "",
    endDate: item.form?.endDate || "",
    files: item.attachments || [],
  });
  selected.value = item;
}

function resetForm() {
  Object.assign(form, {
    id: "",
    status: "",
    type: "证明申请",
    subtype: "在读证明",
    reason: "",
    startDate: "",
    endDate: "",
    files: [],
  });
}

async function saveDraft() {
  const draft = await api.saveApplicationDraft(buildPayload());
  fillForm(draft);
  toast("草稿已保存");
  await load();
}

async function submit() {
  if (!form.reason.trim()) {
    toast("请填写申请说明");
    return;
  }
  if (form.type === "盖章申请" && form.files.length === 0) {
    toast("盖章申请须上传附件");
    return;
  }
  const payload = buildPayload();
  if (form.id && [APPROVAL.DRAFT, APPROVAL.REJECTED].includes(form.status)) {
    await api.submitApplicationById(form.id, payload);
    toast(form.status === APPROVAL.REJECTED ? "已重新提交审批" : "草稿已提交审批");
  } else {
    await api.submitApplication(payload);
    toast("已提交审批");
  }
  resetForm();
  await load();
}

async function openDetail(item) {
  selected.value = await api.getApplication(item.id).catch(() => item);
}
</script>

<template>
  <div class="grid cols-2">
    <section class="card">
      <h3>发起办事申请</h3>
      <form class="form-grid" @submit.prevent="submit">
        <div v-if="form.id" class="span-2 muted">
          正在编辑：{{ form.id }} · {{ form.status }}
        </div>
        <label>
          申请类型
          <select v-model="form.type">
            <option>证明申请</option>
            <option>请假申请</option>
            <option>盖章申请</option>
          </select>
        </label>
        <label>
          子类
          <input v-model="form.subtype" />
        </label>
        <label class="span-2">
          申请说明
          <textarea v-model="form.reason" placeholder="请填写事由；涉密内容请备注并转线下流程"></textarea>
        </label>
        <label>
          开始日期
          <input v-model="form.startDate" type="date" />
        </label>
        <label>
          结束日期
          <input v-model="form.endDate" type="date" />
        </label>
        <label class="span-2">
          附件
          <input type="file" multiple @change="onFiles" />
          <span class="muted" v-if="form.files.length">已选择/保留 {{ form.files.length }} 个附件</span>
        </label>
        <div class="span-2 row">
          <button type="button" @click="saveDraft">保存草稿</button>
          <button class="primary">提交审批</button>
          <button type="button" @click="resetForm">新建</button>
        </div>
      </form>
    </section>

    <section>
      <div class="section-title">我的申请</div>
      <div class="stack">
        <article v-for="item in applications" :key="item.id" class="card">
          <div class="row between">
            <strong>{{ item.type }} · {{ item.subtype }}</strong>
            <span class="tag">{{ item.status }}</span>
          </div>
          <p>{{ item.form?.reason }}</p>
          <p class="muted">
            {{ formatTime(item.createdAt) }}
            <span v-if="item.teacherComment"> · {{ item.teacherComment }}</span>
          </p>
          <div class="row wrap">
            <button @click="openDetail(item)">查看详情</button>
            <button
              v-if="[APPROVAL.DRAFT, APPROVAL.REJECTED].includes(item.status)"
              class="primary"
              @click="fillForm(item)"
            >
              {{ item.status === APPROVAL.REJECTED ? "修改后重提" : "继续编辑" }}
            </button>
          </div>
        </article>
        <div v-if="!applications.length" class="empty card">暂无申请</div>
      </div>
    </section>
  </div>

  <section v-if="selected" class="card">
    <div class="row between">
      <h3>申请详情</h3>
      <span class="tag">{{ selected.status }}</span>
    </div>
    <p>{{ selected.type }} · {{ selected.subtype }} · {{ selected.id }}</p>
    <p class="muted">说明：{{ selected.form?.reason || "未填写" }}</p>
    <div class="section-title">审批轨迹</div>
    <div class="stack">
      <div v-for="row in selected.auditTrail || []" :key="`${row.at}-${row.action}`" class="card muted">
        {{ formatTime(row.at) }} · {{ row.actor }} · {{ row.action }}
        <span v-if="row.remark"> · {{ row.remark }}</span>
      </div>
    </div>
  </section>
</template>
