const BASE_SECTIONS_ES = ["summary","table","details","faq","trust","links"];
const LAYOUTS_ES = [
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
const MICRO_VARIANTS_ES = [
  "vin-reporte",
  "historial-vehiculo",
  "checar-vin",
  "subasta-riesgos",
  "titulo-salvage",
  "dmv-procesos",
  "fraude-odometro",
  "lavado-titulo",
  "costo-mantenimiento",
  "guia-compra-usado"
];
function getEsTemplateVariants() {
  const variants = [];
  let idCounter = 1;
  for (const layout of LAYOUTS_ES) {
    for (const micro of MICRO_VARIANTS_ES) {
      variants.push({
        id: `es_t${idCounter}`,
        lang: "es",
        layout,
        micro,
        minWords: 650,
        maxWords: 1300
      });
      idCounter++;
    }
  }
  return variants;
}
module.exports = {
  BASE_SECTIONS_ES,
  LAYOUTS_ES,
  MICRO_VARIANTS_ES,
  getEsTemplateVariants
};
