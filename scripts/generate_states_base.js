#!/usr/bin/env node

/**
 * Генератор базовых данных для всех штатов
 * Используется для расширения FACT-LOCK базы данных
 */

const fs = require('fs');
const path = require('path');

const statesData = {
  "Alabama": { code: "al", slug: "alabama" },
  "Alaska": { code: "ak", slug: "alaska" },
  "Arizona": { code: "az", slug: "arizona" },
  "Arkansas": { code: "ar", slug: "arkansas" },
  "California": { code: "ca", slug: "california" },
  "Colorado": { code: "co", slug: "colorado" },
  "Connecticut": { code: "ct", slug: "connecticut" },
  "Delaware": { code: "de", slug: "delaware" },
  "Florida": { code: "fl", slug: "florida" },
  "Georgia": { code: "ga", slug: "georgia" },
  "Hawaii": { code: "hi", slug: "hawaii" },
  "Idaho": { code: "id", slug: "idaho" },
  "Illinois": { code: "il", slug: "illinois" },
  "Indiana": { code: "in", slug: "indiana" },
  "Iowa": { code: "ia", slug: "iowa" },
  "Kansas": { code: "ks", slug: "kansas" },
  "Kentucky": { code: "ky", slug: "kentucky" },
  "Louisiana": { code: "la", slug: "louisiana" },
  "Maine": { code: "me", slug: "maine" },
  "Maryland": { code: "md", slug: "maryland" },
  "Massachusetts": { code: "ma", slug: "massachusetts" },
  "Michigan": { code: "mi", slug: "michigan" },
  "Minnesota": { code: "mn", slug: "minnesota" },
  "Mississippi": { code: "ms", slug: "mississippi" },
  "Missouri": { code: "mo", slug: "missouri" },
  "Montana": { code: "mt", slug: "montana" },
  "Nebraska": { code: "ne", slug: "nebraska" },
  "Nevada": { code: "nv", slug: "nevada" },
  "New Hampshire": { code: "nh", slug: "new-hampshire" },
  "New Jersey": { code: "nj", slug: "new-jersey" },
  "New Mexico": { code: "nm", slug: "new-mexico" },
  "New York": { code: "ny", slug: "new-york" },
  "North Carolina": { code: "nc", slug: "north-carolina" },
  "North Dakota": { code: "nd", slug: "north-dakota" },
  "Ohio": { code: "oh", slug: "ohio" },
  "Oklahoma": { code: "ok", slug: "oklahoma" },
  "Oregon": { code: "or", slug: "oregon" },
  "Pennsylvania": { code: "pa", slug: "pennsylvania" },
  "Rhode Island": { code: "ri", slug: "rhode-island" },
  "South Carolina": { code: "sc", slug: "south-carolina" },
  "South Dakota": { code: "sd", slug: "south-dakota" },
  "Tennessee": { code: "tn", slug: "tennessee" },
  "Texas": { code: "tx", slug: "texas" },
  "Utah": { code: "ut", slug: "utah" },
  "Vermont": { code: "vt", slug: "vermont" },
  "Virginia": { code: "va", slug: "virginia" },
  "Washington": { code: "wa", slug: "washington" },
  "West Virginia": { code: "wv", slug: "west-virginia" },
  "Wisconsin": { code: "wi", slug: "wisconsin" },
  "Wyoming": { code: "wy", slug: "wyoming" },
  "District of Columbia": { code: "dc", slug: "district-of-columbia" }
};

// Базовые шаблоны для штатов
function generateStateBase(stateName, stateInfo) {
  const stateNameFormatted = stateName.replace(/\s+/g, ' ');
  const stateCode = stateInfo.code.toUpperCase();
  
  return {
    title_system: "title-holding", // Большинство штатов используют title-holding
    key_agencies: [`${stateNameFormatted} DMV`],
    main_statutes: [`${stateNameFormatted} Vehicle Code`],
    brands: ["Salvage", "Rebuilt", "Flood", "Junk"],
    inspection: "State-required vehicle inspection",
    env_risks: ["Regional environmental risks"]
  };
}

// Загружаем существующие данные
const statesPath = path.join(process.cwd(), 'data/facts/states.json');
let existingStates = {};

if (fs.existsSync(statesPath)) {
  try {
    existingStates = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
  } catch (e) {
    console.error(`Error loading existing states: ${e.message}`);
  }
}

// Генерируем данные для всех штатов
const allStates = {};

Object.entries(statesData).forEach(([stateName, stateInfo]) => {
  const stateKey = stateInfo.slug.charAt(0).toUpperCase() + stateInfo.slug.slice(1);
  
  // Используем существующие данные если есть, иначе генерируем базовые
  if (existingStates[stateKey]) {
    allStates[stateKey] = existingStates[stateKey];
  } else {
    allStates[stateKey] = generateStateBase(stateName, stateInfo);
  }
});

// Сохраняем
fs.writeFileSync(statesPath, JSON.stringify(allStates, null, 2));

console.log(`✅ Generated states data for ${Object.keys(allStates).length} states`);
console.log(`   Updated: ${statesPath}`);



