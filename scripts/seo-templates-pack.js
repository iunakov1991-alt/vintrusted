// Набор «глубоких» шаблонов EN / ES.
// Здесь описываются варианты структуры страниц — какие блоки, в каком порядке.
// Генератор может рандомизировать выбор варианта для структурной энтропии.

const EN_TEMPLATES = [
  {
    id: "en_basic_1",
    blocks: ["summary", "table", "section_why", "section_what", "faq", "links"]
  },
  {
    id: "en_basic_2",
    blocks: ["summary", "section_why", "table", "section_what", "faq", "links"]
  },
  {
    id: "en_data_first",
    blocks: ["summary", "table", "section_what", "section_why", "faq", "links"]
  },
  {
    id: "en_faq_up",
    blocks: ["summary", "faq", "table", "section_why", "section_what", "links"]
  }
];

const ES_TEMPLATES = [
  {
    id: "es_basic_1",
    blocks: ["summary", "table", "section_why", "section_what", "faq", "links"]
  },
  {
    id: "es_faq_up",
    blocks: ["summary", "faq", "table", "section_why", "section_what", "links"]
  },
  {
    id: "es_why_first",
    blocks: ["summary", "section_why", "table", "section_what", "faq", "links"]
  },
  {
    id: "es_data_first",
    blocks: ["summary", "table", "section_what", "section_why", "faq", "links"]
  }
];

function pickTemplate(lang, seedIndex) {
  const pack = lang === "es" ? ES_TEMPLATES : EN_TEMPLATES;
  if (!pack.length) return null;
  const idx = seedIndex % pack.length;
  return pack[idx];
}

module.exports = {
  EN_TEMPLATES,
  ES_TEMPLATES,
  pickTemplate
};


