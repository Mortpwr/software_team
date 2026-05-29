<script setup>
import { computed, inject, onMounted, ref } from "vue";
import { ROLES } from "../data/seed.js";
import { go } from "../state/routes.js";

const api = inject("api");
const toast = inject("toast");
const session = inject("session");
const report = ref(null);
const planPayload = ref(null);
const lastTranscriptFile = ref(null);

const isStudent = computed(() => session.value.role === ROLES.STUDENT);
const overview = computed(() => report.value?.overview || planPayload.value?.plan?.overview || null);
const courseMap = computed(() => report.value?.courseMap || planPayload.value?.plan?.courseMap || null);
const moduleGroups = computed(() => report.value?.moduleGroups || []);

onMounted(load);

async function load() {
  try {
    const [reportRes, planRes] = await Promise.all([
      api.getAcademicReport(),
      api.getAcademicPlan(),
    ]);
    report.value = reportRes;
    planPayload.value = planRes;
  } catch (error) {
    report.value = { ok: false, message: error.message || "学业数据加载失败" };
    planPayload.value = null;
  }
}

function earnedFor(key) {
  return planPayload.value?.progress?.modules?.find((item) => item.key === key)?.earned || 0;
}

function termItems(row, term) {
  return (row.items || []).filter((item) => Number(item.term) === Number(term));
}

function riskClass(level) {
  return level === "高" ? "orange" : level === "中" ? "gray" : "green";
}

async function saveProgress(event) {
  const form = new FormData(event.target);
  const modules = (planPayload.value?.plan?.modules || []).map((item) => ({
    key: item.key,
    earned: Number(form.get(item.key) || 0),
  }));
  try {
    await api.saveAcademicProgress(modules);
    toast("已保存学业数据");
    await load();
  } catch (error) {
    toast(error.message || "学业数据保存失败");
  }
}

const parsePreview = ref(null);

async function uploadTranscript(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    toast("请选择 PDF 成绩单");
    return;
  }
  lastTranscriptFile.value = file;
  try {
    const result = await api.uploadTranscriptFile(file, false);
    parsePreview.value = result;
    toast(result.message || (result.ok ? "已解析，请确认后写入学分" : "解析失败"));
    if (result.ok && !result.needsConfirm) await load();
  } catch (error) {
    parsePreview.value = null;
    toast(error.message || "成绩单解析失败");
  }
}

async function confirmParsedCredits() {
  if (!parsePreview.value?.ok) return;
  const file = lastTranscriptFile.value;
  if (!file) {
    toast("请重新选择 PDF 文件后确认");
    return;
  }
  try {
    const result = await api.uploadTranscriptFile(file, true);
    parsePreview.value = null;
    lastTranscriptFile.value = null;
    toast(result.message || "学分已更新");
    await load();
  } catch (error) {
    toast(error.message || "学分写入失败");
  }
}
</script>

<template>
  <div v-if="!isStudent" class="card">
    <p>管理端请在工作台查看<strong>学业风险名单</strong>（按培养方案缺口排序）。</p>
    <button class="primary" @click="go('workbench')">前往工作台</button>
  </div>

  <div v-if="report?.ok" class="grid cols-2">
    <section>
      <div class="card">
        <h3>{{ overview?.title || "学业进度分析" }}</h3>
        <p v-if="overview" class="muted">
          学制 {{ overview.duration }} · {{ overview.degree }} · 总学分 {{ overview.totalCredits }}
        </p>
        <p class="muted">{{ overview?.objective || "系统依据培养方案与已获学分进行比对，展示模块缺口和风险提示。" }}</p>
        <div class="academic-summary">
          <div>
            <span class="muted">要求</span>
            <strong>{{ report.totalRequired || 0 }}</strong>
          </div>
          <div>
            <span class="muted">已获</span>
            <strong>{{ report.totalEarned || 0 }}</strong>
          </div>
          <div>
            <span class="muted">缺口</span>
            <strong>{{ report.totalGap || 0 }}</strong>
          </div>
          <div>
            <span class="muted">风险</span>
            <strong>{{ report.riskLevel }}</strong>
          </div>
        </div>
        <p v-if="overview?.principle" class="tag gray">{{ overview.principle }}</p>
        <label class="stack">
          上传 PDF 成绩单
          <input type="file" accept=".pdf" @change="uploadTranscript" />
        </label>
        <div v-if="parsePreview?.ok" class="card stack">
          <p class="muted">
            识别 {{ parsePreview.courseCount || parsePreview.courses?.length || 0 }} 门课程
            <span v-if="parsePreview.parseSource"> · 来源 {{ parsePreview.parseSource.toUpperCase() }}</span>
          </p>
          <div v-if="parsePreview.warnings?.length" class="stack">
            <div v-for="(warning, i) in parsePreview.warnings" :key="`warning-${i}`" class="tag orange">{{ warning }}</div>
          </div>
          <div v-if="parsePreview.courses?.length" class="stack">
            <div v-for="(c, i) in parsePreview.courses.slice(0, 8)" :key="i" class="muted">{{ c.name }} · {{ c.credit }} 学分 · {{ c.category }}</div>
          </div>
          <div v-if="parsePreview.suggestedModules?.length" class="stack">
            <div class="muted">建议写入模块：</div>
            <div v-for="item in parsePreview.suggestedModules" :key="item.key" class="muted">{{ item.key }} · 已识别 {{ item.earned }} 学分</div>
          </div>
          <button type="button" class="primary" @click="confirmParsedCredits">确认写入模块学分</button>
        </div>
        <div v-else-if="parsePreview && !parsePreview.ok" class="card stack">
          <div class="tag orange">解析失败</div>
          <p class="muted">{{ parsePreview.message || "未能识别课程数据" }}</p>
          <div v-for="(warning, i) in parsePreview.warnings || []" :key="`fail-${i}`" class="muted">{{ warning }}</div>
        </div>
        <p v-if="report.warning" class="tag orange">{{ report.warning }}</p>
      </div>

      <div class="section-title">模块学分缺口</div>
      <div class="stack">
        <div v-for="item in report.modules" :key="item.key" class="card row between">
          <div>
            <strong>{{ item.name }}</strong>
            <div class="muted">要求 {{ item.required }} · 已获 {{ item.earned }} · 缺口 {{ item.gap }}</div>
            <div v-if="item.requirement" class="muted academic-requirement">{{ item.requirement }}</div>
          </div>
          <span class="tag" :class="riskClass(item.risk)">风险 {{ item.risk }}</span>
        </div>
      </div>
    </section>

    <section>
      <div v-if="moduleGroups.length" class="section-title">155 学分结构</div>
      <div v-if="moduleGroups.length" class="stack">
        <article v-for="group in moduleGroups" :key="group.name" class="card">
          <div class="row between wrap">
            <strong>{{ group.name }}</strong>
            <span class="tag" :class="riskClass(group.risk)">缺口 {{ group.gap }}</span>
          </div>
          <div class="credit-bar">
            <span :style="{ width: `${Math.min(100, (Number(group.earned || 0) / Math.max(1, Number(group.required || 1))) * 100)}%` }"></span>
          </div>
          <p class="muted">要求 {{ group.required }} · 已获 {{ group.earned }}</p>
        </article>
      </div>

      <div class="card">
        <h3>维护已获学分</h3>
        <form class="stack" @submit.prevent="saveProgress">
          <label v-for="item in planPayload?.plan?.modules || []" :key="item.key">
            {{ item.name }}（要求 {{ item.required }}）
            <input type="number" min="0" step="0.5" :name="item.key" :value="earnedFor(item.key)" />
          </label>
          <button class="primary">保存</button>
        </form>
      </div>
    </section>
  </div>

  <section v-if="courseMap" class="card course-map-card">
    <h3>课程地图</h3>
    <p class="muted">根据培养方案的开设学期展示，“应修尽修”课程建议按图中学期修读。</p>
    <div class="course-map">
      <div class="course-map-head">课程模块</div>
      <div v-for="term in courseMap.semesters" :key="term" class="course-map-head">{{ term }}</div>
      <template v-for="row in courseMap.rows" :key="row.group">
        <div class="course-row-title">{{ row.group }}</div>
        <div v-for="(_, termIndex) in courseMap.semesters" :key="`${row.group}-${termIndex}`" class="course-cell">
          <span
            v-for="item in termItems(row, termIndex + 1)"
            :key="item.name"
            class="course-pill"
            :class="item.type"
          >
            {{ item.name }}
          </span>
        </div>
      </template>
    </div>
    <div v-if="courseMap.bands?.length" class="course-bands">
      <div v-for="band in courseMap.bands" :key="band.group" class="course-band">
        <strong>{{ band.group }}</strong>
        <span>{{ band.text }}</span>
      </div>
    </div>
  </section>

  <section v-if="report?.graduationRequirements?.length" class="card">
    <h3>毕业要求</h3>
    <div class="requirement-grid">
      <span v-for="(item, index) in report.graduationRequirements" :key="item" class="tag gray">
        {{ index + 1 }}. {{ item }}
      </span>
    </div>
  </section>

  <div v-else-if="isStudent" class="card">
    <div>{{ report?.message || "加载中" }}</div>
    <div v-if="report?.hint" class="muted">{{ report.hint }}</div>
  </div>

  <div class="section-title">修读建议</div>
  <div class="stack">
    <div v-for="item in report?.suggestions || []" :key="item.focus" class="card">{{ item.hint }}</div>
  </div>
</template>

<style scoped>
.academic-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}
.academic-summary > div {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.72);
}
.academic-summary span,
.academic-summary strong {
  display: block;
}
.academic-summary strong {
  margin-top: 5px;
  color: var(--primary-strong, #1d4ed8);
  font-size: 24px;
}
.academic-requirement {
  max-width: 720px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
}
.credit-bar {
  height: 9px;
  margin: 12px 0 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}
.credit-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #06b6d4);
}
.course-map-card {
  margin-top: 16px;
  overflow: hidden;
}
.course-map {
  display: grid;
  grid-template-columns: 150px repeat(8, minmax(118px, 1fr));
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.course-map-head,
.course-row-title,
.course-cell {
  min-height: 48px;
  border-radius: 12px;
  padding: 10px;
}
.course-map-head {
  display: grid;
  place-items: center;
  background: #0f4c75;
  color: #fff;
  font-weight: 850;
  text-align: center;
}
.course-row-title {
  display: flex;
  align-items: center;
  background: rgba(15, 76, 117, 0.82);
  color: #fff;
  font-weight: 850;
}
.course-cell {
  display: grid;
  gap: 6px;
  align-content: start;
  background: rgba(248, 250, 252, 0.72);
}
.course-pill {
  display: block;
  border-radius: 10px;
  padding: 8px 9px;
  background: #d8e8f4;
  color: #0f3754;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
}
.course-pill.practice {
  background: #cce7e5;
}
.course-pill.placeholder {
  background: transparent;
  color: #0f3754;
  text-align: left;
}
.course-bands {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.course-band {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border-radius: 12px;
  padding: 12px;
  background: rgba(204, 231, 229, 0.82);
}
.course-band strong {
  color: #0f4c75;
}
.requirement-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (max-width: 760px) {
  .academic-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .course-map {
    grid-template-columns: 128px repeat(8, minmax(112px, 1fr));
  }
  .course-band {
    grid-template-columns: 1fr;
  }
}
</style>
