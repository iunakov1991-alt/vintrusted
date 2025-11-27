// scripts/seo-config.js
// Центральный конфиг для Quality & Feedback Layer.

const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_PAGES_ROOT = path.join(PUBLIC_DIR, "static-pages");

// Базовый домен
const BASE_URL =
  (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/, "");

// Порог качества страницы
const QUALITY_CONFIG = {
  MIN_WORDS: 250,
  MAX_WORDS: 1500,
  MIN_FACT_BLOCKS: 3,
  REQUIRE_TABLE: true,
  MIN_TABLE_ROWS: 5,
  MIN_FAQ_ITEMS: 2,
  MAX_FAQ_ITEMS: 20,
  MAIN_FACT_MAX_CHARS: 180,
  MIN_SCORE: 0.7, // итоговый SEO-score (0–1), ниже — страница считается low-quality
  AUTO_FILTER_LOW_QUALITY: true, // если true — вырезаем low-quality URLs из sitemap
};

// Интенты (расширенный набор)
const INTENTS = [
  "vin-check",
  "vehicle-history",
  "accident-check",
  "market-value",
  "buy-vs-lease",
  "best-year",
  "common-problems",
  "is-reliable",
  "dmv-title-transfer",
];

// Дополнительные кластеры
const CLUSTERS = {
  FRAUD: [
    "title-wash",
    "odometer-rollback",
    "salvage-flip",
    "flood-damage-hidden",
    "curbstoning",
  ],
  AUCTIONS: [
    "copart",
    "iaai",
    "manheim",
    "adesa",
    "local-public-auctions",
  ],
  OWNERSHIP_COST: [
    "maintenance-cost",
    "insurance-cost",
    "fuel-cost",
    "depreciation",
    "total-cost-of-ownership",
  ],
  DMV: [
    "registration",
    "title-transfer",
    "smog-check",
    "fees",
    "salvage-process",
  ],
};

// ES-лексика для US Hispanic рынка
const ES_HISPANIC_LEX = {
  base: [
    "checar VIN",
    "reporte del historial del carro",
    "informe del vehículo en EE.UU.",
    "reporte barato de VIN",
    "historial de accidentes",
    "título salvage",
    "carro chocado",
    "vehículo usado",
  ],
  callToAction: [
    "Ver reporte ahora",
    "Checar VIN en segundos",
    "Ver historial completo",
    "Ver reporte del carro",
  ],
};

// Штаты с высокой долей Hispanic населения (для ES-стиля)
const HISPANIC_HEAVY_STATES = ["CA", "TX", "FL", "NV", "AZ", "NM", "CO", "NJ", "NY", "IL"];

// Ограничители скорости/объёма (safety)
const SAFETY = {
  GLOBAL_MAX_NEW_PAGES_PER_BUILD: parseInt(
    process.env.SEO_GLOBAL_MAX_NEW_PAGES_PER_BUILD || "2000000",
    10
  ),
  GLOBAL_MAX_EXPOSE_PER_DAY: parseInt(
    process.env.SEO_GLOBAL_MAX_EXPOSE_PER_DAY || "300000",
    10
  ),
  PENALTY_MODE: process.env.SEO_PENALTY_MODE === "on", // если on — замедляем раскрытие
};

// Вспомогательные пути
module.exports = {
  ROOT,
  PUBLIC_DIR,
  STATIC_PAGES_ROOT,
  BASE_URL,
  QUALITY_CONFIG,
  INTENTS,
  CLUSTERS,
  ES_HISPANIC_LEX,
  HISPANIC_HEAVY_STATES,
  SAFETY,
};

