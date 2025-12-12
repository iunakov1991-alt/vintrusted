#!/usr/bin/env node
/**
 * Render HTML article from MONSTER 8.0 blocks JSON.
 *
 * Usage:
 *   node scripts/render_article_from_blocks.js \
 *     --blocks-file tmp/topic.foo.blocks.json
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--blocks-file" && val) {
      args.blocksFile = val;
      i += 1;
    }
  }
  return args;
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitParagraphs(text = "") {
  if (!text.trim()) return [];
  const parts = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (parts.length > 1) return parts;
  // fall back to single newlines
  return text
    .split(/\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function detectList(lines) {
  if (!lines.length) return { type: null, items: [] };
  const orderedPattern = /^\d+[\).]\s+/;
  const unorderedPattern = /^(?:[-*•]|\d+[-.])\s+/;

  let orderedMatches = 0;
  let unorderedMatches = 0;
  const items = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (orderedPattern.test(trimmed)) {
      orderedMatches += 1;
      items.push(trimmed.replace(/^\d+[\).]\s+/, ""));
    } else if (unorderedPattern.test(trimmed)) {
      unorderedMatches += 1;
      items.push(trimmed.replace(/^(?:[-*•]|\d+[-.])\s+/, ""));
    } else {
      items.push(trimmed);
    }
  });

  const total = lines.length;
  if (orderedMatches >= Math.floor(total / 2)) {
    return { type: "ol", items };
  }
  if (unorderedMatches >= Math.floor(total / 2)) {
    return { type: "ul", items };
  }
  return { type: null, items: lines };
}

function extractFaqPairs(text) {
  const pairs = [];
  // Паттерны для Q/A пар
  const patterns = [
    // "P: **вопрос** R: ответ"
    /P:\s*\*\*([^*]+)\*\*\s*R:\s*(.+?)(?=P:|$)/gs,
    // "¿Pregunta? Respuesta"
    /¿([^?]+\?)\s+(.+?)(?=¿|$)/gs,
    // "Q: вопрос? A: ответ"
    /Q:\s*([^?]+\?)\s+A:\s*(.+?)(?=Q:|$)/gs,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach(match => {
        pairs.push({
          question: match[1].trim(),
          answer: match[2].trim()
        });
      });
      return pairs;
    }
  }

  // Fallback: разбить по параграфам и найти вопросы
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
  let currentQuestion = null;
  paragraphs.forEach(p => {
    const trimmed = p.trim();
    if (/^[¿P]/.test(trimmed) || /\?$/.test(trimmed)) {
      if (currentQuestion) {
        pairs.push({ question: currentQuestion, answer: "" });
      }
      currentQuestion = trimmed.replace(/^[¿P]:?\s*\*\*?/, "").replace(/\*\*?$/, "").trim();
    } else if (currentQuestion && trimmed) {
      pairs.push({ question: currentQuestion, answer: trimmed });
      currentQuestion = null;
    }
  });

  return pairs.length > 0 ? pairs : null;
}

function getBlockTitle(id, language = "en") {
  const titles = {
    en: {
      context_legal: "Legal Context",
      legal_state: "Legal Context",
      step_by_step: "Step by Step",
      mistakes: "Common Mistakes",
      common_errors: "Common Errors",
      fees_taxes: "Fees and Taxes",
      checklist: "Checklist",
      comparison_table: "Title Type Comparison",
      vin_section: "VIN Verification",
      vin_verification_mini: "VIN Verification",
      faq: "Frequently Asked Questions"
    },
    es: {
      context_legal: "Contexto legal",
      legal_state: "Contexto legal",
      step_by_step: "Paso a paso",
      mistakes: "Errores comunes",
      common_errors: "Errores comunes",
      fees_taxes: "Tarifas e impuestos",
      checklist: "Checklist",
      comparison_table: "Comparación de tipos de título",
      vin_section: "Verificación de VIN",
      vin_verification_mini: "Verificación de VIN",
      faq: "Preguntas frecuentes"
    }
  };
  const lang = language === "es" ? "es" : "en";
  return titles[lang][id] || id;
}

function blockToHtml(id, text, topic = {}, blockAnchors = {}) {
  const escapedId = escapeHtml(id);
  const paragraphs = splitParagraphs(text);
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const listCandidate = detectList(lines);
  const language = topic.language || "en";
  
  // Получаем якорь для блока
  const anchor = blockAnchors[id] || slugify(getBlockTitle(id, language)) || id;
  const anchorAttr = anchor ? `id="${escapeHtml(anchor)}"` : "";

  const wrapSection = (inner) => `<section data-block-id="${escapedId}" ${anchorAttr}>${inner}</section>`;

  const renderParagraphs = (chunks) =>
    chunks
      .map((chunk) => `<p>${escapeHtml(chunk)}</p>`)
      .join("\n");

  switch (id) {
    case "hero": {
      // Разделяем hero текст на title (короткий заголовок) и subtitle (остальное)
      const fullText = text.trim();
      
      // Ищем первое предложение (заканчивается на . ! ?)
      const firstSentenceMatch = fullText.match(/^([^.!?]+[.!?])/);
      let title = "";
      let subtitle = "";
      
      if (firstSentenceMatch) {
        title = firstSentenceMatch[1].trim();
        subtitle = fullText.substring(firstSentenceMatch[0].length).trim();
      } else {
        // Если нет точки, берем первые слова до запятой или точки с запятой
        const commaMatch = fullText.match(/^([^,;]+[,;])/);
        if (commaMatch) {
          title = commaMatch[1].trim();
          subtitle = fullText.substring(commaMatch[0].length).trim();
        } else {
          // Fallback: первые 15 слов
          const words = fullText.split(/\s+/);
          if (words.length > 15) {
            title = words.slice(0, 15).join(" ") + "...";
            subtitle = words.slice(15).join(" ");
          } else {
            title = fullText;
          }
        }
      }
      
      // Ограничиваем длину title (максимум 100 символов для SEO)
      if (title.length > 100) {
        const truncated = title.substring(0, 97);
        const lastSpace = truncated.lastIndexOf(" ");
        const lastPunct = Math.max(
          truncated.lastIndexOf("."),
          truncated.lastIndexOf("!"),
          truncated.lastIndexOf("?")
        );
        const cutPoint = lastPunct > 0 ? lastPunct + 1 : (lastSpace > 0 ? lastSpace : 97);
        title = truncated.substring(0, cutPoint).trim();
        if (!/[.!?]$/.test(title)) {
          title += "...";
        }
        // Добавляем обрезанную часть к subtitle
        const cutFromOriginal = fullText.substring(0, cutPoint).length;
        subtitle = fullText.substring(cutFromOriginal).trim();
      }
      
      const state = topic.dimensions?.state || "";
      const zone = topic.zone || "";
      return `<div class="seo-hero">
  <div class="seo-hero__content">
    <div class="seo-hero__eyebrow">
      <span class="seo-hero__eyebrow-pill"></span>
      ${zone ? escapeHtml(zone.replace(/_/g, " ")) : "Guide"}
    </div>
    <h1 class="seo-hero__title">${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="seo-hero__subtitle">${renderParagraphs(splitParagraphs(subtitle))}</div>` : ""}
    ${state ? `<div class="seo-hero__meta">
      <span class="seo-hero__chip">${escapeHtml(state)}</span>
    </div>` : ""}
  </div>
  <div class="seo-hero__visual">
    <div class="seo-hero-card">
      <div class="seo-hero-card__title">VIN Check</div>
      <div class="seo-hero-card__vin">1HGBH41JXMN109186</div>
      <div class="seo-hero-card__meta-row">
        <span>Verify Now</span>
        <span class="seo-hero-card__badge">Free</span>
      </div>
    </div>
  </div>
</div>`;
    }
    case "context_legal":
    case "legal_state": {
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      return `<div class="seo-section-card" ${anchor}>
  <div class="seo-section-card__label">${escapeHtml(title)}</div>
  ${renderParagraphs(paragraphs)}
</div>`;
    }
    case "step_by_step": {
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      if (listCandidate.type) {
        const items = listCandidate.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("\n");
        return wrapSection(`<h2 ${anchor}>${escapeHtml(title)}</h2><${listCandidate.type}>${items}</${listCandidate.type}>`);
      }
      return wrapSection(`<h2 ${anchor}>${escapeHtml(title)}</h2>${renderParagraphs(paragraphs)}`);
    }
    case "mistakes":
    case "common_errors": {
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      return `<div class="seo-section-card" ${anchor}>
  <div class="seo-section-card__label">${escapeHtml(title)}</div>
  ${renderParagraphs(paragraphs)}
</div>`;
    }
    case "fees_taxes": {
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      return `<div class="seo-section-card" ${anchor}>
  <div class="seo-section-card__label">${escapeHtml(title)}</div>
  ${renderParagraphs(paragraphs)}
</div>`;
    }
    case "checklist": {
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      // Парсим нумерованный список из 10-16 пунктов
      const numberedItems = text.split(/\n+/)
        .map(line => line.trim())
        .filter(line => /^\d+[\.\)]\s+/.test(line))
        .map(line => line.replace(/^\d+[\.\)]\s+/, "").trim())
        .filter(Boolean);
      
      if (numberedItems.length > 0) {
        const items = numberedItems
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("\n");
        return wrapSection(`<h2 ${anchor}>${escapeHtml(title)}</h2><ol>${items}</ol>`);
      }
      
      // Fallback: используем detectList
      if (listCandidate.type) {
        const items = listCandidate.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("\n");
        return wrapSection(`<h2 ${anchor}>${escapeHtml(title)}</h2><${listCandidate.type === "ol" ? "ol" : "ul"}>${items}</${listCandidate.type === "ol" ? "ol" : "ul"}>`);
      }
      return wrapSection(`<h2 ${anchor}>${escapeHtml(title)}</h2>${renderParagraphs(paragraphs)}`);
    }
    case "vin_verification_mini":
    case "vin_section": {
      const blockClass = "vin-verification-mini";
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      return `<div class="${blockClass}" data-block-id="${escapedId}" ${anchor}>
  <h3>${escapeHtml(title)}</h3>
  ${renderParagraphs(paragraphs)}
</div>`;
    }
    case "comparison_table": {
      // Парсим TSV таблицу
      const lines = text.split(/\n+/).filter(line => line.trim());
      if (lines.length === 0) return wrapSection(`<h2>${escapeHtml(getBlockTitle(id, language))}</h2><p>${escapeHtml(text)}</p>`);
      
      const rows = lines.map(line => {
        const cells = line.split(/\t/).map(cell => cell.trim()).filter(Boolean);
        if (cells.length === 0) return null;
        return cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join("");
      }).filter(Boolean);
      
      if (rows.length === 0) return wrapSection(`<h2>${escapeHtml(getBlockTitle(id, language))}</h2><p>${escapeHtml(text)}</p>`);
      
      // Первая строка - заголовки
      const headerRow = rows[0];
      const dataRows = rows.slice(1);
      
      const title = getBlockTitle(id, language);
      const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
      const tableHtml = `<div class="seo-table-wrapper">
  <h2 ${anchor}>${escapeHtml(title)}</h2>
  <table class="seo-table">
    <thead>
      <tr>${headerRow}</tr>
    </thead>
    <tbody>
${dataRows.map(row => `      <tr>${row}</tr>`).join("\n")}
    </tbody>
  </table>
</div>`;
      
      return tableHtml;
    }
    case "faq": {
      // Пытаемся извлечь Q/A пары
      const faqPairs = extractFaqPairs(text);
      
      if (faqPairs && faqPairs.length > 0) {
        // Используем структурированные Q/A пары
        const entries = faqPairs.map(pair => {
          const question = escapeHtml(pair.question);
          const answer = escapeHtml(pair.answer);
          return `<div class="seo-faq__item">
  <h3 class="seo-faq__q">${question}</h3>
  <p class="seo-faq__a">${answer}</p>
</div>`;
        });
        const title = getBlockTitle(id, language);
        const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
        return `<section class="seo-faq" data-block-id="${escapedId}" ${anchor}>
  <h2>${escapeHtml(title)}</h2>
  ${entries.join("\n")}
</section>`;
      }
      
      // Fallback: парсим по параграфам
      const chunks = text.split(/\n{2,}/).filter((chunk) => chunk.trim());
      const entries = chunks.map((chunk) => {
        const trimmed = chunk.trim();
        
        // Ищем паттерны Q/A
        const qaMatch = trimmed.match(/^(?:P:|Q:|¿)\s*\*\*?([^*]+)\*\*?\s*(?:R:|A:)?\s*(.+)$/s);
        if (qaMatch) {
          const question = escapeHtml(qaMatch[1].trim());
          const answer = escapeHtml(qaMatch[2].trim());
          return `<div class="seo-faq__item">
  <h3 class="seo-faq__q">${question}</h3>
  <p class="seo-faq__a">${answer}</p>
</div>`;
        }
        
        // Ищем вопросы с "?"
        if (trimmed.includes("?") && trimmed.length < 200) {
          const parts = trimmed.split(/\?/);
          if (parts.length >= 2) {
            const question = escapeHtml(parts[0].trim() + "?");
            const answer = escapeHtml(parts.slice(1).join("?").trim());
            return `<div class="seo-faq__item">
  <h3 class="seo-faq__q">${question}</h3>
  <p class="seo-faq__a">${answer}</p>
</div>`;
          }
        }
        
        // Обычный параграф
        const parts = trimmed.split(/\n+/);
        if (parts.length >= 2) {
          const question = escapeHtml(parts[0]);
          const answer = parts.slice(1).map((p) => `<p class="seo-faq__a">${escapeHtml(p)}</p>`).join("\n");
          return `<div class="seo-faq__item">
  <h3 class="seo-faq__q">${question}</h3>
  ${answer}
</div>`;
        }
        return `<div class="seo-faq__item">
  <p class="seo-faq__a">${escapeHtml(trimmed)}</p>
</div>`;
      });
        const title = getBlockTitle(id, language);
        const anchor = blockAnchors[id] ? `id="${escapeHtml(blockAnchors[id])}"` : "";
        return `<section class="seo-faq" data-block-id="${escapedId}" ${anchor}>
  <h2>${escapeHtml(title)}</h2>
  ${entries.join("\n")}
</section>`;
    }
    default:
      return wrapSection(renderParagraphs(paragraphs.length ? paragraphs : [text]));
  }
}

function slugify(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUrlSegments(topic) {
  const segments = [];
  const language = topic.language || "en";
  segments.push(slugify(language));

  if (topic.zone) {
    segments.push(slugify(topic.zone));
  }

  const dims = topic.dimensions || {};
  ["state", "dmv_topic", "format_variant", "brand", "model"].forEach((key) => {
    if (dims[key]) segments.push(slugify(dims[key]));
  });

  if (!dims.state && topic.topic_id) {
    segments.push(slugify(topic.topic_id));
  }

  return segments.filter(Boolean);
}

function findAlternateLanguage(topic, rootDir) {
  // Ищем альтернативную языковую версию той же темы
  try {
    const topicsQueuePath = path.join(rootDir, "data", "topics_queue.json");
    if (!fs.existsSync(topicsQueuePath)) return null;

    const topicsQueue = JSON.parse(fs.readFileSync(topicsQueuePath, "utf8"));
    const currentZone = topic.zone;
    const currentState = topic.dimensions?.state;
    const currentLanguage = topic.language || "en";
    const targetLanguage = currentLanguage === "en" ? "es" : "en";

    for (const entry of topicsQueue) {
      try {
        const topicPath = path.isAbsolute(entry.topic_file)
          ? entry.topic_file
          : path.join(rootDir, entry.topic_file);
        if (!fs.existsSync(topicPath)) continue;

        const altTopic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
        const altZone = altTopic.zone;
        const altState = altTopic.dimensions?.state;
        const altLanguage = altTopic.language || "en";

        // Ищем ту же тему на другом языке
        if (altZone === currentZone && altState === currentState && altLanguage === targetLanguage) {
          const altSegments = buildUrlSegments(altTopic);
          return `/${altSegments.join("/")}/`;
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  return null;
}

function generateInternalLinks(topic, rootDir) {
  const links = [];
  try {
    const topicsQueuePath = path.join(rootDir, "data", "topics_queue.json");
    if (!fs.existsSync(topicsQueuePath)) return links;

    const topicsQueue = JSON.parse(fs.readFileSync(topicsQueuePath, "utf8"));
    const currentZone = topic.zone;
    const currentState = topic.dimensions?.state;
    const currentLanguage = topic.language || "en";
    const currentId = topic.topic_id || topic.id;

    topicsQueue.forEach(entry => {
      try {
        const topicPath = path.isAbsolute(entry.topic_file)
          ? entry.topic_file
          : path.join(rootDir, entry.topic_file);
        if (!fs.existsSync(topicPath)) return;

        const relatedTopic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
        const relatedId = relatedTopic.topic_id || relatedTopic.id;

        // Пропускаем текущую страницу
        if (relatedId === currentId) return;

        // Ищем по zone и state
        const isSameZone = relatedTopic.zone === currentZone;
        const isSameState = relatedTopic.dimensions?.state === currentState;
        const isSameLanguage = (relatedTopic.language || "en") === currentLanguage;

        if ((isSameZone || isSameState) && isSameLanguage) {
          const relatedSegments = buildUrlSegments(relatedTopic);
          const relatedTitle = relatedTopic.title || relatedId;
          links.push({
            href: `/${relatedSegments.join("/")}/`,
            text: relatedTitle
          });
        }
      } catch (e) {
        // Игнорируем ошибки парсинга отдельных топиков
      }
    });

    // Ограничиваем до 5 ссылок
    return links.slice(0, 5);
  } catch (e) {
    return links;
  }
}

function generateSchemaOrg(topic, blocks, segments, pageTitle, metaDescription) {
  const schemas = [];
  const pageUrl = `https://vintrusted.com/${segments.join("/")}/`;

  // WebPage/Article schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": pageTitle,
    "description": metaDescription,
    "url": pageUrl,
    "inLanguage": topic.language || "en",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": pageUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "VIN Trust",
      "url": "https://vintrusted.com"
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "VIN Trust",
      "url": "https://vintrusted.com"
    }
  });

  // BreadcrumbList schema
  const breadcrumbItems = segments.map((seg, idx) => ({
    "@type": "ListItem",
    "position": idx + 1,
    "name": seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    "item": `https://vintrusted.com/${segments.slice(0, idx + 1).join("/")}/`
  }));
  breadcrumbItems.unshift({
    "@type": "ListItem",
    "position": 0,
    "name": "Home",
    "item": "https://vintrusted.com/"
  });
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  });

  // FAQPage schema (если есть FAQ блок)
  if (blocks.faq) {
    const faqPairs = extractFaqPairs(blocks.faq);
    if (faqPairs && faqPairs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqPairs.map(pair => ({
          "@type": "Question",
          "name": pair.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": pair.answer
          }
        }))
      });
    }
  }

  return schemas;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.blocksFile) {
    console.error("Usage: node scripts/render_article_from_blocks.js --blocks-file tmp/topic.blocks.json");
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, "..");
  const blocksPath = path.isAbsolute(args.blocksFile)
    ? args.blocksFile
    : path.join(rootDir, args.blocksFile);

  if (!fs.existsSync(blocksPath)) {
    console.error(`[ERR] Blocks file not found: ${blocksPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(blocksPath, "utf8"));
  const topic = payload.topic || {};
  const blocks = payload.blocks || {};

  const topicId = topic.topic_id || topic.id || path.basename(blocksPath, ".blocks.json");
  const segments = buildUrlSegments(topic);
  const relativeDir = path.join("public", "semantic-pages", ...segments);
  const outDir = path.join(rootDir, relativeDir);
  const outFile = path.join(outDir, "index.html");
  
  // Вычисляем относительный путь к логотипу
  // Логотип находится в public/semantic-pages/logo-vin-trust.png
  // От текущей страницы нужно подняться на segments.length уровней до semantic-pages
  const depth = segments.length;
  const logoPath = depth > 0 ? "../".repeat(depth) + "logo-vin-trust.png" : "logo-vin-trust.png";

  fs.mkdirSync(outDir, { recursive: true });

  // Сначала создаем маппинг якорей для всех блоков
  const blockAnchors = {};
  Object.keys(blocks).forEach(blockId => {
    if (blockId !== "hero" && blocks[blockId]) {
      const title = getBlockTitle(blockId, topic.language || "en");
      if (title) {
        blockAnchors[blockId] = slugify(title) || blockId;
      }
    }
  });

  // Улучшенный meta description (120-160 символов)
  const heroText = blocks.hero ? splitParagraphs(blocks.hero)[0] || blocks.hero : topic.title || topicId;
  const fullHeroText = heroText.replace(/\s+/g, " ").trim();
  let metaDescription = fullHeroText;
  if (metaDescription.length < 120) {
    // Дополняем из других блоков
    const contextText = blocks.context_legal || blocks.legal_state || "";
    const additional = contextText.replace(/\s+/g, " ").trim().slice(0, 100);
    metaDescription = (fullHeroText + " " + additional).trim();
  }
  // Обрезаем до 155 символов (оставляем место для точки)
  metaDescription = metaDescription.slice(0, 155).trim();
  // Убираем обрезанные слова в конце и добавляем точку если нужно
  metaDescription = metaDescription.replace(/\s+\S*$/, "");
  // Убеждаемся, что заканчивается на знаке препинания
  if (metaDescription.length > 0 && !/[.!?]$/.test(metaDescription)) {
    metaDescription = metaDescription.replace(/[,;:]$/, ".") || metaDescription + ".";
  }

  // Улучшенный title (50-60 символов) с брендом
  let pageTitle = topic.title || fullHeroText;
  // Если title слишком короткий, дополняем
  if (pageTitle.length < 50) {
    const stateName = topic.state ? (topic.state === "AZ" ? "Arizona" : topic.state === "CA" ? "California" : topic.state === "TX" ? "Texas" : topic.state === "FL" ? "Florida" : topic.state === "NY" ? "New York" : topic.state) : "";
    if (stateName && !pageTitle.includes(stateName)) {
      pageTitle = `${pageTitle} in ${stateName}`;
    }
  }
  // Добавляем бренд если title < 60 символов
  const titleWithBrand = pageTitle.length < 60 ? `${pageTitle} | VIN Trust` : pageTitle;
  // Обрезаем до 60 символов максимум
  pageTitle = titleWithBrand.length > 60 ? titleWithBrand.slice(0, 57) + "..." : titleWithBrand;

  // Генерируем внутренние ссылки
  const internalLinks = generateInternalLinks(topic, rootDir);
  let internalLinksHtml = "";
  const relatedTitle = (topic.language || "en") === "es" ? "Artículos relacionados" : "Related Articles";
  if (internalLinks.length > 0) {
    internalLinksHtml = `<section class="internal-links" data-block-id="internal_links">
  <h2>${relatedTitle}</h2>
  <ul>
${internalLinks.map(link => `    <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a></li>`).join("\n")}
  </ul>
</section>`;
  }

  // Генерируем hreflang для альтернативной языковой версии
  const alternateUrl = findAlternateLanguage(topic, rootDir);
  const currentUrl = `https://vintrusted.com/${segments.join("/")}/`;
  const currentLang = topic.language || "en";
  
  // Генерируем Schema.org разметку
  const schemas = generateSchemaOrg(topic, blocks, segments, pageTitle, metaDescription);
  
  // Добавляем WebPage schema (если отсутствует)
  const hasWebPage = schemas.some(s => s["@type"] === "WebPage");
  if (!hasWebPage) {
    schemas.unshift({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": pageTitle,
      "description": metaDescription,
      "url": currentUrl,
      "inLanguage": currentLang === "en" ? "en-US" : "es-US",
      "isPartOf": {
        "@type": "WebSite",
        "name": "VIN Trust",
        "url": "https://vintrusted.com"
      },
      "about": {
        "@type": "Thing",
        "name": topic.title || pageTitle
      }
    });
  }
  
  // Добавляем Organization schema (если отсутствует)
  const hasOrganization = schemas.some(s => s["@type"] === "Organization");
  if (!hasOrganization) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "VIN Trust",
      "url": "https://vintrusted.com",
      "logo": "https://vintrusted.com/images/logo-vin-trust.png",
      "description": "Professional vehicle history reports provider",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": currentLang === "en" ? "English" : "Spanish"
      }
    });
  }
  
  // Добавляем SearchAction schema для VIN формы
  schemas.push({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VIN Trust",
    "url": "https://vintrusted.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://vintrusted.com/?vin={vin}"
      },
      "query-input": "required name=vin"
    }
  });
  
  const schemaScripts = schemas.map(schema => 
    `    <script type="application/ld+json">\n${JSON.stringify(schema, null, 6)}\n    </script>`
  ).join("\n");
  const hreflangTags = [];
  hreflangTags.push(`    <link rel="alternate" hreflang="${currentLang === "en" ? "en-US" : "es-US"}" href="${currentUrl}" />`);
  if (alternateUrl) {
    hreflangTags.push(`    <link rel="alternate" hreflang="${currentLang === "en" ? "es-US" : "en-US"}" href="https://vintrusted.com${alternateUrl}" />`);
  }
  hreflangTags.push(`    <link rel="alternate" hreflang="x-default" href="${currentUrl}" />`);

  // Генерируем Open Graph теги
  const ogImage = "https://vintrusted.com/hero-background.jpg";
  const ogTags = [
    `    <meta property="og:type" content="article" />`,
    `    <meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
    `    <meta property="og:description" content="${escapeHtml(metaDescription)}" />`,
    `    <meta property="og:url" content="${currentUrl}" />`,
    `    <meta property="og:image" content="${ogImage}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:site_name" content="VIN Trust" />`,
    `    <meta property="og:locale" content="${currentLang === "en" ? "en_US" : "es_US"}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />`,
    `    <meta name="twitter:image" content="${ogImage}" />`
  ];
  
  // Добавляем favicon и theme-color
  const faviconTags = [
    `    <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon.png" />`,
    `    <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />`,
    `    <link rel="apple-touch-icon" href="/img/favicon.png" />`,
    `    <link rel="shortcut icon" type="image/png" href="/img/favicon.png" />`,
    `    <meta name="theme-color" content="#0f0f0f" />`,
    `    <meta name="msapplication-TileColor" content="#3B82F6" />`
  ];
  
  // Добавляем preconnect для ключевых доменов
  const preconnectTags = [
    `    <link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
    `    <link rel="dns-prefetch" href="https://vintrusted.com" />`
  ];

  // Извлекаем hero блок для отдельного рендеринга
  const heroBlock = blocks.hero || "";
  const heroHtml = heroBlock ? blockToHtml("hero", heroBlock, topic, {}) : "";
  
  // Остальные блоки (без hero) с якорями
  const contentBlocks = Object.entries(blocks)
    .filter(([id]) => id !== "hero")
    .map(([id, text]) => blockToHtml(id, text || "", topic, blockAnchors))
    .join("\n\n");
  
  // Генерируем breadcrumbs
  const breadcrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/") + "/";
    return `<a href="${escapeHtml(href)}">${escapeHtml(seg)}</a>`;
  }).join(`<span class="seo-breadcrumbs__sep">/</span>`);
  
  // Генерируем TOC из заголовков с правильными якорями (используем уже созданный blockAnchors)
  const tocItems = [];
  Object.keys(blocks).forEach(blockId => {
    if (blockId !== "hero" && blocks[blockId]) {
      const title = getBlockTitle(blockId, topic.language || "en");
      if (title && blockAnchors[blockId]) {
        const anchor = blockAnchors[blockId];
        tocItems.push(`<li><a href="#${escapeHtml(anchor)}">${escapeHtml(title)}</a></li>`);
      }
    }
  });
  
  const tocTitle = (topic.language || "en") === "es" ? "Contenido" : "Contents";
  const tocHtml = tocItems.length > 0 ? `
    <div class="seo-sidebar__card">
      <div class="seo-sidebar__title">${tocTitle}</div>
      <ul class="seo-toc">
${tocItems.join("\n")}
      </ul>
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(topic.language || "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}" />
    <link rel="canonical" href="https://vintrusted.com/${segments.join("/")}/" />
${preconnectTags.join("\n")}
${faviconTags.join("\n")}
${hreflangTags.join("\n")}
${ogTags.join("\n")}
${schemaScripts}
    <style>
:root {
  /* Цвета */
  --bg-page: #05070b;
  --bg-elevated: #0c1018;
  --bg-elevated-soft: #101623;
  --bg-chip: rgba(255, 255, 255, 0.04);

  --accent: #4f8cff;
  --accent-soft: rgba(79, 140, 255, 0.12);
  --accent-gradient: linear-gradient(135deg, #4f8cff, #8f6bff);

  --text-main: #f5f7ff;
  --text-muted: #a7b0c5;
  --text-soft: #7a859b;
  --border-subtle: rgba(255, 255, 255, 0.06);

  /* Типографика */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
               "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  --fs-xs: 12px;
  --fs-sm: 13px;
  --fs-base: 16px;
  --fs-md: 17px;
  --fs-lg: 20px;
  --fs-xl: 28px;
  --fs-xxl: 34px;

  --lh-tight: 1.3;
  --lh-normal: 1.6;
  --lh-relaxed: 1.8;

  --ls-tight: 0.01em;
  --ls-normal: 0.02em;

  /* Ширина контента */
  --content-max-width: 880px;
  --page-padding-x: 20px;
  --page-padding-y: 32px;

  /* Радиусы и тени */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-soft: 0 18px 45px rgba(0, 0, 0, 0.45);

  /* Прочее */
  --transition-fast: 0.15s ease-out;
}

/* Базовая сброска */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  letter-spacing: var(--ls-normal);
  color: var(--text-main);
  background: radial-gradient(circle at top, #101525 0, #05070b 52%, #020308 100%);
  -webkit-font-smoothing: antialiased;
}

/* Контейнер страницы */
.seo-page {
  min-height: 100vh;
  padding: var(--page-padding-y) var(--page-padding-x);
  display: flex;
  flex-direction: column;
}

.seo-page__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Верхняя панель: логотип + кнопка домой */
.seo-page__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.seo-page__nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.seo-page__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  transition: opacity var(--transition-fast);
}

.seo-page__brand:hover {
  opacity: 0.9;
}

.seo-page__logo-img {
  height: 50px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
  display: block;
}

.seo-page__logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--accent-gradient);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12),
              0 18px 40px rgba(79, 140, 255, 0.55);
  position: relative;
  overflow: hidden;
  display: none; /* Fallback, если логотип не загрузится */
}

.seo-page__logo-mark::before {
  content: "";
  position: absolute;
  inset: 14%;
  border-radius: 999px;
  background: radial-gradient(circle at 20% 0, rgba(255, 255, 255, 0.45), transparent 60%);
  opacity: 0.4;
}

.seo-page__brand-text {
  display: flex;
  flex-direction: column;
}

.seo-page__brand-title {
  font-size: var(--fs-sm);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-muted);
}

.seo-page__brand-sub {
  font-size: var(--fs-xs);
  color: var(--text-soft);
}

/* Кнопки */
.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--fs-sm);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-primary {
  background: var(--accent-gradient);
  color: #05070b;
  box-shadow: var(--shadow-soft);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.65);
}

.btn-ghost {
  border-color: var(--border-subtle);
  color: var(--text-muted);
  background: rgba(5, 7, 11, 0.6);
}

.btn-ghost:hover {
  border-color: var(--accent-soft);
  background: rgba(16, 22, 35, 0.9);
}

/* Hero + графика */
.seo-hero {
  position: relative;
  margin-bottom: 26px;
  border-radius: var(--radius-lg);
  padding: 22px 20px 20px;
  background: radial-gradient(circle at 0 -30%, rgba(79, 140, 255, 0.4), transparent 60%),
              radial-gradient(circle at 100% 130%, rgba(143, 107, 255, 0.35), transparent 60%),
              var(--bg-elevated);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.seo-hero::before {
  content: "";
  position: absolute;
  inset: -80px;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 34px 34px;
  opacity: 0.5;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.seo-hero__content {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.seo-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: var(--bg-chip);
  color: var(--text-soft);
  margin-bottom: 10px;
}

.seo-hero__eyebrow-pill {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent-gradient);
}

.seo-hero__title {
  font-size: var(--fs-xxl);
  line-height: 1.18;
  letter-spacing: 0.03em;
  margin: 0 0 10px;
  color: var(--text-main);
}

.seo-hero__subtitle {
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  color: var(--text-muted);
  max-width: 540px;
  margin-bottom: 16px;
}

.seo-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.seo-hero__chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  background: var(--bg-chip);
  color: var(--text-soft);
}

/* Графический блок справа */
.seo-hero__visual {
  position: absolute;
  inset: 10px 14px 10px auto;
  right: 18px;
  width: 260px;
  max-width: 36%;
  pointer-events: none;
  display: none;
}

@media (min-width: 960px) {
  .seo-hero__visual {
    display: block;
  }
}

.seo-hero-card {
  position: relative;
  border-radius: var(--radius-md);
  background: rgba(5, 7, 11, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(14px);
}

.seo-hero-card__title {
  font-size: var(--fs-sm);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.seo-hero-card__vin {
  font-family: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--text-main);
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seo-hero-card__meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--fs-xs);
  color: var(--text-soft);
}

.seo-hero-card__badge {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: #e7ecff;
}

/* Хлебные крошки */
.seo-breadcrumbs {
  margin: 10px 0 16px;
  font-size: var(--fs-xs);
  color: var(--text-soft);
}

.seo-breadcrumbs a {
  color: var(--text-soft);
  text-decoration: none;
}

.seo-breadcrumbs a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.seo-breadcrumbs__sep {
  margin: 0 4px;
  opacity: 0.5;
}

/* Основная сетка: контент + сайдбар */
.seo-layout {
  display: grid;
  grid-template-columns: minmax(0, 3.1fr) minmax(0, 1.3fr);
  gap: 28px;
  align-items: flex-start;
}

@media (max-width: 960px) {
  .seo-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Контент */
.seo-article {
  max-width: var(--content-max-width);
}

.seo-article h1 {
  font-size: var(--fs-xl);
  margin: 24px 0 10px;
  color: var(--text-main);
}

.seo-article h2 {
  font-size: var(--fs-lg);
  margin: 26px 0 10px;
  letter-spacing: 0.02em;
  color: var(--text-main);
}

.seo-article h3 {
  font-size: var(--fs-md);
  margin: 20px 0 8px;
  letter-spacing: 0.02em;
  color: var(--text-main);
}

.seo-article p {
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  letter-spacing: var(--ls-normal);
  color: var(--text-main);
  margin: 0 0 12px;
}

.seo-article ul,
.seo-article ol {
  margin: 6px 0 16px 20px;
  padding: 0;
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  color: var(--text-main);
}

.seo-article li + li {
  margin-top: 4px;
}

.seo-article strong {
  font-weight: 600;
}

/* Блок "ошибки", "fees" и т.п. как карточки */
.seo-section-card {
  margin: 20px 0;
  padding: 16px 16px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated-soft);
}

.seo-section-card__label {
  font-size: var(--fs-xs);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 8px;
}

/* FAQ */
.seo-faq {
  margin: 26px 0 10px;
}

.seo-faq__item {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated-soft);
  padding: 12px 14px 10px;
  margin-bottom: 10px;
}

.seo-faq__q {
  font-size: var(--fs-md);
  margin: 0 0 6px;
  color: var(--text-main);
}

.seo-faq__a {
  font-size: var(--fs-sm);
  line-height: var(--lh-relaxed);
  color: var(--text-muted);
}

/* Таблицы */
.seo-table-wrapper {
  margin: 18px 0 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated-soft);
  overflow: hidden;
}

.seo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
  letter-spacing: 0.03em;
}

.seo-table thead {
  background: rgba(255, 255, 255, 0.02);
}

.seo-table th,
.seo-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-main);
}

.seo-table th {
  text-align: left;
  font-weight: 500;
  color: var(--text-muted);
}

/* Сайдбар: навигация, related, CTA */
.seo-sidebar {
  position: sticky;
  top: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 960px) {
  .seo-sidebar {
    position: static;
  }
}

.seo-sidebar__card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  padding: 14px 14px 12px;
}

.seo-sidebar__title {
  font-size: var(--fs-sm);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 8px;
}

.seo-toc {
  list-style: none;
  padding: 0;
  margin: 0;
}

.seo-toc li + li {
  margin-top: 4px;
}

.seo-toc a {
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--text-muted);
  text-decoration: none;
}

.seo-toc a:hover {
  color: var(--accent);
}

.seo-related {
  list-style: none;
  padding: 0;
  margin: 0;
}

.seo-related li + li {
  margin-top: 4px;
}

.seo-related a {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-decoration: none;
}

.seo-related a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.seo-sidebar__cta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* Footer */
.seo-footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--text-soft);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.seo-footer a {
  color: var(--text-soft);
  text-decoration: none;
}

.seo-footer a:hover {
  color: var(--accent);
  text-decoration: underline;
}

/* Внутренние ссылки */
.internal-links {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-subtle);
}

.internal-links ul {
  list-style: none;
  padding-left: 0;
}

.internal-links li {
  margin-bottom: 0.5rem;
}

.internal-links a {
  color: var(--accent);
  text-decoration: none;
}

.internal-links a:hover {
  text-decoration: underline;
}

/* VIN verification mini */
.vin-verification-mini {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--bg-elevated-soft);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-md);
}

.vin-verification-mini h3 {
  margin-top: 0;
  color: var(--accent);
}

/* Comparison table (legacy класс) */
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}

.comparison-table th,
.comparison-table td {
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  text-align: left;
  color: var(--text-main);
}

.comparison-table th {
  background: rgba(255, 255, 255, 0.02);
  font-weight: 600;
  color: var(--text-muted);
}

.comparison-table tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

@media (max-width: 768px) {
  .seo-page {
    padding: 1rem;
  }
  .comparison-table,
  .seo-table {
    font-size: 0.875rem;
  }
  .comparison-table th,
  .comparison-table td,
  .seo-table th,
  .seo-table td {
    padding: 0.5rem;
  }
}
    </style>
  </head>
  <body data-topic-id="${escapeHtml(topicId)}">
    <div class="seo-page">
      <div class="seo-page__inner">
        <div class="seo-page__topbar">
          <a href="/" class="seo-page__brand">
            <img src="${escapeHtml(logoPath)}" alt="VIN Trust" class="seo-page__logo-img">
            <div class="seo-page__brand-text">
              <div class="seo-page__brand-title">VIN Trust</div>
              <div class="seo-page__brand-sub">Vehicle History Reports</div>
            </div>
          </a>
          <nav class="seo-page__nav">
            <a href="/" class="btn-ghost">Home</a>
            <a href="/" class="btn-ghost">VIN Check</a>
            ${currentLang === "en" ? '<a href="/en/dmv-titles/" class="btn-ghost">DMV Guides</a>' : '<a href="/es/dmv-titles/" class="btn-ghost">Guías DMV</a>'}
          </nav>
        </div>
        
        ${breadcrumbs ? `<div class="seo-breadcrumbs">${breadcrumbs}</div>` : ""}
        
        ${heroHtml}
        
        <div class="seo-layout">
          <div class="seo-article">
${contentBlocks}
${internalLinksHtml}
          </div>
          
          <aside class="seo-sidebar">
${tocHtml}
            ${internalLinks.length > 0 ? `<div class="seo-sidebar__card">
              <div class="seo-sidebar__title">${relatedTitle}</div>
              <ul class="seo-related">
${internalLinks.map(link => `                <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a></li>`).join("\n")}
              </ul>
            </div>` : ""}
            
            <div class="seo-sidebar__card">
              <div class="seo-sidebar__title">Verify VIN</div>
              <div class="seo-sidebar__cta">
                <p>Get a complete vehicle history report with accident records, mileage, liens, and more.</p>
                <a href="/" class="btn-primary">Check VIN Now</a>
              </div>
            </div>
          </aside>
        </div>
        
        <footer class="seo-footer">
          <div>
            <a href="/">VIN Trust</a> &copy; ${new Date().getFullYear()}
          </div>
          <div>
            <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a>
          </div>
        </footer>
      </div>
    </div>
  </body>
</html>`;

  fs.writeFileSync(outFile, html);
  console.log(`[RENDER] HTML saved → ${outFile}`);
  console.log(`[RENDER] URL: /${segments.join("/")}/`);
}

if (require.main === module) {
  main();
}

