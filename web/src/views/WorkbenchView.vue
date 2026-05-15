<script setup>
import { inject, onMounted, reactive, ref } from "vue";
import { APPROVAL, FLOW_STAGES, ROLES } from "../data/seed.js";
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
const knowledgeItems = ref([]);
const students = ref([]);
const honors = ref([]);
const noticeForm = reactive({
  title: "",
  summary: "",
  content: "",
  tags: "通知,党团",
  kind: "all",
  value: "",
});
const knowledgeForm = reactive({
  id: "",
  title: "",
  category: "常见问题",
  tags: "",
  summary: "",
  body: "",
  sensitiveHint: false,
  online: true,
});
const partyForm = reactive({
  studentId: "",
  nextKey: "activist",
  remark: "",
});
const honorForm = reactive({
  id: "",
  title: "",
  winner: "",
  year: new Date().getFullYear(),
  major: "",
  grade: "",
  category: "校级",
  intro: "",
});

onMounted(load);

async function load() {
  if (session.value.role === ROLES.STUDENT) return;
  summary.value = await api.getWorkbenchSummary();
  applications.value = (await api.listApplications({ scope: "workbench" }).catch(() => ({ list: [] }))).list || [];
  batches.value = (await api.listWorkbenchBatches().catch(() => ({ list: [] }))).list || [];
  misses.value = (await api.listKnowledgeMisses().catch(() => ({ list: [] }))).list || [];
  sms.value = (await api.listSmsSimulations().catch(() => ({ list: [] }))).list || [];
  knowledgeItems.value = (await api.listKnowledgeAdmin().catch(() => ({ list: [] }))).list || [];
  students.value = (await api.listStudents().catch(() => ({ list: [] }))).list || [];
  honors.value = (await api.listHonors().catch(() => ({ list: [] }))).list || [];
  if (!partyForm.studentId && students.value.length) partyForm.studentId = students.value[0].studentId;
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

function resetKnowledgeForm() {
  Object.assign(knowledgeForm, {
    id: "",
    title: "",
    category: "常见问题",
    tags: "",
    summary: "",
    body: "",
    sensitiveHint: false,
    online: true,
  });
}

function editKnowledge(item) {
  Object.assign(knowledgeForm, {
    id: item.id,
    title: item.title,
    category: item.category,
    tags: (item.tags || []).join(","),
    summary: item.summary,
    body: item.body || "",
    sensitiveHint: Boolean(item.sensitiveHint),
    online: item.online !== false,
  });
}

function fillFromMiss(item) {
  Object.assign(knowledgeForm, {
    id: "",
    title: item.keyword,
    category: "常见问题",
    tags: item.keyword,
    summary: `关于“${item.keyword}”的标准答复待补充。`,
    body: "",
    sensitiveHint: false,
    online: false,
  });
}

function knowledgePayload() {
  return {
    title: knowledgeForm.title,
    category: knowledgeForm.category,
    tags: knowledgeForm.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    summary: knowledgeForm.summary,
    body: knowledgeForm.body,
    sensitiveHint: knowledgeForm.sensitiveHint,
    online: knowledgeForm.online,
  };
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveKnowledge() {
  if (!knowledgeForm.title.trim() || !knowledgeForm.summary.trim()) {
    toast("请填写知识条目标题和摘要");
    return;
  }
  if (knowledgeForm.id) {
    await api.updateKnowledge(knowledgeForm.id, knowledgePayload());
    toast("知识条目已更新");
  } else {
    await api.createKnowledge(knowledgePayload());
    toast("知识条目已创建");
  }
  resetKnowledgeForm();
  await load();
}

async function toggleKnowledge(item) {
  await api.setKnowledgeOnline(item.id, item.online === false);
  toast(item.online === false ? "已上线" : "已下线");
  await load();
}

async function advanceParty() {
  if (!partyForm.studentId || !partyForm.nextKey) {
    toast("请选择学生和目标阶段");
    return;
  }
  await api.advancePartyStage({ ...partyForm });
  toast("党团阶段已推进");
  partyForm.remark = "";
  await load();
}

async function exportStudents() {
  const blob = await api.exportStudents();
  saveBlob(blob, "学生画像导出.csv");
  toast("学生画像导出已开始");
}

function resetHonorForm() {
  Object.assign(honorForm, {
    id: "",
    title: "",
    winner: "",
    year: new Date().getFullYear(),
    major: "",
    grade: "",
    category: "校级",
    intro: "",
  });
}

function editHonor(item) {
  Object.assign(honorForm, item);
}

async function saveHonor() {
  if (!honorForm.title.trim() || !honorForm.winner.trim()) {
    toast("请填写荣誉名称和获奖人");
    return;
  }
  const payload = { ...honorForm, year: Number(honorForm.year) };
  if (honorForm.id) {
    await api.updateHonor(honorForm.id, payload);
    toast("荣誉条目已更新");
  } else {
    await api.createHonor(payload);
    toast("荣誉条目已创建");
  }
  resetHonorForm();
  await load();
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

    <section class="card" v-if="session.role === ROLES.TEACHER">
      <h3>党团阶段推进</h3>
      <form class="form-grid" @submit.prevent="advanceParty">
        <label>
          学生
          <select v-model="partyForm.studentId">
            <option v-for="student in students" :key="student.studentId" :value="student.studentId">
              {{ student.name }} {{ student.studentId }}
            </option>
          </select>
        </label>
        <label>
          目标阶段
          <select v-model="partyForm.nextKey">
            <option v-for="stage in FLOW_STAGES" :key="stage.key" :value="stage.key">{{ stage.name }}</option>
          </select>
        </label>
        <label class="span-2">
          备注
          <input v-model="partyForm.remark" placeholder="如：支部审批通过，进入下一阶段" />
        </label>
        <div class="span-2 row">
          <button class="primary">推进阶段</button>
        </div>
      </form>
    </section>

    <section class="card" v-if="session.role === ROLES.TEACHER">
      <div class="row between">
        <h3>学生画像导出</h3>
        <button class="primary" @click="exportStudents">导出 CSV</button>
      </div>
      <p class="muted">导出默认使用脱敏手机号，后续可扩展 Excel 导入和字段白名单。</p>
    </section>

    <div class="grid cols-2">
      <section class="card" v-if="session.role === ROLES.TEACHER">
        <h3>荣誉展示维护</h3>
        <form class="form-grid" @submit.prevent="saveHonor">
          <input v-model="honorForm.title" placeholder="荣誉名称" />
          <input v-model="honorForm.winner" placeholder="获奖人" />
          <input v-model="honorForm.year" type="number" placeholder="年份" />
          <input v-model="honorForm.category" placeholder="类别" />
          <input v-model="honorForm.grade" placeholder="年级" />
          <input v-model="honorForm.major" placeholder="专业" />
          <textarea v-model="honorForm.intro" class="span-2" placeholder="简介"></textarea>
          <div class="span-2 row">
            <button class="primary">{{ honorForm.id ? "保存荣誉" : "新增荣誉" }}</button>
            <button type="button" @click="resetHonorForm">清空</button>
          </div>
        </form>
      </section>

      <section>
        <div class="section-title">荣誉条目</div>
        <div class="stack">
          <article v-for="item in honors.slice(0, 5)" :key="item.id" class="card">
            <strong>{{ item.title }}</strong>
            <p class="muted">{{ item.winner }} · {{ item.year }} · {{ item.category }}</p>
            <p>{{ item.intro }}</p>
            <button v-if="session.role === ROLES.TEACHER" @click="editHonor(item)">编辑</button>
          </article>
          <div v-if="!honors.length" class="empty card">暂无荣誉条目</div>
        </div>
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
          <tr><th>批次</th><th>渠道</th><th>发送/失败</th><th>送达/失败</th><th>已读</th><th>可观测性</th></tr>
        </thead>
        <tbody>
          <template v-for="batch in batches" :key="batch.id">
            <tr v-for="channel in batch.channels" :key="`${batch.id}-${channel.name}`">
              <td>{{ batch.title }}<br /><span class="muted">{{ batch.id }}</span></td>
              <td>{{ channel.name }}</td>
              <td>{{ channel.sendOk }}/{{ channel.sendFail }}</td>
              <td>{{ channel.deliverOk }}/{{ channel.deliverFail }}</td>
              <td>{{ channel.read }}</td>
              <td>{{ channel.observability || "可观测" }}</td>
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
        <button v-if="session.role === ROLES.TEACHER" @click="fillFromMiss(item)">转为知识</button>
      </div>
      <div v-if="!misses.length" class="empty card">暂无未命中词记录</div>
    </div>

    <div class="grid cols-2">
      <section class="card">
        <h3>知识库维护</h3>
        <form class="stack" @submit.prevent="saveKnowledge">
          <input v-model="knowledgeForm.title" placeholder="标题" :disabled="session.role !== ROLES.TEACHER" />
          <input v-model="knowledgeForm.category" placeholder="分类" :disabled="session.role !== ROLES.TEACHER" />
          <input v-model="knowledgeForm.tags" placeholder="标签，逗号分隔" :disabled="session.role !== ROLES.TEACHER" />
          <textarea v-model="knowledgeForm.summary" placeholder="标准摘要" :disabled="session.role !== ROLES.TEACHER"></textarea>
          <textarea v-model="knowledgeForm.body" placeholder="详细依据、办理步骤或官方链接" :disabled="session.role !== ROLES.TEACHER"></textarea>
          <label class="row">
            <input v-model="knowledgeForm.sensitiveHint" type="checkbox" :disabled="session.role !== ROLES.TEACHER" />
            敏感内容仅展示摘要
          </label>
          <label class="row">
            <input v-model="knowledgeForm.online" type="checkbox" :disabled="session.role !== ROLES.TEACHER" />
            上线展示
          </label>
          <div class="row wrap" v-if="session.role === ROLES.TEACHER">
            <button class="primary">{{ knowledgeForm.id ? "保存修改" : "创建条目" }}</button>
            <button type="button" @click="resetKnowledgeForm">清空</button>
          </div>
        </form>
      </section>

      <section>
        <div class="section-title">知识条目</div>
        <div class="stack">
          <article v-for="item in knowledgeItems.slice(0, 6)" :key="item.id" class="card">
            <div class="row between">
              <strong>{{ item.title }}</strong>
              <span class="tag" :class="item.online === false ? 'gray' : 'green'">{{ item.online === false ? "下线" : "上线" }}</span>
            </div>
            <p class="muted">{{ item.category }} · 命中 {{ item.hitCount || 0 }}</p>
            <p>{{ item.summary }}</p>
            <div class="row wrap" v-if="session.role === ROLES.TEACHER">
              <button @click="editKnowledge(item)">编辑</button>
              <button @click="toggleKnowledge(item)">{{ item.online === false ? "上线" : "下线" }}</button>
            </div>
          </article>
          <div v-if="!knowledgeItems.length" class="empty card">暂无知识条目</div>
        </div>
      </section>
    </div>

    <div class="section-title">审计日志</div>
    <div class="stack">
      <div v-for="item in logs" :key="item.id" class="card muted">
        {{ formatTime(item.at) }} · {{ item.role }} · {{ item.actorId }} · {{ item.action }} → {{ item.target }}
      </div>
    </div>
  </template>
</template>
