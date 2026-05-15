import { createSeedDatabase } from "../data/seed.js";

const DB_KEY = "ss_web_platform_db_v1";
const META_KEY = "ss_web_platform_meta_v1";

export function readDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return resetDb();
  return JSON.parse(raw);
}

export function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

export function withDb(mutator) {
  const db = readDb();
  const next = mutator(db) || db;
  return writeDb(next);
}

export function resetDb() {
  const db = createSeedDatabase();
  writeDb(db);
  localStorage.setItem(META_KEY, JSON.stringify({ resetAt: Date.now(), schemaVersion: db.schemaVersion }));
  return db;
}

export function readMeta() {
  return JSON.parse(localStorage.getItem(META_KEY) || "null");
}
