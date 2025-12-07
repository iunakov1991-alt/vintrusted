/**
 * MONSTER 8.0 Batch Runner API
 * Простой и рабочий API для запуска партий через GitHub Actions
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Получаем путь из query параметра (Vercel передает через ?path=)
    const pathParam = req.query.path || '';
    
    // GET /api/batch-runner/status - получить статус
    if (req.method === 'GET') {
      // Пробуем разные пути для tmp (Vercel использует /tmp для записи)
      const possiblePaths = [
        '/tmp/batch-status.json',  // Vercel serverless functions
        path.join(ROOT_DIR, 'tmp', 'batch-status.json'),  // Локально
        path.join('/var/task', 'tmp', 'batch-status.json')  // Fallback
      ];
      
      let status = {
        current: 0,
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: false,
        lastUpdate: Date.now()
      };

      // Пробуем найти файл по всем возможным путям
      for (const batchStatusPath of possiblePaths) {
        if (fs.existsSync(batchStatusPath)) {
          try {
            status = JSON.parse(fs.readFileSync(batchStatusPath, 'utf8'));
            break;
          } catch (e) {
            console.error('[Batch Runner] Error reading status from', batchStatusPath, ':', e);
          }
        }
      }

      return res.json({
        success: true,
        status
      });
    }

    // POST /api/batch-runner/start - запустить партию
    if (req.method === 'POST') {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO || 'iunakov1991-alt/vintrusted';
      const workflowFile = 'monster8-batch-scheduler.yml';

      if (!githubToken) {
        return res.status(400).json({
          success: false,
          error: 'GITHUB_TOKEN не настроен. Добавьте токен в Vercel Environment Variables.'
        });
      }

      // Определяем параметры
      const body = req.body || {};
      const forcePhase = body.phase || 'auto';
      const forceLength = body.length || 'auto';

      // Запускаем GitHub Actions workflow
      const githubApiUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflowFile}/dispatches`;
      
      const postData = JSON.stringify({
        ref: 'main',
        inputs: {
          force_phase: forcePhase,
          force_length: forceLength
        }
      });

      const url = new URL(githubApiUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'MONSTER-8.0-Batch-Runner'
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 204 || res.statusCode === 200) {
              // Успешно запущено
              resolve({
                success: true,
                message: '✅ Партия запущена через GitHub Actions!',
                workflow: {
                  repo: githubRepo,
                  file: workflowFile,
                  phase: forcePhase,
                  length: forceLength
                },
                githubUrl: `https://github.com/${githubRepo}/actions`,
                timestamp: Date.now()
              });
            } else {
              // Ошибка
              resolve({
                success: false,
                error: `GitHub API вернул статус ${res.statusCode}`,
                details: data,
                statusCode: res.statusCode
              });
            }
          });
        });

        req.on('error', (err) => {
          resolve({
            success: false,
            error: `Ошибка при вызове GitHub API: ${err.message}`
          });
        });

        req.write(postData);
        req.end();
      });

      if (result.success) {
        // Не записываем файл здесь - статус будет обновляться через GitHub Actions → /api/batch-status
        // В Vercel serverless функциях нельзя писать в /var/task (read-only)
        // Статус будет обновляться автоматически когда GitHub Actions начнет работу
        
        return res.json(result);
      } else {
        return res.status(500).json(result);
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[Batch Runner] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
};
