// GOD MODE: расширенный контент-движок для EN+ES
// - Все 50 штатов (из data/states.json)
// - Марки и модели (data/makes-models.json) - новый формат: массив объектов
// - Годы 1990–2025
// - EN / ES seeds
// - Структуры для VIN-level, DMV, fraud, auctions и др.

const path = require("path");
const fs = require("fs");

const STATES_PATH = path.join(__dirname, "..", "data", "states.json");
const MAKES_MODELS_PATH = path.join(__dirname, "..", "data", "makes-models.json");

// Загружаем 50 штатов
const STATES = JSON.parse(fs.readFileSync(STATES_PATH, "utf8"));

// Загружаем марки и модели (новый формат: массив объектов)
const MAKES_DATA = JSON.parse(fs.readFileSync(MAKES_MODELS_PATH, "utf8"));

// Преобразуем массив объектов в объект для обратной совместимости
const MAKES_MODELS = {};
for (const item of MAKES_DATA) {
  if (item && item.make && Array.isArray(item.models)) {
    MAKES_MODELS[item.make] = item.models;
  }
}

const MAKES = Object.keys(MAKES_MODELS);

// Годы
const YEARS = [];
for (let y = 1990; y <= 2025; y++) YEARS.push(y);

// Языки
const LANGS = ["en", "es"];

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ===== БАЗОВЫЙ VIN-CHECK PAGE DATA (EN / ES) =====

function buildVinCheckPageDataByStateMakeYear(state, make, year, lang = "en") {
  const stateName = state.name;
  const stateCode = state.code.toLowerCase();
  const makeSlug = slugify(make);

  const langPrefix = lang === "es" ? "/es" : "";
  const slugPath = `${langPrefix}/vin-check/${stateCode}/${makeSlug}/${year}`;

  const langIsEs = lang === "es";

  const title = langIsEs
    ? `Checar VIN de ${make} ${year} en ${stateName} – historial completo del vehículo`
    : `VIN check ${make} ${year} in ${stateName} – full vehicle history report`;

  const metaDescription = langIsEs
    ? `Revisa el número VIN de un ${make} ${year} registrado en ${stateName}. Obtén historial de títulos, choques, millas, valor de mercado y recalls en EE.UU.`
    : `Run a VIN check for a ${year} ${make} registered in ${stateName}. Get title records, accidents, mileage, market value and recalls in the U.S.`;

  const h1 = langIsEs
    ? `Checar VIN de ${make} ${year} en ${stateName}`
    : `${make} ${year} VIN check in ${stateName}`;

  const summary = langIsEs
    ? `Revisa el VIN de un ${make} ${year} en ${stateName} antes de comprar: historial, choques, millas y valor real del mercado en un solo reporte.`
    : `Check the VIN of a ${year} ${make} in ${stateName} before you buy: history, accidents, mileage and real market value in one report.`;

  const introHtml = langIsEs
    ? `
      <p>
        Con Vintrusted puedes checar el VIN de un ${make} ${year} registrado en ${stateName}.
        El reporte junta datos de DMV, subastas, aseguradoras y listados del mercado en EE.UU.
      </p>
    `
    : `
      <p>
        Vintrusted lets you run a VIN check on a ${year} ${make} registered in ${stateName}.
        The report combines DMV records, auction data, insurance total-loss info and U.S. market listings.
      </p>
    `;

  const tableRows = [
    {
      label: langIsEs ? "Estado" : "State",
      value: stateName
    },
    {
      label: langIsEs ? "Marca" : "Make",
      value: make
    },
    {
      label: langIsEs ? "Año del modelo" : "Model year",
      value: String(year)
    },
    {
      label: langIsEs ? "Tipo de chequeo" : "Check type",
      value: langIsEs ? "Reporte completo de VIN (historial + valor)" : "Full VIN history + value report"
    },
    {
      label: langIsEs ? "Cobertura de datos" : "Data coverage",
      value: langIsEs
        ? "Títulos, choques, millas, subastas, valor de mercado y recalls"
        : "Titles, accidents, mileage, auctions, market value and recalls"
    }
  ];

  const sections = [];

  if (langIsEs) {
    sections.push(
      {
        id: "why-vin-check",
        heading: `Por qué checar el VIN de un ${make} ${year} en ${stateName}`,
        html: `
          <p>
            Muchos vehículos en ${stateName} pasan por subastas, pérdidas totales de seguro,
            títulos salvage / rebuilt y cambios de estado. Un simple reporte de VIN te enseña
            qué pasó con ese ${make} ${year} antes de que pongas tu dinero.
          </p>
          <ul>
            <li>Detectar títulos salvage, rebuilt, junk</li>
            <li>Ver choques y daños reportados</li>
            <li>Revisar millas y posibles retrocesos de odómetro</li>
            <li>Ver valor real en el mercado de EE.UU.</li>
          </ul>
        `
      },
      {
        id: "what-you-get",
        heading: "Qué incluye el reporte de Vintrusted",
        html: `
          <p>
            El reporte junta información de registros de títulos, aseguradoras, subastas y listados
            para armar la historia real de un VIN en Estados Unidos.
          </p>
          <ul>
            <li>Estatus de título (clean, salvage, rebuilt, junk)</li>
            <li>Choques, daños y pérdida total</li>
            <li>Lecturas de odómetro en el tiempo</li>
            <li>Recalls abiertos y problemas de seguridad</li>
            <li>Valor de mercado con base en listados reales</li>
          </ul>
        `
      }
    );
  } else {
    sections.push(
      {
        id: "why-vin-check",
        heading: `Why run a VIN check for ${make} ${year} in ${stateName}`,
        html: `
          <p>
            Many vehicles in ${stateName} go through auctions, insurance total-loss,
            salvage / rebuilt branding and title washing. A VIN check shows what really
            happened to this specific ${make} ${year} before you pay for it.
          </p>
          <ul>
            <li>Detect salvage, rebuilt, junk titles</li>
            <li>See recorded accidents and structural damage</li>
            <li>Track mileage and possible odometer rollbacks</li>
            <li>Estimate fair market value based on U.S. listings</li>
          </ul>
        `
      },
      {
        id: "what-you-get",
        heading: "What you get in a Vintrusted report",
        html: `
          <p>
            The report aggregates data from title agencies, insurance records, auctions and market listings
            to build a verified history for the VIN.
          </p>
          <ul>
            <li>Title status and branding</li>
            <li>Accident and damage records</li>
            <li>Odometer readings timeline</li>
            <li>Open recalls and safety issues</li>
            <li>Market value based on comparable vehicles</li>
          </ul>
        `
      }
    );
  }

  const faq = langIsEs
    ? [
        {
          question: "¿Este reporte de VIN es oficial?",
          answer:
            "Vintrusted usa fuentes oficiales y comerciales, pero el reporte no es un documento de gobierno. Es una herramienta para tomar mejores decisiones al comprar."
        },
        {
          question: "¿Cuánto tarda en generarse el reporte?",
          answer:
            "Normalmente el reporte se genera en segundos después del pago exitoso y se muestra en línea."
        },
        {
          question: `¿Sirve el reporte si el ${make} ${year} tuvo registros en otros estados?`,
          answer:
            "Sí. Si el vehículo tiene historial en otros estados, esos eventos también se mostrarán en el reporte."
        }
      ]
    : [
        {
          question: "Is this VIN report official?",
          answer:
            "Vintrusted uses official and commercial data sources, but the report itself is not a government document. It is designed to help you make a safer purchase."
        },
        {
          question: "How fast do I get the report?",
          answer:
            "In most cases, the report is generated within seconds after a successful payment and is available online."
        },
        {
          question: `Does the report show history from other states for this ${year} ${make}?`,
          answer:
            "Yes. If the vehicle has records from other states, those will be included as well."
        }
      ];

  const nowIso = new Date().toISOString();

  return {
    lang,
    slugPath,
    title,
    metaDescription,
    h1,
    summary,
    introHtml,
    tableRows,
    sections,
    faq,
    updatedAt: nowIso,
    entity: {
      type: "vin-check",
      stateCode: state.code,
      stateName,
      make,
      year
    }
  };
}

// ==== SEEDS ====

// старый интерфейс, для совместимости
function getAllStateMakeYearSeeds() {
  const seeds = [];
  for (const state of STATES) {
    for (const make of MAKES) {
      for (const year of YEARS) {
        seeds.push({ state, make, year });
      }
    }
  }
  return seeds;
}

// новый интерфейс: +язык, +модель
function getAllStateMakeYearSeedsWithLangs() {
  const seeds = [];
  for (const state of STATES) {
    for (const make of MAKES) {
      for (const year of YEARS) {
        for (const lang of LANGS) {
          seeds.push({ state, make, year, lang });
        }
      }
    }
  }
  return seeds;
}

function getAllStateMakeModelYearSeedsWithLangs() {
  const seeds = [];
  for (const state of STATES) {
    for (const make of MAKES) {
      const models = MAKES_MODELS[make] || [];
      for (const model of models) {
        for (const year of YEARS) {
          for (const lang of LANGS) {
            seeds.push({ state, make, model, year, lang });
          }
        }
      }
    }
  }
  return seeds;
}

// Совместимость со старым API
function buildLocalizedText(lang, base) {
  if (lang === "es") {
    return {
      summary: `Checa el VIN de este vehículo ${base.year} ${base.make} en ${base.stateNameEs || base.stateName} antes de pagar. El reporte muestra historial del título, accidentes, odómetro y valor en el mercado de EE.UU.`,
      updatedLabel: "Actualizado",
      tableTitle: "Datos del VIN y del vehículo",
      detailsTitle: "Detalles del historial del vehículo",
      faqTitle: "Preguntas frecuentes sobre este vehículo",
      trustTitle: "Por qué confiar en el reporte de Vintrusted",
      linksTitle: "Otras guías útiles"
    };
  }
  return {
    summary: `Check the VIN for this ${base.year} ${base.make} in ${base.stateName} before you pay. The report shows title history, accidents, odometer records and market value in the U.S.`,
    updatedLabel: "Updated",
    tableTitle: "VIN and vehicle data",
    detailsTitle: "Vehicle history details",
    faqTitle: "Frequently asked questions about this vehicle",
    trustTitle: "Why trust this Vintrusted report",
    linksTitle: "More useful guides"
  };
}

// Экспорт для buildVinPageData (совместимость)
function buildVinPageData(seed, intent, templateLayout) {
  const { state, make, year, lang } = seed;
  const pageData = buildVinCheckPageDataByStateMakeYear(state, make, year, lang);
  return {
    ...pageData,
    intent: intent || "vin-check",
    templateLayout: templateLayout || "default"
  };
}

module.exports = {
  STATES,
  MAKES,
  YEARS,
  LANGS,
  MAKES_MODELS,
  slugify,
  buildVinCheckPageDataByStateMakeYear,
  getAllStateMakeYearSeeds,
  getAllStateMakeYearSeedsWithLangs,
  getAllStateMakeModelYearSeedsWithLangs,
  buildLocalizedText,
  buildVinPageData
};
