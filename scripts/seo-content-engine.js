const fs = require("fs");
const path = require("path");
const statesPath = path.join(__dirname, "..", "data", "states.json");
const makesModelsPath = path.join(__dirname, "..", "data", "makes-models.json");

const STATES = JSON.parse(fs.readFileSync(statesPath, "utf8"));
const MAKES_MODELS = JSON.parse(fs.readFileSync(makesModelsPath, "utf8"));

const YEARS = [];
for (let y = 1990; y <= 2025; y++) YEARS.push(y);

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildLocalizedText(lang, base) {
  if (lang === "es") {
    return {
      summary: `Checa el VIN de este vehículo ${base.year} ${base.make} en ${base.stateNameEs} antes de pagar. El reporte muestra historial del título, accidentes, odómetro y valor en el mercado de EE.UU.`,
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

function getAllStateMakeYearSeedsWithLangs() {
  const seeds = [];
  const langs = ["en", "es"];
  for (const state of STATES) {
    for (const make of Object.keys(MAKES_MODELS)) {
      const models = MAKES_MODELS[make];
      for (const model of models) {
        for (const year of YEARS) {
          for (const lang of langs) {
            seeds.push({ state, make, model, year, lang });
          }
        }
      }
    }
  }
  return seeds;
}

const INTENTS = ["vin-check", "vehicle-history", "accident-check", "market-value"];

function buildVinPageData(seed, intent, templateLayout) {
  const { state, make, model, year, lang } = seed;
  const stateName = state.name;
  const stateNameEs = state.name_es;
  const stateCodeLower = state.code.toLowerCase();
  const makeSlug = slugify(make);
  const modelSlug = slugify(model);
  const yearStr = String(year);

  const base = { stateName, stateNameEs, year, make, model };

  let h1, title, metaDescription, mainFact, urlPath;
  if (lang === "es") {
    if (intent === "vin-check") {
      h1 = `Checar VIN ${yearStr} ${make} ${model} en ${stateNameEs}`;
      title = `Checar VIN ${make} ${model} ${yearStr} en ${stateNameEs} | Reporte completo`;
      metaDescription = `Checa el VIN de un ${yearStr} ${make} ${model} registrado en ${stateNameEs}. Recibe historial del título, accidentes, odómetro, valor de mercado y alertas de subasta en EE.UU.`;
      urlPath = `/es/vin/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Checa el VIN de un ${yearStr} ${make} ${model} en ${stateNameEs} y evita pagar por un carro con título salvage, odómetro alterado o historial oculto.`;
    } else if (intent === "vehicle-history") {
      h1 = `Historial del vehículo ${yearStr} ${make} ${model} en ${stateNameEs}`;
      title = `Historial del vehículo ${make} ${model} ${yearStr} en ${stateNameEs} | Informe Vintrusted`;
      metaDescription = `Obtén el historial del vehículo para un ${yearStr} ${make} ${model} en ${stateNameEs} con información de título, reclamaciones de seguro, subastas y uso previo.`;
      urlPath = `/es/informe/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Consulta el historial completo de un ${yearStr} ${make} ${model} en ${stateNameEs} antes de firmar el contrato o enviar dinero.`;
    } else if (intent === "accident-check") {
      h1 = `Ver accidentes de ${yearStr} ${make} ${model} en ${stateNameEs}`;
      title = `Reporte de accidentes ${make} ${model} ${yearStr} en ${stateNameEs} | Vintrusted`;
      metaDescription = `Revisa si un ${yearStr} ${make} ${model} en ${stateNameEs} tuvo accidentes reportados, daños estructurales o pérdida total.`;
      urlPath = `/es/consulta/accidentes/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Ve si un ${yearStr} ${make} ${model} en ${stateNameEs} tuvo accidentes fuertes, pérdida total o daños en subastas antes de comprar.`;
    } else {
      h1 = `Valor de mercado ${yearStr} ${make} ${model} en ${stateNameEs}`;
      title = `Valor de mercado ${make} ${model} ${yearStr} en ${stateNameEs} | Precio justo`;
      metaDescription = `Compara el valor de mercado de un ${yearStr} ${make} ${model} en ${stateNameEs} usando datos de subastas y listados recientes en EE.UU.`;
      urlPath = `/es/valor/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Revisa cuánto vale realmente un ${yearStr} ${make} ${model} en ${stateNameEs} según el mercado de EE.UU., no solo el precio del anuncio.`;
    }
  } else {
    if (intent === "vin-check") {
      h1 = `${yearStr} ${make} ${model} VIN check in ${stateName}`;
      title = `${yearStr} ${make} ${model} VIN check in ${stateName} | Full vehicle history`;
      metaDescription = `Run a VIN check for a ${yearStr} ${make} ${model} registered in ${stateName}. See title brands, accidents, mileage records, auctions and market value before you buy.`;
      urlPath = `/vin/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Check the VIN of a ${yearStr} ${make} ${model} in ${stateName} to avoid salvage, rolled-back odometer and hidden auction history.`;
    } else if (intent === "vehicle-history") {
      h1 = `${yearStr} ${make} ${model} vehicle history in ${stateName}`;
      title = `${yearStr} ${make} ${model} vehicle history report in ${stateName} | Vintrusted`;
      metaDescription = `Get the full vehicle history report for a ${yearStr} ${make} ${model} in ${stateName}, including title events, insurance records, prior use and mileage.`;
      urlPath = `/lookup/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `See the complete history of a ${yearStr} ${make} ${model} in ${stateName} before you sign or send money.`;
    } else if (intent === "accident-check") {
      h1 = `${yearStr} ${make} ${model} accident check in ${stateName}`;
      title = `${yearStr} ${make} ${model} accident history in ${stateName} | Vintrusted`;
      metaDescription = `Check if a ${yearStr} ${make} ${model} in ${stateName} has recorded accidents, total loss, frame damage or airbag deployment.`;
      urlPath = `/accident/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `Find out if a ${yearStr} ${make} ${model} in ${stateName} has major accidents or total loss history before you buy.`;
    } else {
      h1 = `${yearStr} ${make} ${model} market value in ${stateName}`;
      title = `${yearStr} ${make} ${model} market value in ${stateName} | Price insight`;
      metaDescription = `Estimate fair market value for a ${yearStr} ${make} ${model} in ${stateName} using recent auction and listing data.`;
      urlPath = `/value/${stateCodeLower}/${makeSlug}/${modelSlug}/${yearStr}/`;
      mainFact = `See what a ${yearStr} ${make} ${model} in ${stateName} really sells for in the market, not just asking prices.`;
    }
  }

  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/,"");
  const selfUrl = baseUrl + urlPath;
  const altLang = lang === "en"
    ? selfUrl.replace("/vin/","/es/vin/").replace("/lookup/","/es/informe/")
    : selfUrl.replace("/es/","/");
  const xDefault = baseUrl + "/";

  const updatedAtIso = new Date().toISOString();
  const t = buildLocalizedText(lang, base);

  const tableRows = [
    { label: lang === "en" ? "Make" : "Marca", value: make },
    { label: lang === "en" ? "Model" : "Modelo", value: model },
    { label: lang === "en" ? "Model year" : "Año modelo", value: yearStr },
    { label: lang === "en" ? "State" : "Estado", value: lang === "en" ? stateName : stateNameEs },
    {
      label: lang === "en" ? "Intended use" : "Uso previsto",
      value:
        intent === "vin-check"
          ? lang === "en"
            ? "VIN check before buying"
            : "Checar VIN antes de comprar"
          : intent === "vehicle-history"
          ? lang === "en"
            ? "Full vehicle history insight"
            : "Historial completo del vehículo"
          : intent === "accident-check"
          ? lang === "en"
            ? "Accident / damage check"
            : "Revisión de accidentes y daños"
          : lang === "en"
          ? "Market value estimate"
          : "Estimación de valor de mercado"
    }
  ];

  const faq = (lang === "en"
    ? [
        {
          q: "Is this VIN report official?",
          a: "Vintrusted aggregates data from official and commercial sources, but the report is not a government document. It is designed to support your buying decision."
        },
        {
          q: "Will I see accidents and title brands?",
          a: "If accidents, total loss events or title brands are reported to data sources, they will be shown in the vehicle history section."
        },
        {
          q: "Can I use the report after I buy the car?",
          a: "Yes, you can keep a copy of the report as part of your vehicle records to track history and resale value."
        },
        {
          q: "How long does it take to get the report?",
          a: "Reports are usually generated within seconds after payment is processed."
        }
      ]
    : [
        {
          q: "¿Es oficial este reporte de VIN?",
          a: "Vintrusted usa datos de fuentes oficiales y comerciales, pero el reporte no es un documento del gobierno. Sirve para que tomes una mejor decisión de compra."
        },
        {
          q: "¿Voy a ver accidentes y títulos salvage?",
          a: "Si hay accidentes, pérdida total o marcas de título reportadas, se muestran en la sección de historial del vehículo."
        },
        {
          q: "¿Puedo usar el reporte después de comprar el carro?",
          a: "Sí, puedes guardar el reporte como parte del historial del carro y para futura reventa."
        },
        {
          q: "¿Cuánto tarda en generarse el reporte?",
          a: "Normalmente se genera en segundos después de que se aprueba el pago."
        }
      ]);

  const internalLinks = [
    {
      href: lang === "en"
        ? "/blog/how-to-avoid-salvage-title-scam/"
        : "/es/blog/como-evitar-fraude-de-titulo-salvage/",
      label: lang === "en"
        ? "How to avoid salvage title scams"
        : "Cómo evitar fraudes con títulos salvage"
    },
    {
      href: lang === "en"
        ? "/blog/copart-vs-iaai-auction-risks/"
        : "/es/blog/riesgos-de-subastas-copart-iaai/",
      label: lang === "en"
        ? "Copart vs IAAI auction risks"
        : "Riesgos en subastas Copart e IAAI"
    }
  ];

  const trustHtml =
    lang === "en"
      ? `<p>Vintrusted focuses on U.S. used cars and light trucks. Data is aggregated from title agencies, insurance records and large auction platforms to give you a realistic view of a vehicle's past.</p>`
      : `<p>Vintrusted se centra en autos usados y camionetas ligeras en EE.UU. Usamos datos de agencias de título, aseguradoras y subastas grandes para mostrar el pasado real del vehículo.</p>`;

  const footerText =
    lang === "en"
      ? "Vintrusted is a vehicle data service. We are not affiliated with any DMV or government agency. Always verify critical information with official sources."
      : "Vintrusted es un servicio de datos de vehículos. No estamos afiliados a ningún DMV ni agencia gubernamental. Verifica la información crítica con fuentes oficiales.";

  return {
    lang,
    title,
    metaDescription,
    h1,
    mainFact,
    updatedAtIso,
    tableRows,
    detailsHtml: pageDataDetailsPlaceholder(intent, lang, stateName, make, model, yearStr),
    faq,
    trustHtml,
    internalLinks,
    footerText,
    hreflang: {
      self: selfUrl,
      altLang,
      xDefault
    },
    t,
    templateLayout: templateLayout || ["summary","table","details","faq","trust","links"]
  };
}

function pageDataDetailsPlaceholder(intent, lang, stateName, make, model, yearStr) {
  if (lang === "es") {
    if (intent === "vin-check") {
      return `<p>El chequeo VIN combina datos de aseguradoras, agencias de título y registros de subasta en ${stateName}. Antes de entregar dinero por un ${yearStr} ${make} ${model}, revisa si tuvo pérdidas totales, uso comercial o millas sospechosas.</p>`;
    }
    if (intent === "accident-check") {
      return `<p>Los accidentes fuertes suelen terminar en reclamaciones de seguro, registros de subasta y marcas en el título. Un ${yearStr} ${make} ${model} en ${stateName} con historial limpio debería mostrar lecturas de odómetro consistentes y cero daños estructurales en el reporte.</p>`;
    }
    if (intent === "vehicle-history") {
      return `<p>El historial completo de un ${yearStr} ${make} ${model} incluye registros de uso previo (flota, renta, ride-share), servicios en talleres, inspecciones de emisiones y cualquier advertencia del DMV en ${stateName}.</p>`;
    }
    return `<p>El valor real de un ${yearStr} ${make} ${model} en ${stateName} depende de su historial. Un carro limpio con millaje verificado debería valer mucho más que uno con título salvage o uso intensivo en ride-share.</p>`;
  }

  if (intent === "vin-check") {
    return `<p>A VIN check merges data from insurers, DMV branches and major auction platforms in ${stateName}. Before sending money for a ${yearStr} ${make} ${model}, confirm it didn't suffer total loss, commercial abuse or suspicious mileage jumps.</p>`;
  }
  if (intent === "accident-check") {
    return `<p>Severe accidents usually leave traces in insurance claims, auction records and title branding. A clean ${yearStr} ${make} ${model} in ${stateName} should show consistent odometer readings and zero structural damage alerts in the history report.</p>`;
  }
  if (intent === "vehicle-history") {
    return `<p>The full history of a ${yearStr} ${make} ${model} reveals prior use (fleet, rental, ride-share), service visits, emissions inspections and any DMV warnings inside ${stateName}. That context matters more than photos in the listing.</p>`;
  }
  return `<p>The real market value of a ${yearStr} ${make} ${model} in ${stateName} depends entirely on its history. Clean title plus verified mileage usually means a much stronger resale price than salvage or hard fleet use.</p>`;
}

module.exports = {
  STATES,
  MAKES_MODELS,
  YEARS,
  INTENTS,
  getAllStateMakeYearSeedsWithLangs,
  buildVinPageData
};
