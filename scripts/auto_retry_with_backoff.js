#!/usr/bin/env node
/**
 * Автоматический retry с умным экспоненциальным backoff
 * Адаптируется к типу ошибки
 */

const MAX_RETRIES = 3;

/**
 * Определение типа ошибки из сообщения или кода
 */
function getErrorType(error) {
  const message = (error.message || '').toLowerCase();
  const code = error.code || '';
  
  if (message.includes('timeout') || message.includes('timed out') || code === 'ETIMEDOUT') {
    return 'TIMEOUT';
  }
  
  if (message.includes('rate limit') || message.includes('429') || code === '429') {
    return 'RATE_LIMIT';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  
  if (message.includes('network') || message.includes('econnrefused') || code === 'ECONNREFUSED') {
    return 'NETWORK_ERROR';
  }
  
  return 'UNKNOWN';
}

/**
 * Вычисление задержки перед retry на основе типа ошибки и попытки
 */
function getRetryDelay(attempt, errorType) {
  // VALIDATION_ERROR - немедленный retry (проблема в промпте, не в сети)
  if (errorType === 'VALIDATION_ERROR') {
    return 0;
  }
  
  // RATE_LIMIT - медленный экспоненциальный backoff
  if (errorType === 'RATE_LIMIT') {
    return 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
  }
  
  // TIMEOUT - средний экспоненциальный backoff
  if (errorType === 'TIMEOUT') {
    return 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
  }
  
  // NETWORK_ERROR - быстрый экспоненциальный backoff
  if (errorType === 'NETWORK_ERROR') {
    return 500 * Math.pow(2, attempt - 1); // 0.5s, 1s, 2s
  }
  
  // UNKNOWN - стандартный экспоненциальный backoff
  return 500 * Math.pow(2, attempt - 1);
}

/**
 * Обертка для async функций с автоматическим retry
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const onRetry = options.onRetry || (() => {});
  const shouldRetry = options.shouldRetry || (() => true);
  
  let lastError;
  let lastErrorType = 'UNKNOWN';
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      return { success: true, result, attempts: attempt };
    } catch (error) {
      lastError = error;
      lastErrorType = getErrorType(error);
      
      // Проверяем, нужно ли делать retry
      if (!shouldRetry(error, attempt)) {
        return { success: false, error, attempts: attempt, errorType: lastErrorType };
      }
      
      // Если это последняя попытка - не делаем задержку
      if (attempt > maxRetries) {
        break;
      }
      
      // Вычисляем задержку
      const delay = getRetryDelay(attempt, lastErrorType);
      
      // Вызываем callback перед retry
      onRetry(error, attempt, delay, lastErrorType);
      
      // Ждем перед следующей попыткой
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries + 1,
    errorType: lastErrorType
  };
}

/**
 * Пример использования
 */
async function example() {
  const result = await withRetry(
    async () => {
      // Ваша функция, которая может упасть
      const response = await fetch('https://api.example.com/data');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      maxRetries: 3,
      onRetry: (error, attempt, delay, errorType) => {
        console.log(`[RETRY] Attempt ${attempt}, error: ${errorType}, delay: ${delay}ms`);
      },
      shouldRetry: (error, attempt) => {
        // Не делаем retry для 404 ошибок
        if (error.message.includes('404')) return false;
        return true;
      }
    }
  );
  
  if (result.success) {
    console.log('Success!', result.result);
  } else {
    console.error('Failed after', result.attempts, 'attempts:', result.error.message);
  }
}

module.exports = { withRetry, getRetryDelay, getErrorType };

if (require.main === module) {
  example().catch(console.error);
}

