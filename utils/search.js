/**
 * 简单关键词检索：拆词 + 加权得分，不依赖外部包。
 * @param {string} q
 * @param {any[]} items
 * @param {(item:any)=>string[]} tokenize
 */
function rank(q, items, tokenize) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return items.slice();
  const qs = query.split(/[\s,，]+/).filter(Boolean);
  const scored = items.map((it) => {
    const bag = tokenize(it).join('\n').toLowerCase();
    let score = 0;
    qs.forEach((w) => {
      if (!w) return;
      if (bag.includes(w)) score += 4;
      // 轻量子串容错：长短语命中标题
      if (it.title && it.title.toLowerCase().includes(w)) score += 6;
    });
    return { it, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

module.exports = { rank };
