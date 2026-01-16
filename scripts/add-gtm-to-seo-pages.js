import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GTM код для вставки в <head>
const GTM_HEAD = `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-KR67NRNW');</script>
    <!-- End Google Tag Manager -->
`;

// GTM noscript для вставки после <body>
const GTM_BODY = `
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KR67NRNW"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
`;

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Рекурсивно обрабатывает все HTML файлы в директории
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Пропускаем backup папки
      if (file.includes('backup')) {
        continue;
      }
      processDirectory(fullPath);
    } else if (file.endsWith('.html')) {
      processHTMLFile(fullPath);
    }
  }
}

// Обрабатывает один HTML файл
function processHTMLFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Проверяем, есть ли уже GTM
    if (content.includes('GTM-KR67NRNW')) {
      console.log(`⏭️  Пропускаю ${filePath} (GTM уже установлен)`);
      skippedCount++;
      return;
    }
    
    let modified = false;
    
    // Добавляем GTM в <head> перед </head>
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${GTM_HEAD}  </head>`);
      modified = true;
    }
    
    // Добавляем GTM noscript после <body>
    if (content.includes('<body>')) {
      content = content.replace('<body>', `<body>${GTM_BODY}`);
      modified = true;
    } else if (content.match(/<body[^>]*>/)) {
      // Если <body> с атрибутами
      content = content.replace(/<body([^>]*)>/, `<body$1>${GTM_BODY}`);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Обновлен ${filePath}`);
      processedCount++;
    } else {
      console.log(`⚠️  Не удалось обновить ${filePath} (не найден <head> или <body>)`);
      errorCount++;
    }
    
  } catch (error) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
    errorCount++;
  }
}

// Запуск
const publicDir = path.resolve(__dirname, '../public');
console.log('🚀 Начинаю добавление GTM на SEO страницы...');
console.log(`📁 Директория: ${publicDir}\n`);

processDirectory(publicDir);

console.log('\n============================================================');
console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`✅ Обновлено: ${processedCount}`);
console.log(`⏭️  Пропущено (уже есть GTM): ${skippedCount}`);
console.log(`❌ Ошибок: ${errorCount}`);
console.log('============================================================');
