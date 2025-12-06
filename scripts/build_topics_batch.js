#!/usr/bin/env node
/**
 * Batch builder for MONSTER 8.0 topics.
 *
 * Usage:
 *   node scripts/build_topics_batch.js [--queue data/topics_queue.json] [--stop-on-error]
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseArgs(argv) {
  const args = {
    queue: "data/topics_queue.json",
    stopOnError: false,
    mode: null,
    qaMode: null,
    delayMs: null,
    skipRender: false,
    skipValidate: false,
    lengthMode: null,
    lang: null,
    workers: 1
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--queue" && next) {
      args.queue = next;
      i += 1;
    } else if (key === "--stop-on-error") {
      args.stopOnError = true;
    } else if (key === "--mode" && next) {
      args.mode = next;
      i += 1;
    } else if (key === "--qa-mode" && next) {
      args.qaMode = next;
      i += 1;
    } else if (key === "--delay-ms" && next) {
      args.delayMs = parseInt(next, 10) || null;
      i += 1;
    } else if (key === "--skip-render") {
      args.skipRender = true;
    } else if (key === "--skip-validate") {
      args.skipValidate = true;
    } else if (key === "--length-mode" && next) {
      args.lengthMode = next;
      i += 1;
    } else if (key === "--lang" && next) {
      args.lang = next;
      i += 1;
    } else if (key === "--workers" && next) {
      args.workers = parseInt(next, 10) || 1;
      i += 1;
    }
  }
  return args;
}

function resolvePath(rootDir, target) {
  return path.isAbsolute(target) ? target : path.join(rootDir, target);
}

function loadQueue(queuePath) {
  if (!fs.existsSync(queuePath)) {
    throw new Error(`Queue file not found: ${queuePath}`);
  }
  const raw = fs.readFileSync(queuePath, "utf8").trim();
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("Queue file must contain an array");
  }
  return data;
}

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const args = parseArgs(process.argv.slice(2));
  const queuePath = resolvePath(rootDir, args.queue);

  // preload environment defaults
  const envFile = path.join(rootDir, "config", "monster8_env.json");
  if (fs.existsSync(envFile)) {
    const data = JSON.parse(fs.readFileSync(envFile, "utf8"));
    Object.entries(data).forEach(([key, value]) => {
      if (process.env[key] === undefined) {
        process.env[key] = String(value);
      }
    });
  }

  if (args.mode) {
    process.env.LLM_GEN_MODE = args.mode;
  }
  if (args.qaMode) {
    process.env.LLM_QA_MODE = args.qaMode;
  }

  const queue = loadQueue(queuePath);
  if (queue.length === 0) {
    console.log(`[BATCH] Queue ${queuePath} is empty.`);
    return;
  }

  console.log(`[BATCH] Processing ${queue.length} topic(s) from ${queuePath}`);
  if (args.mode) console.log(`[BATCH] Mode: ${args.mode}`);
  if (args.lengthMode) console.log(`[BATCH] Length mode: ${args.lengthMode}`);
  if (args.lang) console.log(`[BATCH] Language filter: ${args.lang}`);
  if (args.delayMs) console.log(`[BATCH] Delay between items: ${args.delayMs}ms`);
  if (args.skipRender) console.log(`[BATCH] Skip render: enabled`);
  if (args.skipValidate) console.log(`[BATCH] Skip validate: enabled`);

  let success = 0;
  let failed = 0;

  queue.forEach((entry, index) => {
    const topicFile = entry.topic_file || entry.path || entry.topicFile;
    if (!topicFile) {
      console.error(`[BATCH] [${index + 1}/${queue.length}] Missing topic_file field`);
      failed += 1;
      if (args.stopOnError) process.exit(1);
      return;
    }

    // Фильтр по языку, если указан
    if (args.lang) {
      try {
        const topic = JSON.parse(fs.readFileSync(resolvePath(rootDir, topicFile), "utf8"));
        if (topic.language !== args.lang) {
          console.log(`[BATCH] [${index + 1}/${queue.length}] Skipping (lang=${topic.language}, expected=${args.lang}): ${topicFile}`);
          return;
        }
      } catch (err) {
        console.error(`[BATCH] [${index + 1}/${queue.length}] Failed to read topic file: ${topicFile}`);
        failed += 1;
        if (args.stopOnError) process.exit(1);
        return;
      }
    }

    const resolvedTopic = resolvePath(rootDir, topicFile);
    console.log(`\n[BATCH] [${index + 1}/${queue.length}] Building ${resolvedTopic}`);

    const childEnv = {
      ...process.env,
      LLM_GEN_MODE: args.mode || process.env.LLM_GEN_MODE || "ensemble"
    };
    if (args.qaMode) childEnv.LLM_QA_MODE = args.qaMode;
    if (args.lengthMode) childEnv.LENGTH_MODE = args.lengthMode;
    if (args.skipRender) childEnv.SKIP_RENDER = "1";
    if (args.skipValidate) childEnv.SKIP_VALIDATE = "1";

    // В background режиме используем меньшую параллельность и задержки
    const buildScript = args.mode === "background" 
      ? `scripts/build_topic_page.sh ${JSON.stringify(resolvedTopic)} --skip-gen=${args.skipValidate ? "0" : "1"}`
      : `scripts/build_topic_page.sh ${JSON.stringify(resolvedTopic)}`;

    const result = spawnSync("bash", ["-lc", buildScript], {
      stdio: args.mode === "background" ? "pipe" : "inherit",
      cwd: rootDir,
      env: childEnv
    });

    if (result.status === 0) {
      success += 1;
    } else {
      failed += 1;
      console.error(`[BATCH] Topic failed: ${resolvedTopic}`);
      if (args.stopOnError) {
        console.error("[BATCH] stop-on-error enabled → aborting");
        process.exit(result.status || 1);
      }
    }

    // Задержка между элементами (для background режима)
    if (args.delayMs && index < queue.length - 1) {
      const delaySec = (args.delayMs / 1000).toFixed(1);
      console.log(`[BATCH] Waiting ${delaySec}s before next item...`);
      const startWait = Date.now();
      while (Date.now() - startWait < args.delayMs) {
        // Busy wait
      }
    }
  });

  console.log(`\n[BATCH] Completed. success=${success} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[BATCH] Fatal error: ${err.message}`);
    process.exit(1);
  }
}

