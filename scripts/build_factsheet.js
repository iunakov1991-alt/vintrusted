#!/usr/bin/env node

/**
 * MONSTER 7.x — FACT-LOCK CORE
 * Генератор FACT-SHEET для конкретной страницы
 * 
 * Использование:
 *   node scripts/build_factsheet.js <VIN> "<Make> <Model>" <Year> <State>
 * 
 * Пример:
 *   node scripts/build_factsheet.js "19UUB2F50KA123456" "Honda Accord" "2019" "Texas"
 */

const fs = require('fs');
const path = require('path');

const [,, vin, model, year, state] = process.argv;

if (!vin || !model || !year || !state) {
  console.error('ERROR: Missing required arguments');
  console.error('Usage: node scripts/build_factsheet.js <VIN> "<Make> <Model>" <Year> <State>');
  console.error('Example: node scripts/build_factsheet.js "19UUB2F50KA123456" "Honda Accord" "2019" "Texas"');
  process.exit(1);
}

function loadJSON(p) {
  try {
    const fullPath = path.join(process.cwd(), p);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: File not found: ${fullPath}`);
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    console.error(`ERROR: Failed to load ${p}: ${e.message}`);
    process.exit(1);
  }
}

// Загружаем эталонные данные
const vehicles = loadJSON('data/facts/vehicles.json');
const states   = loadJSON('data/facts/states.json');
const globals  = loadJSON('data/facts/global_invariants.json');

// Валидация VIN
if (vin.length !== globals.vin_length) {
  console.error(`ERROR: VIN length invalid. Expected ${globals.vin_length} characters, got ${vin.length}`);
  process.exit(1);
}

// Валидация модели
const vehicleKey = `${model} ${year}`;
if (!vehicles[vehicleKey]) {
  console.error(`ERROR: Unknown vehicle spec: ${vehicleKey}`);
  console.error(`Available vehicles: ${Object.keys(vehicles).join(', ')}`);
  process.exit(1);
}

// Валидация штата
if (!states[state]) {
  console.error(`ERROR: Unknown state: ${state}`);
  console.error(`Available states: ${Object.keys(states).join(', ')}`);
  process.exit(1);
}

const vehicleSpec = vehicles[vehicleKey];
const stateSpec = states[state];

// Извлекаем марку из модели (например, "Honda Accord" -> "Honda")
const make = model.split(' ')[0];

// Строим FACT-SHEET
const factsheet = {
  vin,
  make,
  model,
  year: parseInt(year, 10),
  state,
  generated_at: new Date().toISOString(),
  vin_facts: {
    length: globals.vin_length,
    wmi_candidates: vehicleSpec.wmi,
    known_engines: vehicleSpec.engines,
    body_types: vehicleSpec.body,
    safety_package: vehicleSpec.safety_package,
    unibody_name: vehicleSpec.unibody_name
  },
  state_facts: {
    title_system: stateSpec.title_system,
    key_agencies: stateSpec.key_agencies,
    main_statutes: stateSpec.main_statutes,
    brands: stateSpec.brands,
    inspection: stateSpec.inspection,
    env_risks: stateSpec.env_risks
  },
  global_invariants: {
    forbidden_claims: globals.forbidden_claims,
    required_vin_positions: globals.required_vin_positions
  }
};

// Сохраняем FACT-SHEET
const factsheetsDir = path.join(process.cwd(), 'data/factsheets');
if (!fs.existsSync(factsheetsDir)) {
  fs.mkdirSync(factsheetsDir, { recursive: true });
}

const outPath = path.join(factsheetsDir, `${vin}.json`);
fs.writeFileSync(outPath, JSON.stringify(factsheet, null, 2));

console.log(`✅ FACT-SHEET generated: ${outPath}`);
console.log(`   Vehicle: ${vehicleKey}`);
console.log(`   State: ${state}`);
console.log(`   VIN: ${vin}`);




