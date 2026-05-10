const db = require('../core/db');
const { uid } = require('../utils/id');

/**
 * @param {{ actorId:string, role:string, action:string, target:string, detail?:any, result?:string }} row
 */
function append(row) {
  db.withDb((d) => {
    d.auditLogs.unshift({
      id: uid('log'),
      at: Date.now(),
      actorId: row.actorId,
      role: row.role,
      action: row.action,
      target: row.target,
      detail: row.detail || null,
      result: row.result || 'ok',
    });
    if (d.auditLogs.length > 500) d.auditLogs.length = 500;
    return d;
  });
}

function list({ limit = 80 } = {}) {
  const d = db.readDb();
  return (d.auditLogs || []).slice(0, limit);
}

module.exports = { append, list };
