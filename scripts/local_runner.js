/**
 * MONSTER 8.0 Local Runner
 * - Поллинг /api/monster/status на Vercel
 * - queued -> running -> запускает оркестратор -> финал success/failed (если оркестратор сам не финализировал)
 *
 * Env:
 *   VERCEL_URL=https://vintrusted.com
 *   MONSTER_INTERNAL_SECRET=...
 *
 * Запуск: npm run monster:runner
 */

const { spawn } = require('child_process');

const VERCEL_URL = process.env.VERCEL_URL;
const SECRET = process.env.MONSTER_INTERNAL_SECRET;
const POLL_MS = 10_000;

if (!VERCEL_URL || !SECRET) {
  console.error('[runner] Missing VERCEL_URL or MONSTER_INTERNAL_SECRET');
  process.exit(1);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function postBatchUpdate(batchId, patch) {
  const res = await fetch(`${VERCEL_URL}/api/batch-status-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-MONSTER-SECRET': SECRET,
    },
    body: JSON.stringify({ batchId, patch }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[runner] batch-status-update failed', res.status, text);
  }
}

function runOrchestrator(batchId) {
  console.log('[runner] starting orchestrator for', batchId);
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/build_topics_batch_parallel.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        BATCH_ID: batchId,
        VERCEL_URL,
        MONSTER_INTERNAL_SECRET: SECRET,
      },
    });
    child.on('exit', (code) => {
      console.log('[runner] orchestrator exited with code', code);
      resolve(code ?? 1);
    });
    child.on('error', (err) => {
      console.error('[runner] orchestrator spawn error', err);
      resolve(1);
    });
  });
}

async function loop() {
  while (true) {
    try {
      console.log('[runner] polling status...');
      const status = await fetchJSON(`${VERCEL_URL}/api/monster/status`);
      const current = status.current;

      if (!current || current.status !== 'queued') {
        console.log('[runner] no queued batch, sleep 10s');
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }

      const batchId = current.batchId || current.id;
      if (!batchId) {
        console.warn('[runner] queued batch without id, sleep 10s');
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }

      console.log('[runner] detected queued batch', batchId, '→ set running');
      await postBatchUpdate(batchId, { status: 'running', startedAt: new Date().toISOString() });

      const code = await runOrchestrator(batchId);

      // Проверяем актуальный статус: если уже финальный — не трогаем
      try {
        const st2 = await fetchJSON(`${VERCEL_URL}/api/monster/status`);
        const cur2 = st2.current;
        if (!cur2 || (cur2.batchId || cur2.id) !== batchId) {
          console.log('[runner] batch changed/cleared, skip final update');
        } else if (['success', 'failed', 'stopped'].includes(cur2.status)) {
          console.log('[runner] final status already set =', cur2.status);
        } else {
          const final = code === 0 ? 'success' : 'failed';
          console.log('[runner] setting final status', final);
          await postBatchUpdate(batchId, {
            status: final,
            finishedAt: new Date().toISOString(),
            error: code === 0 ? null : `exit ${code}`,
          });
        }
      } catch (err) {
        console.error('[runner] finalization check failed', err.message || err);
      }
    } catch (e) {
      console.error('[runner] loop error', e);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

loop().catch((e) => {
  console.error('[runner] fatal', e);
  process.exit(1);
});

