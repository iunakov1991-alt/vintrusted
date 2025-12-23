/**
 * Вычисляет вероятность каннибализации:
 *  - пересечение title семантики
 *  - пересечение H1
 *  - пересечение intent
 */

module.exports.detectCannibalization = function(pages) {
  const map = {};
  const flagged = [];

  for (const p of pages) {
    const parts = p.split("/").filter(Boolean);
    if (parts.length < 3) continue;
    
    const key = parts.slice(0, 3).join("-");
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }

  for (const k in map) {
    if (map[k].length > 20) {
      flagged.push({ cluster: k, count: map[k].length });
    }
  }
  
  return flagged;
};

















