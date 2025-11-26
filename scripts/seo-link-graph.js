// scripts/seo-link-graph.js
// Агрессивный, но контролируемый граф перелинковки.
// Цель:
//  - 2–5 внутренних ссылок на странице;
//  - осмысленные связи (state/make/year/model);
//  - без повторяющихся анкорных шаблонов.

const path = require("path");

function normalizeSlug(slug) {
  if (!slug) return "/";
  let s = String(slug);
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/\/+/g, "/");
}

// Простая hash-функция для детерминированной ротации ссылок
function hash(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * context: {
 *   slugPath,
 *   lang: 'en' | 'es',
 *   stateCode,
 *   make,
 *   year,
 *   model,
 *   intent, // vin-check / vehicle-history / accident-check / market-value / dmv / fraud / auction / maintenance
 * }
 */
function buildInternalLinks(context) {
  const slugPath = normalizeSlug(context.slugPath || "/");
  const lang = (context.lang || "en").toLowerCase();
  const links = [];
  const basePrefix = lang === "es" ? "/es" : "";

  const stateCode = context.stateCode ? String(context.stateCode).toLowerCase() : null;
  const makeSlug = context.make ? slugify(context.make) : null;
  const year = context.year || null;
  const model = context.model ? slugify(context.model) : null;

  // 1. Родительский уровень: штат
  if (stateCode) {
    links.push({
      href: `${basePrefix}/vin-check/${stateCode}/`,
      anchor:
        lang === "es"
          ? `Checar VIN por estado en ${stateCode.toUpperCase()}`
          : `VIN check by state in ${stateCode.toUpperCase()}`,
    });
  }

  // 2. Комбинация make+year
  if (stateCode && makeSlug && year) {
    links.push({
      href: `${basePrefix}/vin-check/${stateCode}/${makeSlug}/${year}/`,
      anchor:
        lang === "es"
          ? `Historial del vehículo ${context.make} ${year} en ${stateCode.toUpperCase()}`
          : `${context.make} ${year} vehicle history in ${stateCode.toUpperCase()}`,
    });
  }

  // 3. Модельный уровень, если есть model
  if (stateCode && makeSlug && model && year) {
    links.push({
      href: `${basePrefix}/vin-guide/${stateCode}/${makeSlug}/${model}/${year}/`,
      anchor:
        lang === "es"
          ? `Guía de VIN para ${context.make} ${model.toUpperCase()} ${year}`
          : `VIN guide for ${context.make} ${model.toUpperCase()} ${year}`,
    });
  }

  // 4. Тематические кластеры вокруг интента
  const h = hash(slugPath);
  const bucket = h % 4;

  if (bucket === 0) {
    links.push({
      href: `${basePrefix}/fraud/odometer-rollback/`,
      anchor:
        lang === "es"
          ? "Cómo detectar fraude de odómetro (odometer rollback)"
          : "How to detect odometer rollback fraud",
    });
  } else if (bucket === 1) {
    links.push({
      href: `${basePrefix}/auctions/copart-vs-iaai/`,
      anchor:
        lang === "es"
          ? "Copart vs IAAI: riesgos ocultos en autos de subasta"
          : "Copart vs IAAI: hidden risks in auction cars",
    });
  } else if (bucket === 2) {
    links.push({
      href: `${basePrefix}/dmv/title-brands/`,
      anchor:
        lang === "es"
          ? "Marcas de título DMV: salvage, rebuilt, junk"
          : "DMV title brands: salvage, rebuilt, junk",
    });
  } else {
    links.push({
      href: `${basePrefix}/ownership/cost-of-ownership/`,
      anchor:
        lang === "es"
          ? "Costo real de tener un vehículo usado"
          : "Real cost of owning a used vehicle",
    });
  }

  // Обрезаем до 5 ссылок и убираем дубликаты
  const seen = new Set();
  const filtered = [];
  for (const link of links) {
    if (!link || !link.href) continue;
    const key = link.href;
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(link);
  }

  return filtered.slice(0, 5);
}

module.exports = {
  buildInternalLinks,
};
