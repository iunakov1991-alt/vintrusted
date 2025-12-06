#!/usr/bin/env node
/**
 * Simple topic graph dumper for MONSTER 8.0
 *
 * Usage:
 *   node scripts/topic_graph_dump.js --topic-file data/topic.json
 *
 * Output:
 *   Writes a JSON graph (nodes + edges) to stdout.
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--topic-file" && value) {
      args.topicFile = value;
      i += 1;
    }
  }
  return args;
}

function addNode(nodes, id, label, data = {}) {
  if (!id) return;
  if (nodes.some((node) => node.id === id)) return;
  nodes.push({ id, label, ...data });
}

function addEdge(edges, from, to, label) {
  if (!from || !to) return;
  edges.push({ from, to, label });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.topicFile) {
    console.error("Usage: node scripts/topic_graph_dump.js --topic-file data/topic.json");
    process.exit(1);
  }

  const topicPath = path.isAbsolute(args.topicFile)
    ? args.topicFile
    : path.join(process.cwd(), args.topicFile);

  if (!fs.existsSync(topicPath)) {
    console.error(`[ERR] Topic file not found: ${topicPath}`);
    process.exit(1);
  }

  const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
  const nodes = [];
  const edges = [];

  const topicNodeId = `topic:${topic.topic_id || topic.id || path.basename(topicPath, ".json")}`;
  addNode(nodes, topicNodeId, "Topic", { title: topic.title || null });

  if (topic.zone) {
    const zoneNode = `zone:${topic.zone}`;
    addNode(nodes, zoneNode, "Zone", { zone: topic.zone });
    addEdge(edges, topicNodeId, zoneNode, "IN_ZONE");
  }

  if (topic.type) {
    const typeNode = `type:${topic.type}`;
    addNode(nodes, typeNode, "ArticleType", { type: topic.type });
    addEdge(edges, topicNodeId, typeNode, "HAS_TYPE");
  }

  const dims = topic.dimensions || {};
  Object.entries(dims).forEach(([key, value]) => {
    if (!value) return;
    const dimNode = `dim:${key}:${value}`;
    addNode(nodes, dimNode, `Dimension:${key}`, { value });
    addEdge(edges, topicNodeId, dimNode, "USES_DIMENSION");
    if (key === "state") {
      const stateNode = `state:${value}`;
      addNode(nodes, stateNode, "State", { state: value });
      addEdge(edges, dimNode, stateNode, "MATCHES_STATE");
    }
  });

  if (Array.isArray(topic.must_include_terms)) {
    topic.must_include_terms.forEach((term) => {
      const termNode = `term:${term.toLowerCase()}`;
      addNode(nodes, termNode, "MustIncludeTerm", { term });
      addEdge(edges, topicNodeId, termNode, "MUST_INCLUDE");
    });
  }

  const graph = { topic: topic.topic_id || topic.id || null, nodes, edges };
  process.stdout.write(`${JSON.stringify(graph, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

