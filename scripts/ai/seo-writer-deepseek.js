// scripts/ai/seo-writer-deepseek.js
// Генерация EN/ES SEO-текста для VIN-страниц по сверхжёсткому ТЗ.
// Используется DeepSeek (через deepseek-client).

const { callDeepseekChat } = require("./deepseek-client.js");

/**
 * Общий system-prompt для жёсткого SEO-стандарта.
 * Никакой воды, строго по требованиям.
 */
const BASE_SYSTEM_PROMPT = `
You are an industrial-grade SEO content engine for a VIN history service.
Your job is to generate FACT-DRIVEN, HIGH-DENSITY pages, not generic AI text.

STRICT REQUIREMENTS (APPLY ALL):

1) TEXT DENSITY & LENGTH
- Main fact (core answer to user intent) MUST appear in the first 180 characters.
- Total body text (excluding table and FAQ labels) must be between 600 and 1200 words for EN,
  and 650 to 1300 words for ES.
- At least 0.35 "useful data units" per 100 words: numbers, named entities, specific facts, or clear instructions.
- NO fluffy generic "AI tone".

2) STRUCTURE & HEADINGS
- Exactly ONE H1.
- Several H2/H3 sections with clear, task-focused headings (no poetic nonsense).
- Include at least:
  - Intro block (100–150 words).
  - Data details block.
  - Risk/fraud block (for used cars, auctions, title problems).
  - How-to block (how to use the VIN report to avoid bad deals).
- Reorder blocks per page for structural uniqueness.

3) TABLE
- Provide a VIN data table with 5–8 rows and 2–3 columns.
- Values must be consistent with the requested make/model/year/region.
- Rows can include: Title status, Auction risk, Odometer risk, State-specific issues, Average repair cost, etc.

4) FAQ
- 12–16 FAQ items for EN; 12–16 for ES.
- Questions must be realistic, specific, and non-generic.
- Answers must be short, factual, and different from body text, no copy/paste.
- Use a JSON-ready structure in your output for FAQ.

5) STYLE
- EN: industrial, short sentences, reliability-first, neutral, US market.
- ES: US Hispanic auto slang and vocabulary:
  - Use terms like "reporte de VIN", "historial del vehículo en EE.UU.", "checar el VIN", "título salvage",
    "subastas", "dealer", "carros usados", "compra en efectivo".
  - NO Spain-style phrasing, NO "vosotros", NO literary language.

6) HREFLANG & META
- Provide:
  - title (55–65 chars),
  - metaDescription (135–150 chars),
  - one H1,
  - a list of H2/H3 headings.
- Title and meta MUST reflect make, model, year, and state when provided.

7) OUTPUT FORMAT
Return a single JSON object with:

{
  "title": "...",
  "metaDescription": "...",
  "h1": "...",
  "introHtml": "<p>...</p>",
  "sections": [
    { "id": "string", "heading": "string", "html": "<p>...</p>" }
  ],
  "table": {
    "caption": "string",
    "columns": ["Col1", "Col2"],
    "rows": [
      ["Cell1", "Cell2"],
      ...
    ]
  },
  "faq": [
    { "q": "question1", "a": "answer1" },
    ...
  ],
  "summaryFact": "Main fact in <=180 characters plain text."
}

- HTML must be simple: <p>, <ul>, <ol>, <li>, <strong>, <em>, <table>-like structure in JSON only.
- DO NOT include <html>, <head>, <body>, or full page markup.
- DO NOT include backticks or markdown, ONLY pure JSON.
`;

/**
 * Генерация EN-страницы.
 */
async function generateSeoArticleEN(context) {
  const {
    vin,
    make,
    model,
    year,
    stateCode,
    stateName,
    intent, // "vin-check" | "vehicle-history" | ...
  } = context;

  const userPrompt = `
Generate an ENGLISH SEO page for a VIN history / ${intent} query.

Entity details:
- VIN (if present): ${vin || "N/A"}
- Make: ${make || "N/A"}
- Model: ${model || "N/A"}
- Year: ${year || "N/A"}
- State code: ${stateCode || "N/A"}
- State name: ${stateName || "N/A"}
- Market: United States used cars.

Intent:
- User wants to check a used car before buying.
- Focus on: titles (clean/salvage/rebuilt), auctions, odometer, accidents, recall risk, repair costs, DMV specifics.

Language:
- STRICTLY ENGLISH (US).
- Industrial, practical, no jokes, no fluff.

Remember:
- Follow ALL structural requirements.
- Return ONLY a single JSON object as described in the system prompt.
`;

  const raw = await callDeepseekChat({
    messages: [
      { role: "system", content: BASE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 4096,
    temperature: 0.45,
  });

  return parseJsonSafe(raw, "EN");
}

/**
 * Генерация ES-страницы (US Hispanic).
 */
async function generateSeoArticleES(context) {
  const {
    vin,
    make,
    model,
    year,
    stateCode,
    stateName,
    intent,
  } = context;

  const userPrompt = `
Genera una página SEO en ESPAÑOL para un reporte de VIN / consulta de historial de vehículo en EE.UU.

Detalles de la unidad:
- VIN (si está): ${vin || "N/A"}
- Marca: ${make || "N/A"}
- Modelo: ${model || "N/A"}
- Año: ${year || "N/A"}
- Estado (código): ${stateCode || "N/A"}
- Estado (nombre): ${stateName || "N/A"}
- Mercado: carros usados en Estados Unidos.

Intención:
- La persona quiere checar el VIN antes de comprar un carro usado.
- Enfócate en: título limpio/salvage/rebuilt, riesgo de subastas, odómetro alterado,
  accidentes, recalls, costo de reparación, detalles del DMV del estado.

Lenguaje:
- Español US Hispanic, muy práctico:
  - Usa términos como "reporte de VIN", "checar el VIN", "historial del vehículo en EE.UU.",
    "título salvage", "subasta", "dealer", "carros usados".
  - NO uses formas de España, NO "vosotros", NO lenguaje literario.

Recuerda:
- Sigue TODOS los requisitos estructurales.
- Regresa SOLO un objeto JSON en el formato definido en el system prompt.
`;

  const raw = await callDeepseekChat({
    messages: [
      { role: "system", content: BASE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 4096,
    temperature: 0.5,
  });

  return parseJsonSafe(raw, "ES");
}

/**
 * Безопасный парсинг JSON из модели.
 */
function parseJsonSafe(raw, langTag) {
  try {
    const cleaned = raw
      .trim()
      .replace(/```json/gi, "")
      .replace(/```/g, "");

    const data = JSON.parse(cleaned);
    return data;
  } catch (err) {
    console.error("[SEO-AI] JSON parse error for", langTag, err.message);
    return {
      title: "",
      metaDescription: "",
      h1: "",
      introHtml: "<p>CONTENT PARSE ERROR</p>",
      sections: [],
      table: { caption: "", columns: [], rows: [] },
      faq: [],
      summaryFact: "",
      _raw: raw,
      _error: err.message,
    };
  }
}

module.exports = {
  generateSeoArticleEN,
  generateSeoArticleES,
};


