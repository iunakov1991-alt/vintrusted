const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const RL_PATH = path.join(process.cwd(), 'data/seo/rl-state.json');

function loadRlState() {
  if (!fs.existsSync(RL_PATH)) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      intentWeights: {},
      languageWeights: {},
      clusterScores: {}
    };
  }
  return JSON.parse(fs.readFileSync(RL_PATH, 'utf8'));
}

function saveRlState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(RL_PATH, JSON.stringify(state, null, 2));
  log('RL', 'RL state updated');
}

function updateRlState(prevState, scoredPages) {
  const state = { ...prevState };
  const byIntent = {};
  const byCluster = {};

  for (const p of scoredPages) {
    if (!byIntent[p.intent]) byIntent[p.intent] = { scoreSum: 0, count: 0 };
    byIntent[p.intent].scoreSum += p.qualityScore || 0;
    byIntent[p.intent].count++;

    if (!byCluster[p.clusterId]) byCluster[p.clusterId] = { scoreSum: 0, count: 0 };
    byCluster[p.clusterId].scoreSum += p.qualityScore || 0;
    byCluster[p.clusterId].count++;
  }

  const iw = { ...(state.intentWeights || {}) };
  for (const intent of Object.keys(byIntent)) {
    const avg = byIntent[intent].scoreSum / byIntent[intent].count;
    const curr = iw[intent] ?? 0.2;
    let next = curr;
    if (avg > 0.8) next = curr + 0.02;
    else if (avg < 0.6) next = curr - 0.02;
    iw[intent] = Math.min(0.6, Math.max(0.1, next));
  }
  state.intentWeights = iw;

  const cs = { ...(state.clusterScores || {}) };
  for (const clusterId of Object.keys(byCluster)) {
    const avg = byCluster[clusterId].scoreSum / byCluster[clusterId].count;
    const curr = cs[clusterId] ?? 1.0;
    let next = curr;
    if (avg > 0.85) next = curr + 0.05;
    else if (avg < 0.55) next = curr - 0.05;
    cs[clusterId] = Math.min(2.0, Math.max(0.2, next));
  }
  state.clusterScores = cs;

  return state;
}

module.exports = { loadRlState, saveRlState, updateRlState };
