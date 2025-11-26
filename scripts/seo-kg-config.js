// Knowledge Graph config: 50 штатов, типы кластеров, пагинация, лексика EN/ES.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

// 50 штатов США
const STATES_FULL = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];

// Читаем полный список марок/моделей из data/makes-models.json.
// Если файл расширят до "всех марок/моделей", движок автоматически подхватит.
function loadMakesModels() {
  const file = path.join(DATA_DIR, "makes-models.json");
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    const json = JSON.parse(raw);
    return json;
  } catch (e) {
    console.error("[SEO-KG] Ошибка чтения makes-models.json:", e.message);
    return {};
  }
}

// Типы тематических кластеров (DMV, fraud, auctions, maintenance, buying)
const CLUSTERS = [
  {
    id: "dmv-title-brands",
    intent: "dmv",
    importance: "core",
    en: {
      label: "DMV title brands and salvage rules",
      slugSegment: "dmv-title-brands",
      summaryPattern:
        "Detailed guide to title brands, salvage and rebuilt rules for used cars in {stateName}."
    },
    es: {
      label: "Marcas de título DMV y reglas de salvage",
      slugSegment: "marcas-titulo-dmv",
      summaryPattern:
        "Guía clara sobre marcas de título, salvage y autos reconstruidos en {stateName} para compradores en EE.UU."
    }
  },
  {
    id: "fraud-odometer",
    intent: "fraud",
    importance: "core",
    en: {
      label: "Odometer rollback and title fraud",
      slugSegment: "odometer-fraud",
      summaryPattern:
        "How to detect odometer rollback, title washing and hidden damage when buying a used car in {stateName}."
    },
    es: {
      label: "Fraude de odómetro y lavado de títulos",
      slugSegment: "fraude-odometro",
      summaryPattern:
        "Cómo detectar rollback de odómetro, lavado de título y daños ocultos al comprar un usado en {stateName}."
    }
  },
  {
    id: "auctions-copart-iaai",
    intent: "auctions",
    importance: "core",
    en: {
      label: "Copart & IAAI salvage auctions",
      slugSegment: "subastas-salvage",
      summaryPattern:
        "Overview of Copart and IAAI salvage auctions in {stateName}: fees, risks, and how to use a VIN report."
    },
    es: {
      label: "Subastas salvage Copart e IAAI",
      slugSegment: "subastas-salvage",
      summaryPattern:
        "Resumen de subastas salvage Copart e IAAI en {stateName}: tarifas, riesgos y uso del reporte VIN."
    }
  },
  {
    id: "maintenance-costs",
    intent: "maintenance",
    importance: "support",
    en: {
      label: "Ownership and maintenance costs",
      slugSegment: "maintenance-costs",
      summaryPattern:
        "Average ownership, insurance and maintenance costs for popular used {make} models in {stateName}."
    },
    es: {
      label: "Costos de mantenimiento y uso",
      slugSegment: "costos-mantenimiento",
      summaryPattern:
        "Costos promedio de seguro, mantenimiento y uso para modelos usados de {make} en {stateName}."
    }
  },
  {
    id: "buying-guides",
    intent: "buying-guides",
    importance: "support",
    en: {
      label: "Best used cars and risk profiles",
      slugSegment: "best-used-cars",
      summaryPattern:
        "Buying guide for used {make} in {stateName}: risk profile, common issues and how a VIN report helps."
    },
    es: {
      label: "Guía para comprar usados",
      slugSegment: "guia-autos-usados",
      summaryPattern:
        "Guía para comprar autos usados {make} en {stateName}: riesgos, fallas comunes y uso del reporte VIN."
    }
  }
];

// Параметры пагинации и нагрузки
const LISTING_PAGE_SIZE = 20; // чтобы DOM не раздувался
const MAX_LISTING_PAGES_PER_NODE = 15; // до 300 записей на кластер/страницу
const LANGS = ["en", "es"];

module.exports = {
  STATES_FULL,
  loadMakesModels,
  CLUSTERS,
  LISTING_PAGE_SIZE,
  MAX_LISTING_PAGES_PER_NODE,
  LANGS
};

