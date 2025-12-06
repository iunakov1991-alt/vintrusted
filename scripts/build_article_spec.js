const fs = require("fs");
const path = require("path");

function loadJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

const articleTypes = loadJson("config/article_types.json", {});
const blockProfiles = loadJson("config/block_profiles.json", {});
const audienceSegments = loadJson("config/audience_segments.json", {});
const learnedStrategy = loadJson("config/learned_strategy.json", {
  version: "1.0",
  article_type_weights: {},
  audience_weights: {},
  language_weights: {},
  zone_priority: {}
});

function resolveArticleType(typeId) {
  const articleType = articleTypes.article_types?.[typeId];
  if (!articleType) {
    throw new Error(`Unknown article type: ${typeId}`);
  }
  return articleType;
}

function collectMustIncludeTerms(topic) {
  const terms = new Set(topic.must_include_terms || []);
  const dims = topic.dimensions || {};
  if (topic.zone) terms.add(topic.zone);
  if (dims.state) terms.add(dims.state);
  if (dims.brand) terms.add(dims.brand);
  terms.add("VIN");
  return Array.from(terms);
}

function applyAudienceBias(block, topic) {
  const audienceId = topic.audience_segment || topic.audience || "us_general";
  const audience = audienceSegments.audience?.[audienceId];
  if (!audience) return block;
  const language = audience.language || "en";
  return {
    ...block,
    language,
    notes: audience.notes || []
  };
}

function applyStrategyToBlocks(topic, blocks) {
  // Получаем веса из learned_strategy
  const typeWeight = learnedStrategy.article_type_weights?.[topic.type] || 1.0;
  const langWeight = learnedStrategy.language_weights?.[topic.language || "en"] || 1.0;
  const audWeight = learnedStrategy.audience_weights?.[topic.audience_segment || "us_general"] || 1.0;
  const zoneWeight = learnedStrategy.zone_priority?.[topic.zone] || 1.0;
  
  // Комбинированный фактор (среднее взвешенное)
  let factor = (typeWeight * 0.4 + langWeight * 0.3 + audWeight * 0.2 + zoneWeight * 0.1);
  
  // Применяем length_mode (short/long) из окружения
  const lengthMode = process.env.LENGTH_MODE;
  if (lengthMode === "short") {
    factor *= 0.7; // Уменьшаем длину на 30%
  } else if (lengthMode === "long") {
    factor *= 1.3; // Увеличиваем длину на 30%
  }
  
  // Если factor > 1.0, увеличиваем длину блоков (успешные типы)
  // Если factor < 1.0, уменьшаем (проблемные типы)
  if (Math.abs(factor - 1.0) < 0.05) {
    // Изменение < 5%, не применяем
    return blocks;
  }
  
  return blocks.map(block => {
    const length = { ...block.length };
    const span = length.max - length.min;
    
    if (span > 0 && factor !== 1.0) {
      // Изменяем длину на основе фактора
      const adjustment = Math.round(span * (factor - 1.0) * 0.3); // Максимум 30% изменения
      length.min = Math.max(80, length.min + adjustment);
      length.max = Math.max(length.min + 20, length.max + adjustment);
    }
    
    return {
      ...block,
      length
    };
  });
}

function buildArticleSpec(topic) {
  if (!topic || !topic.type) {
    throw new Error("Topic must include a 'type' field");
  }
  const articleType = resolveArticleType(topic.type);
  const mustIncludeTerms = collectMustIncludeTerms(topic);

  let blocks = (articleType.default_blocks || []).map((blockId) => {
    const profile = blockProfiles.blocks?.[blockId];
    if (!profile) return null;
    const blockSpec = {
      id: blockId,
      role: profile.role,
      length: profile.length,
      style: profile.style,
      intents: profile.default_intents || [],
      must_include_terms: mustIncludeTerms
    };
    return applyAudienceBias(blockSpec, topic);
  }).filter(Boolean);

  // Применяем learned_strategy для корректировки длин блоков
  blocks = applyStrategyToBlocks(topic, blocks);

  return {
    mode: "article_blocks",
    topic,
    blocks,
    output_format: "TEXT_WITH_DELIMS",
    delim: "\n\n===BLOCK_END===\n\n",
    meta: {
      article_type: topic.type,
      zone: topic.zone || null,
      recommended_length: articleType.recommended_length || null,
      strategy_applied: true,
      strategy_factor: (learnedStrategy.article_type_weights?.[topic.type] || 1.0)
    }
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--topic-file");
  if (idx === -1 || !args[idx + 1]) {
    console.error("Usage: node scripts/build_article_spec.js --topic-file data/topic.json");
    process.exit(1);
  }
  const topicPath = args[idx + 1];
  const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
  const spec = buildArticleSpec(topic);
  process.stdout.write(JSON.stringify(spec, null, 2));
}

module.exports = { buildArticleSpec };
