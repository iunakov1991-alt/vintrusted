// scripts/seo-text-quality.js
// Жёсткий контент-движок: считает слова, FAQ, проверяет базовые критерии плотности.
// Ничего не ломает — только считает и добавляет data-* атрибуты + может логировать.

const fs = require("fs");
const path = require("path");

const QUALITY_LOG_PATH =
  process.env.SEO_QUALITY_LOG_PATH ||
  path.join(__dirname, "..", "data", "seo-quality.log");

function countWordsFromHtml(html) {
  if (!html) return 0;
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

function evaluatePageQuality({ lang, slugPath, htmlBlocks, faqItems }) {
  const totalWords = htmlBlocks.reduce(
    (sum, block) => sum + countWordsFromHtml(block),
    0
  );
  const faqCount = Array.isArray(faqItems) ? faqItems.length : 0;
  const hasTable = htmlBlocks.some((b) => /<table[\s>]/i.test(b));
  const hasSummary = htmlBlocks.some((b) => /data-block="summary"/.test(b));

  const minWords = 250;
  const targetWords = 500;
  const minFaq = 2;
  const maxFaq = 16;

  const flags = [];

  if (totalWords < minWords) flags.push("LOW_WORD_COUNT");
  if (totalWords > 1200) flags.push("HIGH_WORD_COUNT");
  if (!hasTable) flags.push("NO_TABLE");
  if (!hasSummary) flags.push("NO_SUMMARY");
  if (faqCount < minFaq) flags.push("LOW_FAQ");
  if (faqCount > maxFaq) flags.push("HIGH_FAQ");

  const ok =
    totalWords >= minWords &&
    totalWords <= 1200 &&
    faqCount >= minFaq &&
    faqCount <= maxFaq &&
    hasTable &&
    hasSummary;

  const record = {
    ts: new Date().toISOString(),
    lang: lang || "en",
    slugPath: slugPath || "",
    totalWords,
    faqCount,
    hasTable,
    hasSummary,
    ok,
    flags,
  };

  // Пишем лог только если включен флаг (чтобы не грузить build по умолчанию)
  if (process.env.SEO_QUALITY_LOG === "1") {
    try {
      fs.mkdirSync(path.dirname(QUALITY_LOG_PATH), { recursive: true });
      fs.appendFileSync(
        QUALITY_LOG_PATH,
        JSON.stringify(record) + "\n",
        "utf8"
      );
    } catch (err) {
      // не падаем из-за логгера
    }
  }

  return record;
}

module.exports = {
  evaluatePageQuality,
};
