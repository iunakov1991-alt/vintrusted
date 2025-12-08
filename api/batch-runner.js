/**
 * MONSTER 8.0 Batch Runner API
 * Запуск и остановка партий через GitHub Actions
 */

const https = require('https');
const path = require('path');
const kvBatchStorePath = path.join(__dirname, '..', 'lib', 'kvBatchStore');
const { getCurrentBatch, setCurrentBatch, createBatchStatus, clearCurrentBatch } = require(kvBatchStorePath);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Получаем путь из query параметра (Vercel передает через ?path=)
    const pathParam = req.query.path || '';
    
    // POST /api/batch-runner/start - запустить партию
    if (req.method === 'POST' && (!pathParam || pathParam === 'start')) {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO || 'iunakov1991-alt/vintrusted';
      const workflowFile = 'monster8-batch-scheduler.yml';

      if (!githubToken) {
        return res.status(400).json({
          success: false,
          error: 'GITHUB_TOKEN не настроен. Добавьте токен в Vercel Environment Variables.'
        });
      }

      // Проверяем, нет ли уже запущенной партии
      let current;
      try {
        current = await getCurrentBatch();
        if (current && (current.status === 'running' || current.status === 'queued')) {
          return res.status(409).json({
            success: false,
            error: 'batch_already_running',
            message: `Партия уже запущена (status: ${current.status}, id: ${current.id})`
          });
        }
      } catch (err) {
        // Если KV не настроен, продолжаем (для совместимости)
        console.warn('[Batch Runner] Could not check current batch:', err.message);
      }

      // Определяем параметры
      const body = req.body || {};
      const forcePhase = body.phase || 'auto';
      const forceLength = body.length || 'auto';

      // Создаем новый статус партии
      const newBatch = createBatchStatus({
        phase: forcePhase,
        length: forceLength,
        status: 'queued',
        runner: 'github_actions'
      });

      // Сохраняем в KV как current
      try {
        await setCurrentBatch(newBatch);
      } catch (err) {
        // Если KV не настроен, продолжаем без сохранения (для совместимости)
        console.warn('[Batch Runner] Could not save batch to KV:', err.message);
      }

      // 🚀 ЗАПУСКАЕМ GITHUB ACTIONS WORKFLOW
      const githubApiUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflowFile}/dispatches`;
      
      const postData = JSON.stringify({
        ref: 'main',
        inputs: {
          force_phase: forcePhase,
          force_length: forceLength,
          batch_id: newBatch.id  // ⚡ ПЕРЕДАЁМ ID ПАРТИИ В WORKFLOW
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
              resolve({
                success: true,
                message: '✅ Партия запущена через GitHub Actions!',
                id: newBatch.id,
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
        return res.json(result);
      } else {
        // Если GitHub Actions не запустился, очищаем current
        try {
          await clearCurrentBatch();
        } catch (err) {
          // Игнорируем ошибки очистки
        }
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
