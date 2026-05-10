const db = require('../core/db');
const { rank } = require('../utils/search');
const { uid } = require('../utils/id');
const audit = require('./audit.repository');

function list({ q, category } = {}) {
  const d = db.readDb();
  const categories = ['全部', ...Array.from(new Set((d.knowledge || []).map((k) => k.category)))];
  let items = d.knowledge.slice();
  if (category && category !== '全部') {
    items = items.filter((k) => k.category === category);
  }
  const tokenize = (k) => [
    k.title,
    k.category,
    (k.tags || []).join(','),
    k.summary,
    k.body,
  ];
  const hit = q ? rank(q, items, tokenize) : items;
  return { list: hit, templates: d.templates, categories };
}

function recordHit(id) {
  db.withDb((d) => {
    const k = d.knowledge.find((x) => x.id === id);
    if (k) k.hitCount = (k.hitCount || 0) + 1;
    return d;
  });
}

function getById(id) {
  const d = db.readDb();
  return d.knowledge.find((k) => k.id === id) || null;
}

function recordMiss({ keyword, studentId }) {
  const k = (keyword || '').trim();
  if (!k) return { ok: false };
  db.withDb((d) => {
    const found = d.missKeywords.find((x) => x.keyword === k);
    if (found) {
      found.count += 1;
      found.lastAt = Date.now();
      if (studentId) found.samples = [studentId, ...(found.samples || [])].slice(0, 5);
    } else {
      d.missKeywords.push({
        id: uid('miss'),
        keyword: k,
        count: 1,
        lastAt: Date.now(),
        samples: studentId ? [studentId] : [],
      });
    }
    return d;
  });
  audit.append({
    actorId: studentId || 'unknown',
    role: 'student',
    action: 'knowledge_miss',
    target: k,
    result: 'recorded',
  });
  return { ok: true };
}

function listMisses() {
  const d = db.readDb();
  return (d.missKeywords || []).sort((a, b) => b.count - a.count);
}

function toggleFavoriteResolved(studentId, knowledgeId) {
  let favorited = false;
  db.withDb((d) => {
    d.favoriteByStudent = d.favoriteByStudent || {};
    let arr = (d.favoriteByStudent[studentId] || []).slice();
    const i = arr.indexOf(knowledgeId);
    if (i >= 0) {
      arr.splice(i, 1);
      favorited = false;
    } else {
      arr.unshift(knowledgeId);
      favorited = true;
    }
    d.favoriteByStudent[studentId] = arr.slice(0, 200);
    return d;
  });
  return { favorited };
}

function listFavorites(studentId) {
  const d = db.readDb();
  const ids = (d.favoriteByStudent && d.favoriteByStudent[studentId]) || [];
  return ids.map((id) => getById(id)).filter(Boolean);
}

function recordRecent(studentId, knowledgeId) {
  if (!studentId || !knowledgeId) return;
  db.withDb((d) => {
    d.recentKnowledgeByStudent = d.recentKnowledgeByStudent || {};
    let arr = (d.recentKnowledgeByStudent[studentId] || []).filter((x) => x.id !== knowledgeId);
    arr.unshift({ id: knowledgeId, at: Date.now() });
    arr = arr.slice(0, 30);
    d.recentKnowledgeByStudent[studentId] = arr;
    return d;
  });
}

function listRecent(studentId) {
  const d = db.readDb();
  const arr = (d.recentKnowledgeByStudent && d.recentKnowledgeByStudent[studentId]) || [];
  return arr.map((x) => getById(x.id)).filter(Boolean);
}

function trending(limit) {
  const d = db.readDb();
  const n = limit || 10;
  return d.knowledge.slice().sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0)).slice(0, n);
}

module.exports = {
  list,
  getById,
  recordHit,
  recordMiss,
  listMisses,
  toggleFavoriteResolved,
  listFavorites,
  recordRecent,
  listRecent,
  trending,
};
