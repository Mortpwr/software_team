const db = require('../core/db');
const audit = require('./audit.repository');

function inbox(studentId) {
  const d = db.readDb();
  const list = d.inboxByStudent[studentId] || [];
  return list.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function unreadCount(studentId) {
  return inbox(studentId).filter((m) => !m.readAt).length;
}

function markRead(studentId, msgId) {
  db.withDb((d) => {
    const arr = d.inboxByStudent[studentId] || [];
    const m = arr.find((x) => x.id === msgId);
    if (m && !m.readAt) m.readAt = Date.now();
    return d;
  });
  audit.append({
    actorId: studentId,
    role: 'student',
    action: 'message_read',
    target: msgId,
  });
  return { ok: true };
}

module.exports = { inbox, unreadCount, markRead };
