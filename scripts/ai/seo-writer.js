// SEO writer поверх AI-клиента.
// Задача: по "pageSpec" (язык, интент, базовые данные) вернуть большой SEO-текст
// согласно жёсткому ТЗ: длина, структура, таблица, FAQ и т.п.

// Загружаем .env если доступен
try {
  require("dotenv").config();
} catch (e) {
  // dotenv не установлен или не нужен
}

const { callWithFallback } = require("./client");

const EN_STYLE_GUIDE = `
You are an industrial, reliability-first SEO writer for a US VIN check service.

Constraints:
- English (US), short sentences, no fluff.
- 600–1200 words.
- Main fact in the first 180 characters.
- Structure:
  - One H1 (up to 60 chars, no site brand).
  - Several H2/H3 with clear, functional labels.
  - One main data table (5–8 rows, 2–3 columns) with VIN-related fields.
  - 2–4 FAQ entries (real buyer questions, concise answers).
  - One trust block (why this service is safe/reliable).
  - One CTA block that can be turned into a form on page.
- No generic "as an AI language model" phrases.
- Every paragraph must contain either concrete data, explanation or actionable advice.
- Zero water, no repeated meaning with different words.
- Use US DMV / auction / insurance vocabulary where natural.
`;

const ES_STYLE_GUIDE = `
Eres redactor SEO especializado en mercado hispano de EE.UU. para un servicio de reporte VIN.

Constraints:
- Español US Hispanic (no formas de España).
- 650–1300 palabras.
- Usa léxico práctico: "reporte VIN", "historial del vehículo en EE.UU.", "checar VIN", "subastas", "aseguradoras", "título salvage", etc.
- Estructura:
  - Un H1 (hasta 60 caracteres, sin marca del sitio).
  - Varios H2/H3 muy prácticos (cómo usar el reporte, qué riesgos evitar, etc.).
  - Una tabla (5–8 filas, 2–3 columnas) con datos clave de VIN/vehículo.
  - 2–4 preguntas frecuentes (FAQ) con dudas reales de compradores hispanos.
  - Un bloque de confianza (por qué el reporte es confiable).
  - Un bloque de CTA adaptado a hispanos en EE.UU. (claro, directo, sin tecnicismos).
- Nada de frases tipo "como modelo de lenguaje".
- Cero relleno; cada párrafo resuelve una duda concreta o explica un dato útil.
`;

function buildSystemPrompt(lang) {
  if (lang === "es") return ES_STYLE_GUIDE;
  return EN_STYLE_GUIDE;
}

/**
 * pageSpec:
 * {
 *   lang: "en" | "es",
 *   intent: "vin-check" | "vehicle-history" | "accident-check" | "market-value",
 *   stateName?: string,
 *   make?: string,
 *   model?: string,
 *   year?: number,
 *   vinExample?: string,
 *   urlPath?: string
 * }
 *
 * Возвращает объект:
 * {
 *   h1,
 *   metaDescription,
 *   mainSummary,
 *   htmlBody,      // готовый HTML фрагмент <section>...</section>
 *   faqItems: [{q,a},...],
 *   wordCountEstimate
 * }
 */
async function generateSeoText(pageSpec) {
  const lang = pageSpec.lang === "es" ? "es" : "en";
  const systemPrompt = buildSystemPrompt(lang);
  const {
    intent,
    stateName,
    make,
    model,
    year,
    vinExample,
    urlPath,
  } = pageSpec;

  const userPrompt = `
Generate a FULL SEO page body for a VIN-report landing page.

Meta-spec:
- language: ${lang === "en" ? "English (US)" : "Español (US Hispanic)"}
- intent: ${intent || "vin-check"}
- state: ${stateName || "generic US"}
- make: ${make || "generic"}
- model: ${model || "generic"}
- year: ${year || "N/A"}
- example VIN: ${vinExample || "1HGCM82633A004352"}
- url path: ${urlPath || "/vin/EXAMPLE/"}

Hard constraints from spec:
- main fact in first 180 characters;
- one H1, several H2/H3;
- at least one VIN-related data table (5–8 rows, 2–3 columns);
- 2–4 FAQ items;
- one trust block;
- one CTA block;
- ZERO boilerplate or generic AI disclaimers.

Return JSON ONLY, no prose, in the following shape:

{
  "h1": "...",
  "metaDescription": "...",
  "mainSummary": "...",
  "htmlBody": "<section>...</section>",
  "faqItems": [
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." }
  ],
  "wordCountEstimate": 0
}

Make sure htmlBody is valid HTML fragments (no <html>, no <head>), only content blocks.
`;

  const result = await callWithFallback({
    systemPrompt,
    userPrompt,
    maxTokens: 1800,
    temperature: lang === "es" ? 0.5 : 0.35,
  });

  let parsed;
  try {
    // Модели иногда оборачивают JSON в ``` — чистим.
    const text = result.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `SEO writer: failed to parse AI JSON: ${err.message || err}\nRAW:\n${result.text}`
    );
  }

  return {
    h1: parsed.h1 || "",
    metaDescription: parsed.metaDescription || "",
    mainSummary: parsed.mainSummary || "",
    htmlBody: parsed.htmlBody || "",
    faqItems: Array.isArray(parsed.faqItems) ? parsed.faqItems : [],
    wordCountEstimate: parsed.wordCountEstimate || 0,
    provider: result.provider,
    model: result.model,
  };
}

/**
 * CLI-режим для dry-run:
 *   node scripts/ai/seo-writer.js --lang=en --intent=vin-check --state="California" --make=Toyota --year=2018
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || idx === args.length - 1) return def;
    return args[idx + 1];
  };

  const lang = getArg("lang", "en");
  const intent = getArg("intent", "vin-check");
  const stateName = getArg("state", "California");
  const make = getArg("make", "Toyota");
  const model = getArg("model", "Camry");
  const year = parseInt(getArg("year", "2018"), 10) || 2018;

  generateSeoText({
    lang,
    intent,
    stateName,
    make,
    model,
    year,
  })
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      console.error("SEO writer error:", err.message || err);
      process.exit(1);
    });
}

module.exports = {
  generateSeoText,
};

