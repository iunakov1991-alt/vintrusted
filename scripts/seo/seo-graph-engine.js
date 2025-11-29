
const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



const GRAPH_PATH = path.join(process.cwd(), 'data/seo/graph.json');



function buildGraph(pages) {

  const nodes = pages.map((p) => ({ url: p.url, cluster: p.clusterId }));

  const edges = [];



  const byCluster = {};

  for (const p of pages) {

    if (!byCluster[p.clusterId]) byCluster[p.clusterId] = [];

    byCluster[p.clusterId].push(p);

  }



  for (const clusterId of Object.keys(byCluster)) {

    const arr = byCluster[clusterId];

    for (let i = 0; i < arr.length - 1; i++) {

      edges.push({ from: arr[i].url, to: arr[i + 1].url });

    }

  }



  const graph = { nodes, edges };

  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));

  log('GRAPH', `Graph saved: nodes=${nodes.length}, edges=${edges.length}`);

}



module.exports = { buildGraph };

