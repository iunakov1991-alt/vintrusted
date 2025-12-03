const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { log, error } = require('../logger');

/**
 * Автоматическая выгрузка на Vercel
 */
async function deployToVercel() {
  log('DEPLOY', 'Starting deployment to Vercel...');
  
  try {
    // 1. Проверяем изменения
    let hasChanges = false;
    try {
      const { stdout: status } = await execAsync('git status --porcelain public/vin/');
      hasChanges = status.trim().length > 0;
    } catch (e) {
      // Если git не настроен, пропускаем
      log('DEPLOY', 'Git not configured, skipping deployment');
      return;
    }
    
    if (!hasChanges) {
      log('DEPLOY', 'No changes to deploy');
      return;
    }
    
    // 2. Добавляем файлы
    log('DEPLOY', 'Adding files to git...');
    await execAsync('git add public/vin/');
    
    // 3. Коммит
    log('DEPLOY', 'Committing changes...');
    const commitMessage = `SEO build: ${new Date().toISOString()}`;
    try {
      await execAsync(`git commit -m "${commitMessage}"`);
    } catch (e) {
      // Если коммит не нужен (нет изменений), пропускаем
      if (e.message.includes('nothing to commit')) {
        log('DEPLOY', 'Nothing to commit');
        return;
      }
      throw e;
    }
    
    // 4. Push
    log('DEPLOY', 'Pushing to GitHub...');
    await execAsync('git push origin main');
    
    // 5. Vercel deploy hook (если настроен)
    if (process.env.VERCEL_DEPLOY_HOOK) {
      log('DEPLOY', 'Triggering Vercel deploy hook...');
      try {
        // Используем встроенный fetch (Node 18+) или node-fetch как fallback
        let fetchFunc;
        try {
          // Пробуем встроенный fetch
          fetchFunc = global.fetch || fetch;
        } catch (e) {
          // Fallback на node-fetch если встроенного нет
          fetchFunc = require('node-fetch');
        }
        
        await fetchFunc(process.env.VERCEL_DEPLOY_HOOK, { 
          method: 'POST'
        });
        log('DEPLOY', 'Vercel deploy hook triggered');
      } catch (e) {
        log('DEPLOY', `Vercel hook error: ${e.message}`);
        // Не прерываем процесс, если hook не сработал
      }
    }
    
    log('DEPLOY', 'Deployment completed successfully');
    
  } catch (e) {
    error('DEPLOY', `Deployment error: ${e.message}`);
    // Не бросаем ошибку, чтобы не прервать билд
    log('DEPLOY', 'Deployment failed, but build completed');
  }
}

module.exports = { deployToVercel };

