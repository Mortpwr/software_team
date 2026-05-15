export function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || "";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function rank(query, items, tokenize) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return items.slice();
  const words = q.split(/[\s,，]+/).filter(Boolean);
  return items
    .map((item) => {
      const bag = tokenize(item).join("\n").toLowerCase();
      const score = words.reduce((sum, word) => sum + (bag.includes(word) ? 4 : 0) + ((item.title || "").toLowerCase().includes(word) ? 6 : 0), 0);
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}
