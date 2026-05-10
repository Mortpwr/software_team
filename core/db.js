const KEYS = require('./keys');
const { createInitialDatabase } = require('./seed-data');

/**
 * @typedef {object} PlatformDatabase
 * @property {number} schemaVersion
 * @property {any[]} students
 * @property {any[]} knowledge
 * @property {any[]} templates
 * @property {any[]} honors
 * @property {any[]} notices
 * @property {any[]} batches
 * @property {Record<string, any[]>} inboxByStudent
 * @property {{ stages:any[], rules:any[] }} partyFlow
 * @property {Record<string, any>} partyByStudent
 * @property {any[]} applications
 * @property {any[]} missKeywords
 * @property {any[]} auditLogs
 * @property {any[]} smsSimulation
 * @property {any} academic
 */

/**
 * 读取完整仓库；不存在则返回 null。
 * @returns {PlatformDatabase|null}
 */
function readDb() {
  const raw = wx.getStorageSync(KEYS.DB);
  if (!raw) return null;
  return raw;
}

/**
 * @param {PlatformDatabase} db
 */
function writeDb(db) {
  wx.setStorageSync(KEYS.DB, db);
}

/**
 * 合并补丁并写回（浅合并顶层键）。
 * @param {Partial<PlatformDatabase>} patch
 */
function patchDb(patch) {
  const db = readDb();
  if (!db) throw new Error('DB_NOT_READY');
  Object.assign(db, patch);
  writeDb(db);
}

/**
 * 首次启动或开发者「重置演示数据」。
 * @returns {PlatformDatabase}
 */
function resetDb() {
  const db = createInitialDatabase();
  writeDb(db);
  wx.setStorageSync(KEYS.BOOTSTRAP_META, { resetAt: Date.now(), version: db.schemaVersion });
  return db;
}

/**
 * 确保数据库存在；若缺失则注入种子。
 * @returns {PlatformDatabase}
 */
function ensureDb() {
  let db = readDb();
  if (!db) {
    db = resetDb();
    return db;
  }
  if (!db.schemaVersion || db.schemaVersion < 3) {
    return resetDb();
  }
  backfill(db);
  writeDb(db);
  return db;
}

/**
 * 轻量补字段，避免老数据缺键导致页面空指针。
 * @param {PlatformDatabase} db
 */
function backfill(db) {
  db.students = db.students || [];
  db.knowledge = db.knowledge || [];
  db.templates = db.templates || [];
  db.honors = db.honors || [];
  db.notices = db.notices || [];
  db.batches = db.batches || [];
  db.inboxByStudent = db.inboxByStudent || {};
  db.partyFlow = db.partyFlow || { stages: [], rules: [] };
  db.partyByStudent = db.partyByStudent || {};
  db.applications = db.applications || [];
  db.missKeywords = db.missKeywords || [];
  db.auditLogs = db.auditLogs || [];
  db.smsSimulation = db.smsSimulation || [];
  db.academic = db.academic || { plansByKey: {}, progressByStudent: {}, reports: [] };
  db.academic.plansByKey = db.academic.plansByKey || {};
  db.academic.progressByStudent = db.academic.progressByStudent || {};
  db.academic.reports = db.academic.reports || [];
}

function withDb(fn) {
  const db = ensureDb();
  const next = fn(db) || db;
  writeDb(next);
  return next;
}

module.exports = {
  readDb,
  writeDb,
  patchDb,
  resetDb,
  ensureDb,
  withDb,
};
