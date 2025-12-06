const fs = require("fs");
const path = require("path");

function wordCount(text = "") {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function evaluateBlock(id, text) {
  const count = wordCount(text);
  if (count === 0) {
    return { id, severity: "FATAL", reason: "Block empty" };
  }
  if (count < 80) {
    return { id, severity: "FATAL", reason: `Block too short (${count} words)` };
  }
  if (count < 140) {
    return { id, severity: "MAJOR", reason: `Block weak (${count} words)` };
  }
  if (!/[.!?]$/.test(text.trim())) {
    return { id, severity: "MINOR", reason: "Block missing terminal punctuation" };
  }
  return { id, severity: "OK", reason: "" };
}

function logQualityError(topic, blockId, error, wordcount) {
  try {
    const logDir = path.join(__dirname, "..", "data", "quality_logs");
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "quality_errors.jsonl");
    
    const entry = {
      timestamp: new Date().toISOString(),
      topic_id: topic?.topic_id || topic?.id || "unknown",
      article_type: topic?.type || "unknown",
      zone: topic?.zone || null,
      language: topic?.language || "en",
      audience_segment: topic?.audience_segment || "us_general",
      block_id: blockId,
      error: error.reason,
      severity: error.severity,
      wordcount: wordcount,
      state: topic?.dimensions?.state || null
    };
    
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
  } catch (e) {
    // Игнорируем ошибки логирования, чтобы не ломать валидацию
  }
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/validate_blocks.js <blocks.json>");
    process.exit(1);
  }

  let payload;
  try {
    const rawContent = fs.readFileSync(inputPath, "utf8");
    // Очищаем возможные артефакты в конце файла
    const cleanedContent = rawContent.trim();
    // Убираем все после последнего закрывающего }
    const lastBrace = cleanedContent.lastIndexOf('}');
    if (lastBrace > 0) {
      const jsonContent = cleanedContent.substring(0, lastBrace + 1);
      payload = JSON.parse(jsonContent);
    } else {
      throw new Error("Invalid JSON structure");
    }
  } catch (err) {
    console.error(`[ERR] Failed to parse JSON from ${inputPath}: ${err.message}`);
    console.log("SEVERITY: FATAL=1; MAJOR=0; MINOR=0; WORDCOUNT=0");
    process.exit(1);
  }

  const blocks = payload.blocks || {};
  const topic = payload.topic || {};

  let totals = { FATAL: 0, MAJOR: 0, MINOR: 0, OK: 0 };
  let totalWords = 0;
  const findings = [];

  for (const [blockId, text] of Object.entries(blocks)) {
    const blockWordCount = wordCount(text);
    totalWords += blockWordCount;
    const result = evaluateBlock(blockId, text || "");
    totals[result.severity] = (totals[result.severity] || 0) + 1;
    
    // Логируем ошибки качества
    if (result.severity !== "OK") {
      findings.push(`${result.severity}: ${blockId} -> ${result.reason}`);
      logQualityError(topic, blockId, result, blockWordCount);
    }
  }

  if (totalWords < 1200) {
    totals.FATAL += 1;
    findings.push(`FATAL: Total word count too low (${totalWords})`);
    logQualityError(topic, "total", { severity: "FATAL", reason: `Total word count too low (${totalWords})` }, totalWords);
  }

  const summary = `SEVERITY: FATAL=${totals.FATAL}; MAJOR=${totals.MAJOR}; MINOR=${totals.MINOR}; WORDCOUNT=${totalWords}`;
  console.log(summary);
  if (findings.length) {
    console.log("DETAILS:");
    findings.forEach((line) => console.log(` - ${line}`));
  }
}

if (require.main === module) {
  main();
}

// MONSTER 8.0 PATCH: Enhanced validation with block profiles
const blockProfiles = require("../config/block_profiles.json");

function validateBlockProfile(blockId, text) {
  const profile = blockProfiles.blocks?.[blockId];
  if (!profile) return { severity: "OK", reason: "" };
  
  const wordCount = text.trim().split(/\s+/).length;
  const minWords = profile.length?.min || 0;
  const maxWords = profile.length?.max || Infinity;
  
  if (wordCount < minWords) {
    return { severity: "MAJOR", reason: `Block ${blockId} too short (${wordCount} < ${minWords} min)` };
  }
  if (wordCount > maxWords * 1.2) {
    return { severity: "MINOR", reason: `Block ${blockId} too long (${wordCount} > ${maxWords * 1.2})` };
  }
  return { severity: "OK", reason: "" };
}

