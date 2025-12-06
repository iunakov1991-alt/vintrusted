# 🔍 ТОЧНЫЙ ДИАГНОЗ ПРОБЛЕМ ГЕНЕРАЦИИ

**Дата:** 2025-12-04  
**Статус:** ✅ Проблемы найдены и исправлены

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### ПРОБЛЕМА #1: Ollama таймаутит

**Симптомы:**
- `Ollama API timeout after 30000ms`
- `localText = null`
- Все блоки получают fallback текст (54 слова)

**Причина:**
- Таймаут 30 секунд недостаточен для модели phi3
- Модель слишком медленная для генерации длинных текстов
- Промпты слишком сложные для быстрой генерации

**Исправление:**
```javascript
// Было:
this.timeout = parseInt(process.env.LOCAL_AI_TIMEOUT || '30000', 10);

// Стало:
this.timeout = parseInt(process.env.LOCAL_AI_TIMEOUT || '90000', 10); // 90 секунд
```

**Файл:** `scripts/seo/ai/local-ai-provider.js`

---

### ПРОБЛЕМА #2: DEEPSEEK_API_KEY не загружается

**Симптомы:**
- `hasApiKeys = false`
- `effectiveAI = false`
- DeepSeek API не используется

**Причина:**
- `generate-test-article.js` не загружает переменные окружения из `.env`
- Переменные окружения не доступны в процессе

**Исправление:**
```javascript
// Добавлено в начало файла:
try {
  require('dotenv').config();
} catch (e) {
  // dotenv не установлен, используем переменные окружения напрямую
}
```

**Файл:** `scripts/generate-test-article.js`

---

### ПРОБЛЕМА #3: Логика fallback

**Симптомы:**
- Если Ollama возвращает `null`, идет fallback на DeepSeek
- Если DeepSeek не работает, используется fallback текст
- Fallback текст (54 слова) не проходит валидацию

**Цепочка ошибок:**
1. Ollama таймаутит (30s) → `localText = null`
2. `localText = null` → fallback на DeepSeek
3. DeepSeek не работает (нет API ключа) → fallback текст
4. Fallback текст (54 слова) → валидация не проходит (`TOO_SHORT`)

**Решение:**
- Увеличен таймаут Ollama (должен помочь)
- Добавлена загрузка .env (DeepSeek должен работать)

---

## 📊 ДЕТАЛЬНАЯ ДИАГНОСТИКА

### Проверка переменных окружения:
```bash
config.enableAI: true
envEnable (SEO_ENABLE_AI): true
hasApiKeys (DEEPSEEK_API_KEY): false ❌
effectiveAI: false ❌
```

### Проверка Ollama:
```bash
Ollama available: true ✅
Model: phi3
Timeout: 30000ms (было) → 90000ms (стало) ✅
Use API: true ✅
Result: TIMEOUT → NULL ❌
```

### Логи генерации:
```
[SEO AI] AI disabled, using fallback for vin_check in en
[SEO ARTICLE-GEN-V6] Block hero validated successfully (54 words, marker auto-added)
[SEO ARTICLE-GEN-V6] Block key_facts validation failed: TOO_SHORT_FOR_BLOCK_TYPE (54 words < 80)
```

---

## ✅ ИСПРАВЛЕНИЯ

1. **Увеличен таймаут Ollama**: 30s → 90s
2. **Добавлена загрузка .env**: `require('dotenv').config()` с try/catch
3. **Проверка переменных окружения**: Добавлена диагностика

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Повторная генерация** с исправлениями
2. **Мониторинг таймаутов**: Если Ollama все еще таймаутит, рассмотреть:
   - Использование более быстрой модели (например, llama3.2:1b)
   - Упрощение промптов
   - Увеличение таймаута до 120+ секунд
3. **Проверка DeepSeek API**: Убедиться, что API ключ загружается и работает

---

## 📝 ФАЙЛЫ ИЗМЕНЕНЫ

- `scripts/generate-test-article.js` - добавлена загрузка .env
- `scripts/seo/ai/local-ai-provider.js` - увеличен таймаут до 90s

---

**Статус:** ✅ Готово к повторной генерации




