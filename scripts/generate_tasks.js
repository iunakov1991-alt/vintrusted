#!/usr/bin/env node

/**
 * MONSTER 7.x: Generate Tasks Script
 * Генерирует CSV файлы с задачами для batch pipeline
 */

const fs = require('fs');
const path = require('path');

// Загружаем данные
const makesModelsPath = path.join(process.cwd(), 'data', 'makes-models.json');
const urlSeedsPath = path.join(process.cwd(), 'data', 'seo', 'url-seeds.json');

if (!fs.existsSync(makesModelsPath) || !fs.existsSync(urlSeedsPath)) {
  console.error('ERROR: Required data files not found');
  console.error(`  makes-models.json: ${fs.existsSync(makesModelsPath) ? '✅' : '❌'}`);
  console.error(`  url-seeds.json: ${fs.existsSync(urlSeedsPath) ? '✅' : '❌'}`);
  process.exit(1);
}

const makesModels = JSON.parse(fs.readFileSync(makesModelsPath, 'utf8'));
const urlSeeds = JSON.parse(fs.readFileSync(urlSeedsPath, 'utf8'));

// Функция для генерации VIN
function generateVIN(make, year) {
  const yearCode = {
    '2015': 'F', '2016': 'G', '2017': 'H', '2018': 'J', '2019': 'K',
    '2020': 'L', '2021': 'M', '2022': 'N', '2023': 'P', '2024': 'R', '2025': 'S'
  }[year] || 'K';
  
  const wmiCodes = {
    'Toyota': '4T1',
    'Honda': '19U',
    'Ford': '1FT',
    'Chevrolet': '1GC',
    'Nissan': '1N4',
    'Hyundai': '5N1',
    'Kia': '5XX',
    'Mazda': 'JM1',
    'Subaru': '4S3',
    'Volkswagen': '1VW',
    'BMW': 'WBA',
    'Mercedes-Benz': 'WDD',
    'Audi': 'WAU',
    'Lexus': 'JTH',
    'Acura': '19U',
    'Jeep': '1C4',
    'Ram': '1D7',
    'GMC': '1GT',
    'Tesla': '5YJ'
  };
  
  const wmi = wmiCodes[make] || '1HG';
  const randomSerial = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  const vds = Array.from({length: 5}, () => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  
  const checkDigit = '0123456789X'[Math.floor(Math.random() * 11)];
  const plantCode = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)];
  
  // Убеждаемся, что все компоненты определены
  if (!wmi || !vds || !checkDigit || !yearCode || !plantCode || !randomSerial) {
    throw new Error(`VIN generation failed: wmi=${wmi}, vds=${vds}, checkDigit=${checkDigit}, yearCode=${yearCode}, plantCode=${plantCode}, serial=${randomSerial}`);
  }
  
  const vin = `${wmi}${vds}${checkDigit}${yearCode}${plantCode}${randomSerial}`;
  
  // Проверяем длину VIN (должно быть 17 символов)
  if (vin.length !== 17) {
    throw new Error(`Invalid VIN length: ${vin.length} (expected 17)`);
  }
  
  return vin;
}

// Генерация задач
function generateTasks(count, stageName) {
  const tasks = [];
  const usedCombinations = new Set();
  
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
  const states = urlSeeds.states || [];
  
  while (tasks.length < count) {
    // Случайная марка и модель
    const makeEntry = makesModels[Math.floor(Math.random() * makesModels.length)];
    const make = makeEntry.make;
    const model = makeEntry.models[Math.floor(Math.random() * makeEntry.models.length)];
    
    // Случайный год
    const year = years[Math.floor(Math.random() * years.length)];
    
    // Случайный штат
    const stateEntry = states[Math.floor(Math.random() * states.length)];
    const stateSlug = stateEntry.slug || stateEntry;
    const stateLabel = typeof stateSlug === 'string' 
      ? stateSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : stateSlug;
    
    // Проверяем уникальность комбинации
    const combination = `${make}-${model}-${year}-${stateSlug}`;
    if (!usedCombinations.has(combination)) {
      usedCombinations.add(combination);
      
      const vin = generateVIN(make, year);
      const fullModel = `${make} ${model}`;
      
      tasks.push({
        vin,
        model: fullModel,
        year,
        state: typeof stateLabel === 'string' ? stateLabel : stateSlug
      });
    }
  }
  
  return tasks;
}

function main() {
  const args = process.argv.slice(2);
  const stageIndex = args.indexOf('--stage');
  const countIndex = args.indexOf('--count');
  
  if (stageIndex === -1 || !args[stageIndex + 1]) {
    console.error('Usage: node generate_tasks.js --stage <stage1|stage2|stage3|stage4> [--count <number>]');
    process.exit(1);
  }
  
  const stageName = args[stageIndex + 1];
  const defaultCounts = {
    stage1: 10,
    stage2: 50,
    stage3: 100,
    stage4: 1000
  };
  
  const count = countIndex !== -1 && args[countIndex + 1] 
    ? parseInt(args[countIndex + 1], 10)
    : defaultCounts[stageName] || 10;
  
  // Создаем директорию tasks
  const tasksDir = path.join(process.cwd(), 'tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  
  // Генерируем задачи
  console.log(`Generating ${count} tasks for ${stageName}...`);
  const tasks = generateTasks(count, stageName);
  
  // Сохраняем в CSV
  const csvPath = path.join(tasksDir, `${stageName}_tasks.csv`);
  const csvLines = ['VIN,MODEL,YEAR,STATE'];
  tasks.forEach(task => {
    csvLines.push(`${task.vin},${task.model},${task.year},${task.state}`);
  });
  
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');
  console.log(`✅ Generated ${tasks.length} tasks in ${csvPath}`);
  
  // Также сохраняем JSON для удобства
  const jsonPath = path.join(tasksDir, `${stageName}_tasks.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(tasks, null, 2), 'utf8');
  console.log(`✅ Saved JSON version: ${jsonPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { generateTasks };

