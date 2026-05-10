const db = require('../core/db');
const { uid } = require('../utils/id');
const channels = require('../constants/notice-channels');
const audit = require('./audit.repository');

function listNotices() {
  const d = db.readDb();
  return d.notices.slice().sort((a, b) => b.publishedAt - a.publishedAt);
}

function getNotice(id) {
  const d = db.readDb();
  return d.notices.find((n) => n.id === id) || null;
}

function matchStudent(rule, s) {
  if (!rule || rule.kind === 'all') return true;
  if (rule.kind === 'grade') return s.grade === rule.value;
  if (rule.kind === 'major') return s.major.includes(rule.value);
  if (rule.kind === 'composite') {
    return (rule.all || []).every((r) => matchStudent(r, s));
  }
  return true;
}

/**
 * 精准推送：写入批次统计 + fan-out 站内信 (+ 邮件/短信模拟)。
 */
function publish({ payload, actorId, role }) {
  const notice = {
    id: uid('n'),
    title: payload.title,
    tags: payload.tags || [],
    summary: payload.summary || payload.title,
    content: payload.content || '',
    publishedAt: Date.now(),
    source: payload.source || '学院（工作台）',
  };
  const batchId = uid('batch');
  const batch = {
    id: batchId,
    title: payload.title,
    targetRule: payload.targetRule || { kind: 'all' },
    createdAt: Date.now(),
    channels: [
      {
        name: channels.IN_APP,
        sendOk: 0,
        sendFail: 0,
        deliverOk: 0,
        deliverFail: 0,
        read: 0,
        observability: '可读',
      },
      {
        name: channels.EMAIL,
        sendOk: 0,
        sendFail: 0,
        deliverOk: 0,
        deliverFail: 0,
        read: 0,
        observability: '不可观测',
      },
      {
        name: channels.SMS_SIM,
        sendOk: 0,
        sendFail: 0,
        deliverOk: 0,
        deliverFail: 0,
        read: 0,
        observability: '模拟',
      },
    ],
  };

  let reach = 0;

  db.withDb((d) => {
    d.notices.unshift(notice);
    const targets = d.students.filter((s) => matchStudent(batch.targetRule, s));
    reach = targets.length;
    batch.channels[0].sendOk = targets.length;
    batch.channels[0].deliverOk = targets.length;
    // 邮件：模拟部分失败
    batch.channels[1].sendOk = targets.length;
    batch.channels[1].sendFail = Math.min(2, Math.floor(targets.length / 10));
    batch.channels[1].deliverOk = 0;
    // 短信：仅记录意图（需求 FR3-6a）
    batch.channels[2].sendOk = targets.length;

    d.batches.unshift(batch);

    targets.forEach((s) => {
      d.inboxByStudent[s.studentId] = d.inboxByStudent[s.studentId] || [];
      d.inboxByStudent[s.studentId].unshift({
        id: uid('msg'),
        studentId: s.studentId,
        noticeId: notice.id,
        title: notice.title,
        summary: notice.summary,
        batchId,
        createdAt: Date.now(),
        readAt: null,
        channels: [
          { name: channels.IN_APP, state: channels.STATES.SEND_OK, detail: channels.STATES.DELIVER_OK },
          { name: channels.EMAIL, state: channels.STATES.SEND_OK, detail: channels.STATES.UNOBSERVABLE },
          { name: channels.SMS_SIM, state: channels.STATES.SEND_OK, detail: '模拟记录' },
        ],
      });
    });

    d.smsSimulation.unshift({
      id: uid('sms'),
      batchId,
      at: Date.now(),
      audience: targets.map((x) => x.studentId),
      text: `[模拟短信] ${notice.title}`,
    });
    return d;
  });

  audit.append({
    actorId,
    role,
    action: 'notice_publish',
    target: batchId,
    detail: { rule: batch.targetRule, reach },
  });

  return { notice, batchId, reach };
}

function listBatches() {
  const d = db.readDb();
  return d.batches || [];
}

module.exports = { listNotices, getNotice, publish, listBatches };
