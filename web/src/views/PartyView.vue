<script setup>
import { computed, inject, onMounted, reactive, ref } from "vue";
import EmptyStateCard from "../components/EmptyStateCard.vue";
import { go } from "../state/routes.js";
import { formatTime } from "../utils.js";

const api = inject("api");
const toast = inject("toast");
const tab = ref("party");
const partyFlow = ref(null);
const leagueFlow = ref(null);
const officialDocs = ref([]);
const officialGuide = ref(null);
const calendarHighlights = ref([]);
const theory = ref({ list: [] });
const theoryAnswers = ref({});
const theoryResult = ref(null);
const loadError = ref("");
const previewUrl = ref("");
const showFullSteps = ref(false);
const thoughtForm = reactive({ content: "", attachments: [] });
const thoughtReports = ref([]);
const currentQuarter = ref("");

const activeFlow = computed(() => (tab.value === "party" ? partyFlow.value : leagueFlow.value));
const officialMeta = computed(() => activeFlow.value?.officialMeta || officialGuide.value?.meta || null);
const thoughtGuide = computed(() => officialGuide.value?.thoughtReportGuide || null);
const current = computed(() => {
  if (!activeFlow.value) return null;
  return activeFlow.value.stages.find((item) => item.key === activeFlow.value.currentKey);
});
const currentRule = computed(() => {
  if (tab.value !== "party" || !partyFlow.value) return null;
  return partyFlow.value.timelineRules?.find((item) => item.stageKey === partyFlow.value.currentKey);
});
const currentStageSteps = computed(() => {
  if (!activeFlow.value?.steps) return [];
  return activeFlow.value.steps.filter((step) => step.current);
});
const passedSteps = computed(() => {
  if (!activeFlow.value?.steps) return [];
  return activeFlow.value.steps.filter((step) => step.passed);
});
const stepsByMacro = computed(() => {
  const groups = new Map();
  for (const step of activeFlow.value?.steps || []) {
    const key = step.macroStage || "其他";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(step);
  }
  return [...groups.entries()].map(([name, steps]) => ({ name, steps }));
});
const flowchartDoc = computed(() => officialDocs.value.find((d) => d.key === "flowchart"));
const certDoc = computed(() => {
  if (tab.value === "party") return officialDocs.value.find((d) => d.key === "party_cert");
  return officialDocs.value.find((d) => d.key === "league_cert");
});
const activeStepCount = computed(() => activeFlow.value?.steps?.length || (tab.value === "party" ? 29 : 15));

function groupProgress(group) {
  const steps = group.steps || [];
  const done = steps.filter((step) => step.done || step.passed || step.verified).length;
  return `${done}/${steps.length}`;
}

function groupStatusClass(group) {
  const steps = group.steps || [];
  if (steps.some((step) => step.current)) return "current";
  if (steps.length && steps.every((step) => step.done || step.passed || step.verified)) return "done";
  if (steps.every((step) => step.upcoming)) return "upcoming";
  return "";
}

onMounted(load);

async function load() {
  try {
    const [party, league, docs, guide] = await Promise.all([
      api.getPartyProgress(),
      api.getLeagueProgress().catch(() => null),
      api.getPartyOfficialDocs().catch(() => ({ list: [], calendarHighlights: [] })),
      api.getPartyOfficialGuide().catch(() => null),
    ]);
    partyFlow.value = party;
    leagueFlow.value = league;
    officialDocs.value = docs.list || [];
    officialGuide.value = guide;
    calendarHighlights.value = (await api.getPartyCalendarEvents().catch(() => ({ list: docs.calendarHighlights || [] }))).list || docs.calendarHighlights || [];
    thoughtReports.value = party.thoughtReports || [];
    currentQuarter.value = party.currentQuarter || "";
    theory.value = await api.listTheoryQuestions().catch(() => ({ list: [] }));
    loadError.value = "";
  } catch (error) {
    partyFlow.value = null;
    leagueFlow.value = null;
    loadError.value = error.message || "党团数据加载失败";
  }
}

async function markDone(taskId) {
  try {
    if (tab.value === "party") {
      await api.completePartyTask(taskId);
    } else {
      await api.completeLeagueTask(taskId);
    }
    toast("已记录完成");
    await load();
  } catch (error) {
    toast(error.message || "任务完成记录失败");
  }
}

async function markStepDone(stepId) {
  try {
    if (tab.value === "party") {
      await api.completePartyStep(stepId);
    } else {
      await api.completeLeagueStep(stepId);
    }
    toast("环节已标记完成");
    await load();
  } catch (error) {
    toast(error.message || "操作失败");
  }
}

async function submitTheory() {
  const questionIds = theory.value.list.map((q) => q.id);
  try {
    theoryResult.value = await api.submitTheoryAttempt(theoryAnswers.value, questionIds);
    toast(`理论自测得分 ${theoryResult.value.score}`);
    await load();
  } catch (error) {
    toast(error?.message || "提交失败，可能已达今日答题上限");
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

async function downloadOfficial(doc) {
  try {
    const blob = await api.downloadPartyOfficialDoc(doc.id);
    saveBlob(blob, doc.fileName || `${doc.title}.bin`);
    toast("官方文件下载已开始");
  } catch (error) {
    toast(error.message || "下载失败");
  }
}

async function previewOfficial(doc) {
  if (!doc.previewUrl) {
    toast("该文件请下载后查看");
    return;
  }
  try {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = await api.previewPartyOfficialDoc(doc.id);
  } catch (error) {
    toast("预览失败，请尝试下载");
  }
}

function isNativeFile(item) {
  return typeof File !== "undefined" && item instanceof File;
}

async function uploadStepMaterial(stepId, event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  try {
    for (const file of files) {
      const business = tab.value === "party" ? "party" : "league";
      const meta = await api.uploadFile(file, business);
      if (tab.value === "party") {
        await api.attachPartyStepMaterial(stepId, [meta]);
      } else {
        await api.attachLeagueStepMaterial(stepId, [meta]);
      }
    }
    toast("环节材料已上传");
    event.target.value = "";
    await load();
  } catch (error) {
    toast(error.message || "材料上传失败");
  }
}

async function removeStepMaterial(stepId, fileId) {
  try {
    if (tab.value === "party") {
      await api.removePartyStepMaterial(stepId, fileId);
    } else {
      await api.removeLeagueStepMaterial(stepId, fileId);
    }
    toast("已移除材料");
    await load();
  } catch (error) {
    toast(error.message || "移除失败");
  }
}

async function downloadStepFile(file) {
  try {
    const blob = await api.downloadFile(file);
    saveBlob(blob, file.name || "material");
  } catch (error) {
    toast(error.message || "下载失败");
  }
}

async function onThoughtFiles(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    const meta = await api.uploadFile(file, "party");
    thoughtForm.attachments.push(meta);
  }
  event.target.value = "";
}

async function submitThoughtReport() {
  if ((thoughtForm.content || "").trim().length < 50) {
    toast("思想汇报正文不少于 50 字");
    return;
  }
  try {
    await api.submitThoughtReport({
      quarter: currentQuarter.value,
      content: thoughtForm.content,
      attachments: thoughtForm.attachments,
    });
    thoughtForm.content = "";
    thoughtForm.attachments = [];
    toast("思想汇报已提交");
    await load();
  } catch (error) {
    toast(error.message || "提交失败");
  }
}
</script>

<template>
  <div v-if="loadError" class="card">{{ loadError }}</div>

  <div class="toolbar row wrap">
    <button :class="{ primary: tab === 'party' }" @click="tab = 'party'">入党流程</button>
    <button :class="{ primary: tab === 'league' }" @click="tab = 'league'">入团流程</button>
  </div>

  <template v-if="activeFlow">
    <section class="card official-banner">
      <div class="row between wrap">
        <div>
          <h3>官方依据</h3>
          <p class="muted">
            {{ tab === "party" ? officialMeta?.legalBasis : officialMeta?.leagueBasis }}
            · {{ tab === "party" ? officialMeta?.flowSummary : officialMeta?.leagueFlowSummary }}
          </p>
          <p class="muted" v-if="officialMeta">
            {{ tab === "party" ? officialMeta.partyOrg : officialMeta.leagueOrg }}
            · 咨询 {{ officialMeta.contactPhone }}
          </p>
        </div>
        <div class="row wrap">
          <button v-if="flowchartDoc?.previewUrl" @click="previewOfficial(flowchartDoc)">预览流程图</button>
          <button v-if="certDoc" class="primary" @click="downloadOfficial(certDoc)">下载证明模板</button>
          <button @click="go('apply')">在线申请证明</button>
        </div>
      </div>
    </section>

    <div class="card">
      <h3>{{ activeFlow.flowName }}</h3>
      <p class="muted">{{ activeFlow.reference }}</p>
      <p class="muted">
        当前阶段：<strong>{{ current?.name }}</strong>
        <span v-if="currentRule"> · 标准周期 {{ currentRule.durationDays }} 天，提前 {{ currentRule.remindBeforeDays }} 天提醒</span>
      </p>
      <p v-if="currentRule" class="muted">材料要求：{{ currentRule.material }}</p>
    </div>

    <section class="card flowchart-card">
      <div class="row between wrap">
        <div>
          <h3>{{ activeFlow.flowName }}流程图</h3>
          <p class="muted">按上传流程数据生成：{{ tab === "party" ? "5 阶段 29 环节" : "5 阶段 15 环节" }}</p>
        </div>
        <span class="tag orange">当前：{{ current?.name || "未定位" }}</span>
      </div>
      <div class="flowchart-grid" :class="{ league: tab === 'league' }">
        <article
          v-for="(group, index) in stepsByMacro"
          :key="group.name"
          class="flow-phase"
          :class="groupStatusClass(group)"
          :style="{ '--phase-index': index + 1 }"
        >
          <div class="phase-head">
            <span class="phase-number">{{ index + 1 }}</span>
            <div>
              <h4>{{ group.name }}</h4>
              <p class="muted">进度 {{ groupProgress(group) }}</p>
            </div>
          </div>
          <ol class="flow-step-list">
            <li
              v-for="step in group.steps"
              :key="step.id"
              :class="{ current: step.current, done: step.done || step.passed || step.verified, pending: step.pendingVerify }"
            >
              <span class="flow-index">{{ step.order }}</span>
              <span class="flow-title">{{ step.name }}</span>
              <span v-if="step.current" class="flow-state">当前</span>
              <span v-else-if="step.pendingVerify" class="flow-state">待确认</span>
            </li>
          </ol>
        </article>
      </div>
    </section>

    <div class="grid cols-2">
      <section>
        <div class="section-title">流程总览</div>
        <div class="card timeline">
          <div
            v-for="stage in activeFlow.stages"
            :key="stage.key"
            class="step"
            :class="{ done: stage.order < current?.order, current: stage.key === activeFlow.currentKey }"
          >
            <div class="dot"></div>
            <div>
              <div class="step-name">{{ stage.name }}</div>
              <div class="muted">{{ stage.desc }}</div>
            </div>
          </div>
        </div>

        <div class="section-title">官方文件</div>
        <div class="stack">
          <div v-for="doc in officialDocs" :key="doc.id" class="card">
            <strong>{{ doc.title }}</strong>
            <p class="muted">{{ doc.description }}</p>
            <div class="row wrap">
              <button v-if="doc.previewUrl" @click="previewOfficial(doc)">预览</button>
              <button class="primary" :disabled="!doc.available" @click="downloadOfficial(doc)">下载</button>
            </div>
          </div>
          <EmptyStateCard v-if="!officialDocs.length" text="暂无官方文件" />
        </div>
        <img v-if="previewUrl" :src="previewUrl" alt="官方文件预览" class="preview-image" />
      </section>

      <section>
        <div class="section-title">当前阶段环节（官方 {{ currentStageSteps.length }} 项）</div>
        <div class="stack">
          <div v-for="step in currentStageSteps" :key="step.id" class="card">
            <div class="row between">
              <strong>{{ step.order }}. {{ step.name }}</strong>
              <span class="tag" :class="step.verified ? 'green' : step.pendingVerify ? 'orange' : 'gray'">
                {{ step.verified ? "已确认" : step.pendingVerify ? "待老师确认" : step.selfDone ? "已自勾" : "待完成" }}
              </span>
            </div>
            <p class="muted">{{ step.detail }}</p>
            <p v-if="step.timeRule" class="muted official-rule">⏱ {{ step.timeRule }}</p>
            <div v-if="step.materialCatalog?.length" class="stack compact">
              <p class="muted">需准备：{{ step.materialCatalog.join("、") }}</p>
              <label class="row wrap">
                上传材料
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" @change="uploadStepMaterial(step.id, $event)" />
              </label>
              <div v-for="file in step.materials || []" :key="file.id" class="row between">
                <span>{{ file.name }}</span>
                <div class="row wrap">
                  <button type="button" @click="downloadStepFile(file)">下载</button>
                  <button type="button" @click="removeStepMaterial(step.id, file.id)">移除</button>
                </div>
              </div>
            </div>
            <button class="primary" :disabled="step.verified || step.passed" @click="markStepDone(step.id)">
              {{ step.verified ? "已确认" : step.pendingVerify ? "待确认" : "标记完成" }}
            </button>
          </div>
          <EmptyStateCard v-if="!currentStageSteps.length" text="当前阶段暂无环节清单" />
        </div>

        <div class="section-title">待办提醒</div>
        <div class="stack">
          <div v-for="task in activeFlow.tasks" :key="task.id" class="card">
            <strong>{{ task.title }}</strong>
            <p class="muted">{{ task.body }}</p>
            <p v-if="task.dueAt">建议完成：{{ formatTime(task.dueAt) }}</p>
            <button class="primary" :disabled="task.done" @click="markDone(task.id)">
              {{ task.done ? "已完成" : "标记完成" }}
            </button>
          </div>
          <EmptyStateCard v-if="!activeFlow.tasks?.length" text="暂无待办" />
        </div>

        <div class="section-title">历史节点</div>
        <div class="stack">
          <div v-for="row in activeFlow.history" :key="row.at" class="card">
            <strong>{{ activeFlow.stages.find((s) => s.key === row.stageKey)?.name || row.stageKey }}</strong>
            <div class="muted">{{ formatTime(row.at) }} · {{ row.remark }}</div>
          </div>
          <EmptyStateCard v-if="!activeFlow.history?.length" text="暂无历史节点" />
        </div>
      </section>
    </div>

    <section v-if="passedSteps.length" class="card">
      <h3>已完成阶段环节</h3>
      <p class="muted">共 {{ passedSteps.filter((s) => s.done).length }} / {{ passedSteps.length }} 项已勾选</p>
      <div class="stack compact">
        <div v-for="step in passedSteps" :key="step.id" class="row between muted">
          <span>{{ step.order }}. {{ step.name }}</span>
          <span>{{ step.done ? "✓" : "—" }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="row between">
        <h3>完整 {{ activeStepCount }} 环节对照（官方流程图）</h3>
        <button @click="showFullSteps = !showFullSteps">{{ showFullSteps ? "收起" : "展开全部" }}</button>
      </div>
      <p class="muted">与《发展党员工作程序图》/ 入团流程一致，可按大阶段查看各环节时限与材料要求。</p>
      <div v-if="showFullSteps" class="stack">
        <div v-for="group in stepsByMacro" :key="group.name" class="card macro-group">
          <h4>{{ group.name }}</h4>
          <div v-for="step in group.steps" :key="step.id" class="row between wrap step-row">
            <span>
              <strong>{{ step.order }}. {{ step.name }}</strong>
              <span class="muted"> — {{ step.detail }}</span>
            </span>
            <span class="tag" :class="step.verified ? 'green' : step.current ? 'orange' : 'gray'">
              {{ step.verified ? "已确认" : step.current ? "当前阶段" : step.passed ? "已过" : "未至" }}
            </span>
          </div>
          <p v-for="step in group.steps.filter((s) => s.timeRule)" :key="`${step.id}-rule`" class="muted compact">
            {{ step.order }}. {{ step.timeRule }}
          </p>
        </div>
      </div>
    </section>

    <section v-if="calendarHighlights.length" class="card">
      <h3>2025-2026 学年校历要点</h3>
      <p class="muted">依据中国人民大学官方校历 PNG，党团活动请对照以下节点安排。</p>
      <div class="stack compact">
        <div v-for="item in calendarHighlights" :key="item.date" class="card calendar-row">
          <div class="row between wrap">
            <strong>{{ item.date }} · {{ item.title }}</strong>
            <span v-for="tag in item.tags || []" :key="tag" class="tag gray">{{ tag }}</span>
          </div>
          <p class="muted">{{ item.note }}</p>
          <p v-if="item.partyHint" class="party-hint">党团提示：{{ item.partyHint }}</p>
        </div>
      </div>
    </section>

    <section v-if="tab === 'party'" class="card">
      <h3>季度思想汇报</h3>
      <p class="muted">当前季度：{{ currentQuarter || "—" }}</p>
      <div v-if="thoughtGuide" class="card muted thought-guide">
        <strong>{{ thoughtGuide.title }}</strong>
        <p>{{ thoughtGuide.frequency }}</p>
        <ul>
          <li v-for="section in thoughtGuide.sections" :key="section">{{ section }}</li>
        </ul>
        <button type="button" @click="go('knowledge')">前往知识库下载思想汇报模板</button>
      </div>
      <form class="stack" @submit.prevent="submitThoughtReport">
        <textarea v-model="thoughtForm.content" rows="8" placeholder="敬爱的党组织：请结合本季度学习、工作与实践情况撰写思想汇报…"></textarea>
        <label>
          附件（可选）
          <input type="file" multiple accept=".pdf,.doc,.docx" @change="onThoughtFiles" />
        </label>
        <p v-if="thoughtForm.attachments.length" class="muted">
          已选 {{ thoughtForm.attachments.length }} 个附件：
          <span v-for="file in thoughtForm.attachments" :key="file.id" class="tag gray">{{ file.name }}</span>
        </p>
        <button class="primary">提交本季度思想汇报</button>
      </form>
      <div v-if="thoughtReports.length" class="stack" style="margin-top:16px">
        <h4>已提交记录</h4>
        <article v-for="item in thoughtReports" :key="item.id" class="card">
          <strong>{{ item.title || item.quarter }}</strong>
          <p class="muted">{{ formatTime(item.submittedAt) }}</p>
          <p>{{ item.content.slice(0, 160) }}{{ item.content.length > 160 ? "…" : "" }}</p>
          <p v-if="item.attachments?.length" class="muted">附件 {{ item.attachments.length }} 个</p>
        </article>
      </div>
    </section>

    <section v-if="tab === 'party'" class="card">
      <div class="row between">
        <h3>党建理论自测</h3>
        <span v-if="theory.latestAttempt" class="tag gray">上次 {{ theory.latestAttempt.score }} 分</span>
        <span v-if="theory.dailyLimit" class="tag gray">今日 {{ theory.todayAttempts || 0 }}/{{ theory.dailyLimit }} 次</span>
      </div>
      <form class="stack" @submit.prevent="submitTheory">
        <article v-for="question in theory.list" :key="question.id" class="card">
          <strong>{{ question.stem }}</strong>
          <div class="row wrap">
            <label v-for="option in question.options" :key="option" class="row">
              <input v-model="theoryAnswers[question.id]" type="radio" :name="question.id" :value="option" />
              {{ option }}
            </label>
          </div>
        </article>
        <EmptyStateCard v-if="!theory.list.length" text="暂无可用理论题目" />
        <button class="primary" :disabled="!theory.list.length">提交自测</button>
      </form>
      <div v-if="theoryResult" class="stack">
        <p class="muted">本次得分 {{ theoryResult.score }}，答对 {{ theoryResult.correct }}/{{ theoryResult.total }}</p>
        <div v-for="item in theoryResult.details" :key="item.id" class="card">
          <strong>{{ item.correct ? "正确" : "需复习" }} · {{ item.stem }}</strong>
          <p class="muted">你的答案：{{ item.answer || "未作答" }} · 正确答案：{{ item.correctAnswer }}</p>
          <p>{{ item.explanation }}</p>
        </div>
      </div>
    </section>
  </template>
</template>

<style scoped>
.preview-image {
  max-width: 100%;
  margin-top: 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #e5e7eb);
}
.stack.compact > * {
  padding: 4px 0;
}
.official-banner {
  border-left: 4px solid #c41e3a;
}
.official-rule {
  color: #92400e;
  font-size: 13px;
}
.party-hint {
  color: #1d4ed8;
  font-size: 13px;
  margin-top: 4px;
}
.macro-group {
  background: var(--bg-muted, #f9fafb);
}
.step-row {
  padding: 6px 0;
  border-bottom: 1px dashed var(--border, #e5e7eb);
}
.thought-guide ul {
  margin: 8px 0 8px 20px;
}
.calendar-row {
  margin-bottom: 8px;
}
.flowchart-card {
  overflow: hidden;
}
.flowchart-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(190px, 1fr));
  gap: 12px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.flow-phase {
  position: relative;
  min-width: 190px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}
.flow-phase::after {
  position: absolute;
  top: 28px;
  right: -16px;
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.42), rgba(6, 182, 212, 0.22));
  content: "";
}
.flow-phase:last-child::after {
  display: none;
}
.flow-phase.current {
  border-color: rgba(249, 115, 22, 0.42);
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(255, 255, 255, 0.76));
}
.flow-phase.done {
  border-color: rgba(5, 150, 105, 0.26);
  background: linear-gradient(180deg, rgba(236, 253, 245, 0.86), rgba(255, 255, 255, 0.74));
}
.flow-phase.upcoming {
  background: rgba(248, 250, 252, 0.72);
}
.phase-head {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-bottom: 10px;
}
.phase-number {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: #fff;
  font-weight: 900;
}
.flow-phase.current .phase-number {
  background: linear-gradient(135deg, #f97316, #d92d20);
}
.flow-phase.done .phase-number {
  background: linear-gradient(135deg, #059669, #0f766e);
}
.phase-head h4 {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
}
.phase-head p {
  margin: 4px 0 0;
  font-size: 12px;
}
.flow-step-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.flow-step-list li {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  padding: 7px 8px;
  background: rgba(255, 255, 255, 0.66);
}
.flow-step-list li.done {
  border-color: rgba(5, 150, 105, 0.22);
  background: rgba(236, 253, 245, 0.8);
}
.flow-step-list li.current {
  border-color: rgba(249, 115, 22, 0.34);
  background: rgba(255, 247, 237, 0.9);
}
.flow-step-list li.pending {
  border-color: rgba(217, 45, 32, 0.26);
}
.flow-index {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 9px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-strong, #1d4ed8);
  font-size: 12px;
  font-weight: 900;
}
.flow-title {
  min-width: 0;
  color: var(--text, #0f172a);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
}
.flow-state {
  border-radius: 999px;
  padding: 2px 6px;
  background: rgba(249, 115, 22, 0.12);
  color: #9a3412;
  font-size: 11px;
  font-weight: 850;
}
@media (max-width: 980px) {
  .flowchart-grid {
    grid-template-columns: repeat(5, minmax(210px, 1fr));
  }
}
@media (max-width: 640px) {
  .flowchart-grid {
    grid-template-columns: 1fr;
    overflow-x: visible;
  }
  .flow-phase {
    min-width: 0;
  }
  .flow-phase::after {
    top: auto;
    right: auto;
    bottom: -8px;
    left: 30px;
    width: 2px;
    height: 10px;
    background: linear-gradient(180deg, rgba(37, 99, 235, 0.42), rgba(6, 182, 212, 0.22));
  }
}
</style>
