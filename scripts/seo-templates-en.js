const BASE_SECTIONS = ["summary","table","details","faq","trust","links"];
const LAYOUTS = [
  ["summary","table","details","faq","trust","links"],
  ["summary","details","table","faq","trust","links"],
  ["summary","table","faq","details","trust","links"],
  ["summary","trust","table","details","faq","links"],
  ["summary","table","details","trust","faq","links"],
  ["summary","details","trust","table","faq","links"],
  ["summary","table","details","faq","links","trust"],
  ["summary","faq","table","details","trust","links"],
  ["summary","table","trust","details","faq","links"],
  ["summary","details","table","links","faq","trust"],
  ["summary","trust","details","table","faq","links"],
  ["summary","table","faq","trust","details","links"]
];
const MICRO_VARIANTS = [
  "data-first",
  "explain-first",
  "risk-focused",
  "value-focused",
  "dmv-focused",
  "auction-focused",
  "scam-warning",
  "maintenance-cost",
  "insurance-cost",
  "ownership-guide"
];
function getEnTemplateVariants() {
  const variants = [];
  let idCounter = 1;
  for (const layout of LAYOUTS) {
    for (const micro of MICRO_VARIANTS) {
      variants.push({
        id: `en_t${idCounter}`,
        lang: "en",
        layout,
        micro,
        minWords: 600,
        maxWords: 1200
      });
      idCounter++;
    }
  }
  return variants;
}
module.exports = { BASE_SECTIONS, LAYOUTS, MICRO_VARIANTS, getEnTemplateVariants };
