const db = require('../core/db');

function list({ year, major, category } = {}) {
  const d = db.readDb();
  let items = d.honors.slice();
  if (year && year !== '全部') items = items.filter((h) => String(h.year) === String(year));
  if (category && category !== '全部') items = items.filter((h) => h.category === category);
  if (major) items = items.filter((h) => h.major.includes(major));
  return items;
}

module.exports = { list };
