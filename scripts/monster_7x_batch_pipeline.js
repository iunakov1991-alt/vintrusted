#!/usr/bin/env node

/**
 * MONSTER 7.x: Batch Processing Pipeline
 * Единый скрипт для батч-обработки статей с самообучением
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log, error } = require('./seo/logger');

// Пути к скриптам
const GEN_SCRIPT = path.join(__dirname, 'gen_page.js');
const QA_SCRIPT = path.join(__dirname, 'qa_page.js');
const FIX_ENDINGS_SCRIPT = path.join(__dirname, 'fix_endings.js');
const VALIDATE_PAGE_SCRIPT = path.join(__dirname, 'validate_page.js');
const EXTRACT_PATTERNS_SCRIPT = path.join(__dirname, 'auto_pattern_extractor.js');
const RULE_COMPILER_SCRIPT = path.join(__dirname, 'rule_compiler.js');
const RULE_OPTIMIZER_SCRIPT = path.join(__dirname, 'rule_optimizer.js');
const RULE_ESCALATOR_SCRIPT = path.join(__dirname, 'rule_escalator.js');
const PAGE_LOGGER_SCRIPT = path.join(__dirname, 'log_page_analytics.js');

// Конфигурация ступеней
const STAGES = {
  stage1: { count: 10, depth: 'deep', retries: 5, allowMajorRegen: true },
  stage2: { count: 50, depth: 'medium', retries: 4, allowMajorRegen: true },
  stage3: { count: 100, depth: 'light', retries: 3, allowMajorRegen: false },
  stage4: { count: 1000, depth: 'prod', retries: 2, allowMajorRegen: false }
};

const RULES_FILE = path.join(process.cwd(), 'rules', 'rules.json');
const ERROR_PATTERNS_FILE = path.join(process.cwd(), 'rules', 'error_patterns.json');

/**
 * Инициализация rules.json если его нет
 */
function initializeRulesFile() {
  if (fs.existsSync(RULES_FILE)) {
    return;
  }

  const rulesDir = path.dirname(RULES_FILE);
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  const defaultRules = {
    version: 1,
    rules: [
      {
        id: "syntax_incomplete_sentence_common",
        type: "syntax",
        scope: "block",
        priority: 3,
        pattern: "(which may|for potential|This is a primary\\.|by moving it through states with different\\.|meaning the physical title\\.|How accurate is the reported number of previous\\.)$",
        action: "regenerate_tail",
        applies_to: ["hero", "state_specific", "accident_intelligence", "buyer_guide", "faq", "recalls_tsbs"],
        meta: {
          description: "Обрыв типичных англ. конструкций в конце блока",
          stage_min: "deep",
          stage_max: "prod"
        }
      },
      {
        id: "semantic_unfinished_question",
        type: "semantic",
        scope: "block",
        priority: 4,
        pattern: "\\?$",
        action: "regenerate_tail",
        applies_to: ["faq"],
        meta: {
          description: "Незавершенный вопрос в FAQ",
          stage_min: "deep",
          stage_max: "light"
        }
      },
      {
        id: "structure_block_min_length",
        type: "structure",
        scope: "block",
        priority: 3,
        pattern: ".*",
        action: "enforce_min_length",
        applies_to: ["hero", "state_specific", "accident_intelligence", "buyer_guide", "recalls_tsbs"],
        meta: {
          min_words: 180,
          stage_min: "deep",
          stage_max: "prod"
        }
      }
    ],
    stats: {
      usage: {}
    }
  };

  fs.writeFileSync(RULES_FILE, JSON.stringify(defaultRules, null, 2), 'utf8');
  log('BATCH', `✅ Initialized ${RULES_FILE}`);
}

/**
 * Запуск батча страниц
 */
async function runBatch(stageName, count, depth, maxRetries, allowMajorRegen = false) {
  log('BATCH', `=== RUN BATCH: ${stageName} (${count} pages, depth=${depth}, retries=${maxRetries}, allow_major_regen=${allowMajorRegen}) ===`);

  const tasksFile = path.join(process.cwd(), 'tasks', `${stageName}_tasks.csv`);
  if (!fs.existsSync(tasksFile)) {
    error('BATCH', `Tasks file not found: ${tasksFile}`);
    return;
  }

  const logFile = path.join(process.cwd(), 'logs', `${stageName}.log`);
  const tmpDir = path.join(process.cwd(), 'tmp');
  const outputDir = path.join(process.cwd(), 'output');
  const qcIssuesDir = path.join(process.cwd(), 'qc_issues');

  // Создаем директории
  [tmpDir, outputDir, qcIssuesDir, path.dirname(logFile)].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Очищаем лог
  fs.writeFileSync(logFile, '');

  const tasksContent = fs.readFileSync(tasksFile, 'utf8');
  const tasks = tasksContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('VIN')); // Пропускаем заголовок и пустые строки
  const failedPages = [];

  for (let i = 0; i < Math.min(count, tasks.length); i++) {
    const line = tasks[i];
    if (!line) continue;

    const [vin, model, year, state] = line.split(',').map(s => s.trim());
    if (!vin || !model || !year || !state) continue;

    log('BATCH', `[${stageName}][${i + 1}/${count}] ${vin} ${model} ${year} ${state}`);

    try {
      // 1) Генерация страницы
      const genOutput = path.join(tmpDir, `${vin}.json`);
      const genLogFile = path.join(tmpDir, `${vin}.gen.log`);
      
      // Запускаем генерацию, логи в отдельный файл, JSON в stdout
      const genResult = execSync(`node "${GEN_SCRIPT}" --vin "${vin}" --model "${model}" --year "${year}" --state "${state}" --analysis-depth "${depth}" --max-retries ${maxRetries} 2> "${genLogFile}"`, {
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      // Извлекаем JSON из вывода (JSON должен быть последним в stdout)
      // Ищем последний валидный JSON объект, начиная с конца
      let jsonOutput = '';
      const trimmedResult = genResult.trim();
      
      // Ищем последнюю открывающую скобку и пробуем распарсить от неё до конца
      let jsonStart = trimmedResult.lastIndexOf('{');
      if (jsonStart === -1) {
        error('BATCH', `Generation failed for ${vin}: No JSON found in output`);
        failedPages.push({ vin, reason: 'Generation failed: No JSON found' });
        continue;
      }
      
      // Пробуем распарсить JSON, начиная с найденной позиции
      let found = false;
      for (let start = jsonStart; start >= 0 && !found; start--) {
        if (trimmedResult[start] === '{') {
          try {
            const candidate = trimmedResult.substring(start);
            JSON.parse(candidate); // Проверяем валидность
            jsonOutput = candidate;
            found = true;
          } catch (e) {
            // Продолжаем поиск
          }
        }
      }
      
      if (!found || !jsonOutput) {
        error('BATCH', `Generation failed for ${vin}: No valid JSON in output`);
        failedPages.push({ vin, reason: 'Generation failed: No valid JSON' });
        continue;
      }
      
      // Сохраняем JSON в файл
      fs.writeFileSync(genOutput, jsonOutput, 'utf8');

      if (!fs.existsSync(genOutput)) {
        error('BATCH', `Generation failed for ${vin}`);
        failedPages.push({ vin, reason: 'Generation failed' });
        continue;
      }

      // 2) QA проверка (устанавливаем переменные окружения для qa_page.js)
      const qaOutput = path.join(tmpDir, `${vin}.qa.json`);
      try {
        const env = { ...process.env, MONSTER_VIN: vin, MONSTER_STAGE: stageName };
        execSync(`node "${QA_SCRIPT}" "${genOutput}" --depth "${depth}" --stage "${stageName}" >> "${logFile}" 2>&1`, {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: env
        });
      } catch (qaErr) {
        // QA может вернуть ошибку при проблемах валидации, но это не критично
        // Продолжаем обработку, но логируем предупреждение
        log('BATCH', `⚠️  QA found issues for ${vin}, but continuing...`);
      }

      // 3) Исправление концовок
      const fixedOutput = path.join(tmpDir, `${vin}.fixed.json`);
      execSync(`node "${FIX_ENDINGS_SCRIPT}" "${genOutput}" --output "${fixedOutput}"`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      // 4) SEVERITY-ВАЛИДАЦИЯ (ключевой момент)
      const validateLogFile = path.join(tmpDir, `${vin}.validate.log`);
      let validationOutput = '';
      let severity = 'UNKNOWN';
      let severityLine = '';
      
      try {
        validationOutput = execSync(`node "${VALIDATE_PAGE_SCRIPT}" "${fixedOutput}"`, {
          cwd: process.cwd(),
          encoding: 'utf8'
        });
        
        // Парсим строку формата SEVERITY:...;WORDCOUNT:...;FATAL=...;MAJOR=...;MINOR=...
        const lines = validationOutput.trim().split('\n');
        severityLine = lines[0] || '';
        
        // Извлекаем severity из строки
        const severityMatch = severityLine.match(/SEVERITY:([^;]+)/);
        if (severityMatch) {
          severity = severityMatch[1];
        }
        
        // Сохраняем результат валидации в локальный лог страницы
        fs.appendFileSync(validateLogFile, validationOutput, 'utf8');
        fs.appendFileSync(logFile, `[VALIDATE][${vin}] ${severityLine}\n`, 'utf8');
        
        // Логируем аналитику в JSONL
        try {
          execSync(`node "${PAGE_LOGGER_SCRIPT}" "${vin}" "${stageName}" "${severityLine}"`, {
            cwd: process.cwd(),
            stdio: 'pipe'
          });
        } catch (logErr) {
          // Не критично, если логирование не удалось
          log('BATCH', `⚠️  Failed to log analytics for ${vin}`);
        }
        
        // FATAL — не публикуем
        if (severity === 'FATAL') {
          error('BATCH', `Page for ${vin} has FATAL severity, NOT PUBLISHED`);
          failedPages.push({ 
            vin, 
            reason: 'FATAL severity', 
            severity: severity
          });
          continue;
        }
        
        // MAJOR-регенерация на ранних стадиях
        if (severity === 'MAJOR' && allowMajorRegen) {
          log('BATCH', `Page for ${vin} has MAJOR severity → trying one regeneration pass...`);
          
          // Регенерация
          const regenOutput = path.join(tmpDir, `${vin}.regen.json`);
          const regenLogFile = path.join(tmpDir, `${vin}.regen.gen.log`);
          
          try {
            const regenResult = execSync(`node "${GEN_SCRIPT}" --vin "${vin}" --model "${model}" --year "${year}" --state "${state}" --analysis-depth "${depth}" --max-retries ${maxRetries} 2> "${regenLogFile}"`, {
              cwd: process.cwd(),
              encoding: 'utf8'
            });
            
            // Извлекаем JSON из вывода
            let regenJsonOutput = '';
            const trimmedRegenResult = regenResult.trim();
            let regenJsonStart = trimmedRegenResult.lastIndexOf('{');
            if (regenJsonStart !== -1) {
              for (let start = regenJsonStart; start >= 0; start--) {
                if (trimmedRegenResult[start] === '{') {
                  try {
                    const candidate = trimmedRegenResult.substring(start);
                    JSON.parse(candidate);
                    regenJsonOutput = candidate;
                    break;
                  } catch (e) {
                    continue;
                  }
                }
              }
            }
            
            if (regenJsonOutput) {
              fs.writeFileSync(regenOutput, regenJsonOutput, 'utf8');
              
              // QA для regen
              try {
                const env = { ...process.env, MONSTER_VIN: vin, MONSTER_STAGE: `${stageName}_regen` };
                execSync(`node "${QA_SCRIPT}" "${regenOutput}" --depth "${depth}" --stage "${stageName}_regen" >> "${logFile}" 2>&1`, {
                  cwd: process.cwd(),
                  stdio: 'inherit',
                  env: env
                });
              } catch (qaErr) {
                log('BATCH', `⚠️  QA found issues for ${vin} regen, but continuing...`);
              }
              
              // Fix endings для regen
              const regenFixedOutput = path.join(tmpDir, `${vin}.regen.fixed.json`);
              execSync(`node "${FIX_ENDINGS_SCRIPT}" "${regenOutput}" --output "${regenFixedOutput}"`, {
                cwd: process.cwd(),
                stdio: 'inherit'
              });
              
              // Валидация regen
              const regenValidationOutput = execSync(`node "${VALIDATE_PAGE_SCRIPT}" "${regenFixedOutput}"`, {
                cwd: process.cwd(),
                encoding: 'utf8'
              });
              
              const regenLines = regenValidationOutput.trim().split('\n');
              const regenSeverityLine = regenLines[0] || '';
              const regenSeverityMatch = regenSeverityLine.match(/SEVERITY:([^;]+)/);
              const regenSeverity = regenSeverityMatch ? regenSeverityMatch[1] : 'UNKNOWN';
              
              fs.appendFileSync(logFile, `[VALIDATE-REGEN][${vin}] ${regenSeverityLine}\n`, 'utf8');
              
              // Логируем аналитику regen
              try {
                execSync(`node "${PAGE_LOGGER_SCRIPT}" "${vin}" "${stageName}_regen" "${regenSeverityLine}"`, {
                  cwd: process.cwd(),
                  stdio: 'pipe'
                });
              } catch (logErr) {
                // Не критично
              }
              
              if (regenSeverity === 'FATAL') {
                error('BATCH', `Page for ${vin} has FATAL severity after regen, NOT PUBLISHED`);
                failedPages.push({ vin, reason: 'FATAL severity after regen', severity: 'FATAL' });
                continue;
              }
              
              // Публикуем regen версию
              fs.copyFileSync(regenFixedOutput, path.join(outputDir, `${vin}.json`));
              log('BATCH', `✅ Published ${vin} (regen, severity=${regenSeverity})`);
              continue;
            }
          } catch (regenErr) {
            log('BATCH', `⚠️  Regen failed for ${vin}, using original version`);
          }
        }
        
        // MINOR / OK / MAJOR без регена → публикуем текущую версию
        if (severity === 'MAJOR' || severity === 'MINOR') {
          log('BATCH', `Page for ${vin} has ${severity} severity (published with warnings)`);
        } else {
          log('BATCH', `Page for ${vin} passed validation (${severity})`);
        }
      } catch (validateErr) {
        // Если валидация упала с ошибкой, считаем страницу FATAL
        error('BATCH', `Validation script failed for ${vin}: ${validateErr.message}`);
        failedPages.push({ vin, reason: `Validation script failed: ${validateErr.message}`, severity: 'FATAL' });
        continue;
      }

      // 5) Публикация
      fs.copyFileSync(fixedOutput, path.join(outputDir, `${vin}.json`));
      log('BATCH', `✅ Published ${vin}`);

    } catch (err) {
      error('BATCH', `Error processing ${vin}: ${err.message}`);
      failedPages.push({ vin, reason: err.message });
    }
  }

  // Сохраняем список проваленных страниц
  const failedFile = path.join(qcIssuesDir, `${stageName}_failed_pages.json`);
  if (failedPages.length > 0) {
    fs.writeFileSync(failedFile, JSON.stringify(failedPages, null, 2), 'utf8');
    log('BATCH', `⚠️  ${failedPages.length} pages failed, saved to ${failedFile}`);
  } else {
    // Создаем пустой файл если нет провалов
    fs.writeFileSync(failedFile, '[]', 'utf8');
  }

  // Итог по стадии с разбивкой по severity
  const publishedCount = fs.readdirSync(outputDir).filter(f => f.endsWith('.json')).length;
  const fatalCount = failedPages.filter(p => p.severity === 'FATAL' || !p.severity).length;
  const okCount = publishedCount;
  
  log('BATCH', `=== SUMMARY ${stageName} ===`);
  log('BATCH', `Published (OK/MAJOR/MINOR):  ${okCount}`);
  log('BATCH', `Failed (FATAL):              ${fatalCount}`);
  log('BATCH', `Total processed:             ${tasks.length}`);
  log('BATCH', `=============================`);

  return { failedPages, logFile };
}

/**
 * Извлечение паттернов из логов
 */
function extractPatterns(stageName) {
  const logFile = path.join(process.cwd(), 'logs', `${stageName}.log`);
  
  if (!fs.existsSync(logFile)) {
    error('BATCH', `Log file not found: ${logFile}`);
    return;
  }

  log('BATCH', `=== EXTRACT PATTERNS FROM: ${logFile} ===`);

  execSync(`node "${EXTRACT_PATTERNS_SCRIPT}" --log "${logFile}" --out "${ERROR_PATTERNS_FILE}"`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
}

/**
 * Пересборка правил из паттернов
 */
function rebuildRulesFromPatterns() {
  log('BATCH', '=== REBUILD RULES FROM PATTERNS ===');

  const tempRulesFile = `${RULES_FILE}.tmp`;

  execSync(`node "${RULE_COMPILER_SCRIPT}" --patterns "${ERROR_PATTERNS_FILE}" --rules-in "${RULES_FILE}" --rules-out "${tempRulesFile}"`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  if (fs.existsSync(tempRulesFile)) {
    fs.renameSync(tempRulesFile, RULES_FILE);
    log('BATCH', '✅ Rules rebuilt');
  }
}

/**
 * Оптимизация правил
 */
function optimizeRules() {
  log('BATCH', '=== OPTIMIZE RULES ===');

  const tempRulesFile = `${RULES_FILE}.tmp`;

  execSync(`node "${RULE_OPTIMIZER_SCRIPT}" --rules-in "${RULES_FILE}" --rules-out "${tempRulesFile}"`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  if (fs.existsSync(tempRulesFile)) {
    fs.renameSync(tempRulesFile, RULES_FILE);
    log('BATCH', '✅ Rules optimized');
  }

  // Эскалация правил
  if (fs.existsSync(ERROR_PATTERNS_FILE)) {
    execSync(`node "${RULE_ESCALATOR_SCRIPT}" --rules "${RULES_FILE}" --stats "${ERROR_PATTERNS_FILE}"`, {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
  }
}

/**
 * Запуск всех ступеней
 */
async function runAllStages() {
  log('BATCH', '=== MONSTER 7.x BATCH PIPELINE STARTED ===');
  
  // Инициализируем rules.json если его нет
  initializeRulesFile();

  for (const [stageName, config] of Object.entries(STAGES)) {
    // Запуск батча
    const { failedPages, logFile } = await runBatch(
      stageName,
      config.count,
      config.depth,
      config.retries,
      config.allowMajorRegen || false
    );

    // Извлечение паттернов
    extractPatterns(stageName);

    // Пересборка правил
    rebuildRulesFromPatterns();

    // Оптимизация правил
    optimizeRules();

    log('BATCH', `✅ Stage ${stageName} completed`);
  }

  log('BATCH', '=== MULTI-STAGE QA PIPELINE COMPLETED (10 → 50 → 100 → 1000) ===');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--stage' && args[1]) {
    const stageName = args[1];
    const config = STAGES[stageName];
    if (!config) {
      error('BATCH', `Unknown stage: ${stageName}`);
      process.exit(1);
    }
    
    // Инициализируем rules.json если его нет
    initializeRulesFile();
    
    runBatch(stageName, config.count, config.depth, config.retries, config.allowMajorRegen || false)
      .then(() => {
        extractPatterns(stageName);
        rebuildRulesFromPatterns();
        optimizeRules();
      })
      .catch(err => {
        error('BATCH', `Fatal error: ${err.message}`);
        process.exit(1);
      });
  } else {
    runAllStages().catch(err => {
      error('BATCH', `Fatal error: ${err.message}`);
      process.exit(1);
    });
  }
}

module.exports = { runBatch, extractPatterns, rebuildRulesFromPatterns, optimizeRules, runAllStages };

