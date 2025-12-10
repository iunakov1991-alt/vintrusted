/**
 * Построение внутреннего графа:
 *  - VIN -> State
 *  - State -> Make
 *  - Make -> Model
 *  - Model -> Year
 *  - Year -> Cluster/Topic
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.buildLinkGraph = function(pages) {
  const graph = {};

  pages.forEach(p => {
    const parts = p.replace(/^\//, "").split("/").filter(Boolean);
    if (!parts.length) return;
    
    const node = parts.join("/");
    graph[node] = [];

    // basic edges
    if (parts.length > 1) {
      const parent = parts.slice(0, -1).join("/");
      graph[node].push(parent);
    }
    
    // random related links
    if (Math.random() < 0.25 && pages.length > 10) {
      const randomPage = pages[Math.floor(Math.random() * pages.length)];
      if (randomPage !== p) {
        graph[node].push(randomPage);
      }
    }
  });

  const outDir = path.join(__dirname, "..", "..", "data", "internal-link-graphs");
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "graph.json"), JSON.stringify(graph, null, 2));
  return graph;
};













