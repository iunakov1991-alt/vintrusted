const { STATES } = require("./seo-content-engine");

const TOPIC_CLUSTERS = [
  {
    id: "dmv-process",
    intents: ["dmv-check","title-status","fees"],
    buildSlug: (state) => `/dmv/${state.code.toLowerCase()}/title-check/`,
    buildSlugEs: (state) => `/es/dmv/${state.code.toLowerCase()}/revisar-titulo/`
  },
  {
    id: "fraud-odometer",
    intents: ["odometer-fraud"],
    buildSlug: () => `/guides/odometer-fraud-signs/`,
    buildSlugEs: () => `/es/guias/senales-de-fraude-en-odometro/`
  },
  {
    id: "auction-risk",
    intents: ["auction-risk"],
    buildSlug: () => `/guides/copart-iaai-auction-risks/`,
    buildSlugEs: () => `/es/guias/riesgos-subastas-copart-iaai/`
  },
  {
    id: "maintenance-cost",
    intents: ["maintenance-cost"],
    buildSlug: () => `/guides/used-car-maintenance-cost/`,
    buildSlugEs: () => `/es/guias/costo-mantenimiento-auto-usado/`
  },
  {
    id: "flipping",
    intents: ["flipping"],
    buildSlug: () => `/guides/flipping-cars-for-profit/`,
    buildSlugEs: () => `/es/guias/como-revender-autos-con-ganancia/`
  }
];

function buildTopicPageData(clusterId, lang, stateOpt) {
  const state = stateOpt || STATES[0];
  const baseUrl = (process.env.SEO_BASE_URL || "https://vintrusted.com").replace(/\/+$/,"");
  const cluster = TOPIC_CLUSTERS.find((c) => c.id === clusterId);
  if (!cluster) return null;

  const slug = lang === "es" ? cluster.buildSlugEs(state) : cluster.buildSlug(state);
  const selfUrl = baseUrl + slug;
  const altLang = lang === "en" ? baseUrl + cluster.buildSlugEs(state) : baseUrl + cluster.buildSlug(state);
  const xDefault = baseUrl + "/";

  let h1, title, metaDescription, mainFact, tableRows, faq, trustHtml, footerText, detailsHtml;

  if (clusterId === "dmv-process") {
    if (lang === "es") {
      h1 = `Cómo checar el título en el DMV de ${state.name_es}`;
      title = `Checar título y estatus en el DMV de ${state.name_es} | Guía Vintrusted`;
      metaDescription = `Guía rápida para revisar el estatus del título, tarifas y procesos del DMV en ${state.name_es} antes de comprar un auto usado.`;
      mainFact = `Antes de comprar, checa en el DMV de ${state.name_es} si el carro tiene título salvage, rebuilt o deudas pendientes.`;
      tableRows = [
        { label: "Estado", value: state.name_es },
        { label: "Paso 1", value: "Localizar el VIN completo del vehículo" },
        { label: "Paso 2", value: "Pedir reporte Vintrusted y comparar con el detalle del DMV" },
        { label: "Paso 3", value: "Confirmar que no existan deudas, liens o títulos salvage activos" }
      ];
      faq = [
        {
          q: "¿Puedo revisar el título solo con la placa?",
          a: "En algunos estados sí, pero lo más confiable es usar el VIN completo junto con un reporte de historial."
        },
        {
          q: "¿Qué hago si el título dice salvage o rebuilt?",
          a: "Debes asumir que el carro tuvo daños significativos. Revisa fotos de subasta y costo real de reparación."
        }
      ];
      trustHtml = `<p>Usar un reporte de Vintrusted junto con la información del DMV ayuda a ver el cuadro completo del historial legal del vehículo.</p>`;
      detailsHtml = `<p>Solicita el VIN completo, revisa el historial en Vintrusted y luego confirma en el portal del DMV de ${state.name_es} que no existan gravámenes activos ni títulos salvage. Lleva el número de caso o recibo por si debes mostrar evidencia.</p>`;
      footerText = "Esta guía no reemplaza la consulta directa al DMV. Verifica siempre la información del título con la oficina oficial de tu estado.";
    } else {
      h1 = `How to check title status with the DMV in ${state.name}`;
      title = `Check title and DMV status in ${state.name} | Vintrusted guide`;
      metaDescription = `Step-by-step guide for checking title status, fees and DMV records in ${state.name} before buying a used car.`;
      mainFact = `Before you buy, check with the ${state.name} DMV if the car has salvage, rebuilt or outstanding liens on the title.`;
      tableRows = [
        { label: "State", value: state.name },
        { label: "Step 1", value: "Collect full VIN from the vehicle and documents" },
        { label: "Step 2", value: "Run a Vintrusted report and compare with DMV results" },
        { label: "Step 3", value: "Confirm there are no active liens or salvage/rebuilt brands" }
      ];
      faq = [
        {
          q: "Can I check title status using only the plate?",
          a: "Some states allow partial lookup by plate, but the most reliable way is to use the full VIN with a history report."
        },
        {
          q: "What if the title shows salvage or rebuilt?",
          a: "Assume the vehicle has had major damage. Review auction photos and total repair cost before considering it."
        }
      ];
      trustHtml = `<p>Combining a Vintrusted report with official DMV data gives you a stronger view of the vehicle's legal and usage history.</p>`;
      detailsHtml = `<p>Have the seller provide a clear photo of the title, then run the VIN report. Cross-check the VIN with the ${state.name} DMV portal or in-person branch to verify liens, branding and any outstanding suspensions before transferring ownership.</p>`;
      footerText = "This guide does not replace direct DMV verification. Always confirm title status with your state DMV.";
    }
  } else if (clusterId === "fraud-odometer") {
    if (lang === "es") {
      h1 = "Señales de fraude en el odómetro al comprar un auto usado";
      title = "Cómo detectar fraude en el odómetro | Guía Vintrusted";
      metaDescription = "Aprende las señales clave de odómetro alterado y cómo usar el historial del VIN para descubrir kilómetros falsos.";
      mainFact = "Un odómetro alterado puede inflar el valor del auto miles de dólares. Un buen reporte de VIN te muestra lecturas reales.";
      tableRows = [
        { label: "Riesgo principal", value: "Pagar precio de auto con millaje bajo por uno muy usado" },
        { label: "Señal #1", value: "Lecturas de odómetro que bajan en el tiempo" },
        { label: "Señal #2", value: "Desgaste interior que no coincide con el millaje" }
      ];
      faq = [
        {
          q: "¿El fraude de odómetro sigue siendo común?",
          a: "Sí, especialmente en autos de alta demanda y camionetas de trabajo."
        },
        {
          q: "¿Un reporte de VIN siempre detecta el fraude?",
          a: "No siempre, pero ayuda a ver inconsistencias en lecturas reportadas."
        }
      ];
      trustHtml = `<p>Combinar inspección física del vehículo con un reporte de Vintrusted es la forma más eficaz de detectar odómetro alterado.</p>`;
      detailsHtml = `<p>Revisa el desgaste de volante, pedales y asientos. Si no coincide con las millas reportadas en el informe Vintrusted, pide explicaciones al vendedor y solicita fotos de servicios o inspecciones pasadas.</p>`;
      footerText = "Si sospechas de fraude, consulta también con un mecánico de confianza y reporta el caso a las autoridades si es necesario.";
    } else {
      h1 = "Signs of odometer fraud when buying a used car";
      title = "How to detect odometer fraud | Vintrusted guide";
      metaDescription = "Learn the key signs of rolled-back odometers and how to use VIN history data to reveal fake mileage.";
      mainFact = "A rolled-back odometer can inflate a car's value by thousands of dollars. A good VIN report shows real readings over time.";
      tableRows = [
        { label: "Main risk", value: "Paying low-mile price for a high-mile vehicle" },
        { label: "Sign #1", value: "Odometer readings that go backwards in history" },
        { label: "Sign #2", value: "Interior wear that does not match displayed mileage" }
      ];
      faq = [
        {
          q: "Is odometer fraud still common?",
          a: "Yes, especially in high-demand models and work trucks."
        },
        {
          q: "Will a VIN report always catch it?",
          a: "Not always, but it helps expose inconsistent reported readings."
        }
      ];
      trustHtml = `<p>Combining a physical inspection with a detailed Vintrusted history report is the most effective way to detect odometer fraud.</p>`;
      detailsHtml = `<p>Compare seat wear, pedal rubber and steering wheel shine with the claimed mileage. Any discrepancy should trigger deeper investigation via service records and VIN history snapshots.</p>`;
      footerText = "If you suspect odometer fraud, talk to a trusted mechanic and consider reporting it to the appropriate authorities.";
    }
  } else {
    if (lang === "es") {
      h1 = "Guía práctica sobre riesgos al comprar autos usados en EE.UU.";
      title = "Riesgos comunes al comprar auto usado | Vintrusted";
      metaDescription = "Guía rápida sobre riesgos de subastas, costos ocultos y garantías al comprar autos usados en EE.UU.";
      mainFact = "Los riesgos más caros al comprar un auto usado casi siempre se pueden ver en el historial del VIN antes de pagar.";
      tableRows = [
        { label: "Tema", value: "Riesgos de subastas, garantías limitadas, costos ocultos" },
        { label: "Herramienta clave", value: "Reporte completo de VIN" }
      ];
      faq = [
        {
          q: "¿Es buena idea comprar carros solo en subastas?",
          a: "Solo si entiendes bien las fotos, condiciones y costos reales de reparación."
        }
      ];
      trustHtml = `<p>Vintrusted te ayuda a ver lo que no se nota a simple vista: historial, uso previo y alertas de título del vehículo.</p>`;
      detailsHtml = `<p>Antes de comprar, revisa fotos previas del vehículo, verifica que no haya sido taxi o ride-share y calcula costos reales de impuestos y garantías extendidas en tu estado.</p>`;
      footerText = "Usa siempre un reporte de VIN junto con inspección mecánica y revisión de documentos oficiales.";
    } else {
      h1 = "Practical guide to risks when buying a used car in the U.S.";
      title = "Common risks when buying a used car | Vintrusted";
      metaDescription = "Short guide on auction risks, hidden fees and warranty limitations when buying used cars in the U.S.";
      mainFact = "Most expensive surprises when buying a used car can be seen in the VIN history before you pay.";
      tableRows = [
        { label: "Topic", value: "Auction risks, limited warranties, hidden fees" },
        { label: "Key tool", value: "Full VIN history report" }
      ];
      faq = [
        {
          q: "Is it safe to buy only from auctions?",
          a: "Only if you fully understand condition reports, photos and total repair cost."
        }
      ];
      trustHtml = `<p>Vintrusted helps you see what is not obvious at first glance: history, prior use and title alerts of the vehicle.</p>`;
      detailsHtml = `<p>Study the VIN report for commercial use flags, auction relists and title jumps between states. Combine that info with a mechanic inspection and a DMV record request to avoid expensive surprises.</p>`;
      footerText = "Always combine a VIN report with mechanical inspection and review of official documents.";
    }
  }

  return {
    lang,
    title,
    metaDescription,
    h1,
    mainFact,
    updatedAtIso: new Date().toISOString(),
    tableRows,
    detailsHtml: detailsHtml || "",
    faq,
    trustHtml,
    internalLinks: [],
    footerText,
    hreflang: {
      self: selfUrl,
      altLang,
      xDefault
    },
    t: {
      summary: mainFact,
      updatedLabel: lang === "en" ? "Updated" : "Actualizado",
      tableTitle: lang === "en" ? "Key facts" : "Datos clave",
      detailsTitle: lang === "en" ? "Details" : "Detalles",
      faqTitle: lang === "en" ? "Frequently asked questions" : "Preguntas frecuentes",
      trustTitle: lang === "en" ? "Why this matters" : "Por qué importa",
      linksTitle: lang === "en" ? "More guides" : "Más guías"
    },
    templateLayout: ["summary","table","details","faq","trust","links"]
  };
}

module.exports = {
  TOPIC_CLUSTERS,
  buildTopicPageData
};
