<script setup>
import { inject, onMounted, reactive, ref } from "vue";
import { APPROVAL, ROLES } from "../data/seed.js";
import { formatTime } from "../utils.js";

const api = inject("api");
const session = inject("session");
const toast = inject("toast");

const summary = ref(null);
const applications = ref([]);
const batches = ref([]);
const logs = ref([]);
const leader = ref(null);
const misses = ref([]);
const sms = ref([]);
const selectedApplication = ref(null);
const noticeForm = reactive({
  title: "",
  summary: "",
  content: "",
  tags: "通知,党团",
  kind: "all",
  value: "",
});

onMounted(load);

async function load() {
  if (session.value.role === ROLES.STUDENT) return;
  summary.value = await api.getWorkbenchSummary();
  applications.value = (await api.listApplications({ scope: "workbench" }).catch(() => ({ list: [] }))).list || [];
  batches.value = (await api.listWorkbenchBatches().catch(() => ({ list: [] }))).list || [];
  misses.value = (await api.listKnowledgeMisses().catch(() => ({ list: [] }))).list || [];
  sms.value = (await api.listSmsSimulations().catch(() => ({ list: [] }))).list || [];
  logs.value = (await api.listAuditLogs({ limit: 20 }).catch(() => ({ list: [] }))).list || [];
  leader.value = session.value.role === ROLES.LEADER
    ? await api.getLeaderDashboard().catch(() => null)
    : null;
}

async function publishNotice() {
  const tags = noticeForm.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  await api.publishNotice({
    title: noticeForm.title,
    summary: noticeForm.summary,
    content: noticeForm.content,
    tags,
    targetRule: { kind: noticeForm.kind, value: noticeForm.value },
  });
  toast("已生成通知批次");
  Object.assign(noticeForm, { title: "", summary: "", content: "", tags: "通知,党团", kind: "all", value: "" });
  await load();
}

async function decide(id, action) {
  const message = action === "reject" ? "驳回原因" : "审批意见";
  const text = window.prompt(message, action === "reject" ? "材料不全，请补充后重提。" : "同意。") || "";
  const payload = action === "reject" ? { reason: text } : { comment: text };
  await api.decideApplication(id, action, payload);
  toast("操作完成");
  selectedApplication.value = null;
  await load();
}

async function openApplication(item) {
  selectedApplication.value = await api.getApplication(item.id).catch(() => item);
}

function decisionButtons(item) {
  if (item.status === APPROVAL.PENDING) return ["approve", "reject"];
  if ([APPROVAL.APPROVED, APPROVAL.REJECTED].includes(item.status)) return ["revoke", "reapprove"];
  return [];
}

function decisionLabel(action) {
  return { approve: "通过", reject: "驳回", revoke: "撤回", reapprove: "重批" }[action] || action;
}
</script>

<template>
  <div v-if="session.role === ROLES.STUDENT" class="card">
    当前为学生身份。请切换为管理老师、协同管理者或学院领导查看工作台。
  </div>

  <template v-else>
    <div class="grid cols-3">
      <div class="card"><div class="muted">在册学生</div><div style="font-size:28px;font-weight:700">{{ summary?.students }}</div></div>
      <div class="card"><div class="muted">待审批</div><div style="font-size:28px;font-weight:700">{{ summary?.pendingApps }}</div></div>
      <div class="card"><div class="muted">通知批次</div><div style="font-size:28px;font-weight:700">{{ summary?.batches }}</div></div>
      <div class="card"><div class="muted">未命中词</div><div style="font-size:28px;font-weight:700">{{ misses.length || summary?.miss || 0 }}</div></div>
      <div class="card"><div class="muted">短信模拟</div><div style="font-size:28px;font-weight:700">{{ sms.length || summary?.sms || 0 }}</div></div>
    </div>

    <div v-if="leader" class="section-title">领导看板</div>
    <div v-if="leader" class="card">
      政策条目 {{ leader.knowledgeCount }} · 通知 {{ leader.noticeCount }} · 学业高风险 {{ leader.academicHighRiskStudents }}
    </div>

    <div class="grid cols-2">
      <section>
        <div class="section-title">审批处理</div>
        <div class="stack">
          <article v-for="item in applications" :key="item.id" class="card">
            <div class="row between">
              <strong>{{ item.type }} · {{ item.subtype }}</strong>
              <span class="tag">{{ item.status }}</span>
            </div>
            <p>{{ item.studentId }} · {{ item.form?.reason }}</p>
            <div class="row wrap" v-if="session.role === ROLES.TEACHER">
              <button @click="openApplication(item)">详情</button>
              <button
                v-for="action in decisionButtons(item)"
                :key="action"
                :class="{ primary: action === 'approve' }"
                @click="decide(item.id, action)"
              >
                {{ decisionLabel(action) }}
              </button>
            </div>
          </article>
          <div v-if="!applications.length" class="empty card">暂无可查看申请</div>
        </div>
      </section>

      <section class="card">
        <h3>定向通知发布</h3>
        <form class="stack" @submit.prevent="publishNotice">
          <input v-model="noticeForm.title" placeholder="标题" required />
          <input v-model="noticeForm.summary" placeholder="摘要" />
          <textarea v-model="noticeForm.content" placeholder="正文"></textarea>
          <input v-model="noticeForm.tags" placeholder="标签，逗号分隔" />
          <select v-model="noticeForm.kind">
            <option value="all">全体</option>
            <option value="grade">按年级</option>
            <option value="major">按专业</option>
          </select>
          <input v-model="noticeForm.value" placeholder="规则值，如 2024级 / 软件工程" />
          <button class="primary" :disabled="session.role === ROLES.LEADER">发布</button>
        </form>
      </section>
    </div>

    <section v-if="selectedApplication" class="card">
      <div class="row between">
        <h3>审批详情</h3>
        <span class="tag">{{ selectedApplication.status }}</span>
      </div>
      <p>{{ selectedApplication.studentId }} · {{ selectedApplication.type }} · {{ selectedApplication.subtype }}</p>
      <p class="muted">说明：{{ selectedApplication.form?.reason || "未填写" }}</p>
      <div class="section-title">审批轨迹</div>
      <div class="stack">
        <div v-for="row in selectedApplication.auditTrail || []" :key="`${row.at}-${row.action}`" class="card muted">
          {{ formatTime(row.at) }} · {{ row.actor }} · {{ row.action }}
          <span v-if="row.remark"> · {{ row.remark }}</span>
        </div>
      </div>
    </section>

    <div class="section-title">批次统计</div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>批次</th><th>渠道</th><th>发送/失败</th><th>送达/失败</th><th>已读</th></tr>
        </thead>
        <tbody>
          <template v-for="batch in batches" :key="batch.id">
            <tr v-for="channel in batch.channels" :key="`${batch.id}-${channel.name}`">
              <td>{{ batch.title }}<br /><span class="muted">{{ batch.id }}</span></td>
              <td>{{ channel.name }}</td>
              <td>{{ channel.sendOk }}/{{ channel.sendFail }}</td>
              <td>{{ channel.deliverOk }}/{{ channel.deliverFail }}</td>
              <td>{{ channel.read }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="section-title">高频未命中词</div>
    <div class="stack">
      <div v-for="item in misses.slice(0, 5)" :key="item.keyword" class="card row between">
        <strong>{{ item.keyword }}</strong>
        <span class="tag">{{ item.count }} 次</span>
      </div>
      <div v-if="!misses.length" class="empty card">暂无未命中词记录</div>
    </div>

    <div class="section-title">审计日志</div>
    <div class="stack">
      <div v-for="item in logs" :key="item.id" class="card muted">
        {{ formatTime(item.at) }} · {{ item.role }} · {{ item.actorId }} · {{ item.action }} → {{ item.target }}
      </div>
    </div>
  </template>
</template>
