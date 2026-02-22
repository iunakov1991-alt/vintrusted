import { kv } from '@vercel/kv';

// ═══════════════════════════════════════════════════════════════════════
// MONITORING & ALERTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════
// Отслеживание критичных метрик и отправка alerts при проблемах

/**
 * Уровни severity для alerts
 */
export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Типы событий для мониторинга
 */
export const EVENT_TYPE = {
  API_ERROR: 'api_error',
  WEBHOOK_ERROR: 'webhook_error',
  CLEARVIN_ERROR: 'clearvin_error',
  KV_ERROR: 'kv_error',
  STRIPE_ERROR: 'stripe_error',
  PAYMENT_FAILED: 'payment_failed',
  DISPUTE_CREATED: 'dispute_created',
  QUOTA_EXHAUSTED: 'quota_exhausted',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  CONVERSION_SENT: 'conversion_sent',
};

/**
 * Логирование события с метриками
 * @param {string} eventType - Тип события (из EVENT_TYPE)
 * @param {string} severity - Уровень severity (из SEVERITY)
 * @param {Object} data - Дополнительные данные
 */
export async function logEvent(eventType, severity, data = {}) {
  const timestamp = new Date().toISOString();
  const event = {
    type: eventType,
    severity,
    timestamp,
    ...data,
  };

  // Console logging с emoji для быстрой визуальной идентификации
  const emoji = {
    [SEVERITY.INFO]: 'ℹ️',
    [SEVERITY.WARNING]: '⚠️',
    [SEVERITY.ERROR]: '❌',
    [SEVERITY.CRITICAL]: '🚨',
  }[severity] || 'ℹ️';

  console.log(`${emoji} [MONITOR] ${eventType}:`, JSON.stringify(event));

  // Сохраняем в KV для dashboard/analytics
  try {
    const metricsKey = `metrics:${eventType}:${timestamp.split('T')[0]}`; // Daily metrics
    await kv.hincrby(metricsKey, 'count', 1);
    await kv.expire(metricsKey, 60 * 60 * 24 * 30); // 30 days TTL

    // Для критичных событий - сохраняем полные данные
    if (severity === SEVERITY.CRITICAL || severity === SEVERITY.ERROR) {
      const alertKey = `alert:${eventType}:${Date.now()}`;
      await kv.set(alertKey, event, { ex: 60 * 60 * 24 * 7 }); // 7 days
    }
  } catch (kvError) {
    // Если KV недоступен - просто логируем, не падаем
    console.error('[MONITOR] Failed to save metrics to KV:', kvError.message);
  }

  // ✅ CRITICAL/ERROR events → отправляем alert
  if (severity === SEVERITY.CRITICAL || severity === SEVERITY.ERROR) {
    await sendAlert(event);
  }

  return event;
}

/**
 * Отправка alert (Telegram, Slack, Email, etc.)
 * @param {Object} event - Событие для alert
 */
async function sendAlert(event) {
  try {
    // Проверяем rate limiting для alerts (не спамим)
    const alertRateLimitKey = `alert:ratelimit:${event.type}`;
    const lastAlert = await kv.get(alertRateLimitKey);
    
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - new Date(lastAlert).getTime();
      // Не чаще чем 1 alert каждые 5 минут для одного типа события
      if (timeSinceLastAlert < 5 * 60 * 1000) {
        console.log('[MONITOR] Alert rate limited:', event.type);
        return;
      }
    }

    // Telegram Bot Alert (если настроен)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramBotToken && telegramChatId) {
      const message = formatTelegramMessage(event);
      
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: message,
              parse_mode: 'Markdown',
            }),
          }
        );

        if (response.ok) {
          console.log('[MONITOR] ✅ Telegram alert sent:', event.type);
          await kv.set(alertRateLimitKey, new Date().toISOString(), { ex: 60 * 5 });
        } else {
          console.error('[MONITOR] ❌ Telegram alert failed:', await response.text());
        }
      } catch (telegramError) {
        console.error('[MONITOR] Telegram error:', telegramError.message);
      }
    } else {
      console.log('[MONITOR] ⚠️  Telegram not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)');
    }

    // TODO: Добавить другие каналы (Slack, Email, PagerDuty, etc.)

  } catch (error) {
    console.error('[MONITOR] Failed to send alert:', error);
  }
}

/**
 * Форматирование сообщения для Telegram
 */
function formatTelegramMessage(event) {
  const emoji = {
    [SEVERITY.CRITICAL]: '🚨',
    [SEVERITY.ERROR]: '❌',
    [SEVERITY.WARNING]: '⚠️',
    [SEVERITY.INFO]: 'ℹ️',
  }[event.severity] || 'ℹ️';

  let message = `${emoji} *${event.severity.toUpperCase()}*: ${event.type}\n`;
  message += `📅 ${event.timestamp}\n\n`;

  // Добавляем специфичные детали в зависимости от типа события
  if (event.error) {
    message += `❌ Error: \`${event.error}\`\n`;
  }
  if (event.email) {
    message += `👤 Email: ${event.email.substring(0, 20)}...\n`;
  }
  if (event.customer_id) {
    message += `🆔 Customer: ${event.customer_id}\n`;
  }
  if (event.vin) {
    message += `🚗 VIN: ${event.vin}\n`;
  }
  if (event.amount) {
    message += `💰 Amount: $${event.amount}\n`;
  }
  if (event.ip) {
    message += `🌐 IP: ${event.ip}\n`;
  }

  // Добавляем действия (если нужны)
  if (event.severity === SEVERITY.CRITICAL) {
    message += `\n⚡ *Action Required*`;
  }

  return message;
}

/**
 * Мониторинг метрик за период
 * @param {string} eventType - Тип события
 * @param {number} days - Количество дней для анализа
 */
export async function getMetrics(eventType, days = 7) {
  const metrics = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const metricsKey = `metrics:${eventType}:${dateStr}`;
    const count = await kv.hget(metricsKey, 'count');
    
    metrics.push({
      date: dateStr,
      count: count || 0,
    });
  }

  return metrics.reverse(); // От старых к новым
}

/**
 * Получение последних alerts
 * @param {number} limit - Количество alerts
 */
export async function getRecentAlerts(limit = 10) {
  try {
    // Получаем все alert keys
    const keys = await kv.keys('alert:*');
    
    // Сортируем по timestamp (в имени ключа)
    const sortedKeys = keys
      .sort((a, b) => {
        const timestampA = parseInt(a.split(':').pop());
        const timestampB = parseInt(b.split(':').pop());
        return timestampB - timestampA;
      })
      .slice(0, limit);

    // Получаем данные
    const alerts = await Promise.all(
      sortedKeys.map(async (key) => await kv.get(key))
    );

    return alerts.filter(Boolean);
  } catch (error) {
    console.error('[MONITOR] Failed to get recent alerts:', error);
    return [];
  }
}

/**
 * Helper для быстрого логирования ошибок API
 */
export async function logApiError(endpoint, error, context = {}) {
  return logEvent(EVENT_TYPE.API_ERROR, SEVERITY.ERROR, {
    endpoint,
    error: error.message,
    stack: error.stack?.substring(0, 500),
    ...context,
  });
}

/**
 * Helper для логирования ошибок webhook
 */
export async function logWebhookError(webhookType, error, context = {}) {
  return logEvent(EVENT_TYPE.WEBHOOK_ERROR, SEVERITY.ERROR, {
    webhook_type: webhookType,
    error: error.message,
    stack: error.stack?.substring(0, 500),
    ...context,
  });
}

/**
 * Helper для мониторинга critical business events
 */
export async function logBusinessEvent(eventType, severity, data) {
  return logEvent(eventType, severity, data);
}

export default {
  logEvent,
  logApiError,
  logWebhookError,
  logBusinessEvent,
  getMetrics,
  getRecentAlerts,
  SEVERITY,
  EVENT_TYPE,
};
