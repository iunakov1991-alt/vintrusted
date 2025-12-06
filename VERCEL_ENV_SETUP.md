# 🔧 НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ДЛЯ VERCEL

## 📋 КАКИЕ ПЕРЕМЕННЫЕ НУЖНЫ

### ЛОКАЛЬНО (MacBook M1):
```bash
USE_LOCAL_AI=1          # Включает локальный AI
LOCAL_AI_MODEL=phi3     # Модель для локального AI
SEO_BUILD_CONCURRENCY=6 # Оптимально для M1
AUTO_DEPLOY=1           # Автоматическая выгрузка
```

### НА VERCEL:
```bash
SEO_BUILD_CONCURRENCY=25  # Для Vercel (больше ресурсов)
# USE_LOCAL_AI - НЕ НУЖНО (на Vercel нет Ollama)
# LOCAL_AI_MODEL - НЕ НУЖНО (на Vercel нет Ollama)
# AUTO_DEPLOY - НЕ НУЖНО (Vercel сам деплоит)
```

---

## 🎯 ЧТО ДОБАВИТЬ В VERCEL

### Обязательно:
- `SEO_BUILD_CONCURRENCY=25` (или другое значение для Vercel)

### Опционально:
- `SEO_ENABLE_AI=1` (если используешь API на Vercel)
- `DEEPSEEK_API_KEY` (обязательно для AI генерации)

### НЕ НУЖНО:
- ❌ `USE_LOCAL_AI` - только для локального MacBook
- ❌ `LOCAL_AI_MODEL` - только для локального MacBook
- ❌ `AUTO_DEPLOY` - Vercel сам деплоит

---

## 🔧 КАК ДОБАВИТЬ В VERCEL

### Вариант 1: Через веб-интерфейс (рекомендуется)

1. Иди на https://vercel.com
2. Выбери проект
3. Settings → Environment Variables
4. Добавь переменные:
   - `SEO_BUILD_CONCURRENCY` = `25`
   - `SEO_ENABLE_AI` = `1` (если используешь API)
   - `DEEPSEEK_API_KEY` = твой ключ (обязательно для AI генерации)

### Вариант 2: Через Vercel CLI

```bash
# Установи Vercel CLI (если еще нет)
npm i -g vercel

# Авторизуйся
vercel login

# Добавь переменные
vercel env add SEO_BUILD_CONCURRENCY production
# Введи значение: 25

vercel env add SEO_ENABLE_AI production
# Введи значение: 1
```

---

## 📊 ЛОГИКА РАБОТЫ

### На MacBook M1:
```javascript
// Код проверяет:
if (USE_LOCAL_AI === '1') {
  // Использует локальный AI (Ollama) - отключен
} else {
  // Использует API (DeepSeek)
}
```

### На Vercel:
```javascript
// USE_LOCAL_AI не установлен или = '0'
// Код автоматически использует API (DeepSeek)
```

**Вывод:** На Vercel локальный AI не используется, поэтому `USE_LOCAL_AI` не нужен.

---

## ✅ ИТОГОВАЯ РЕКОМЕНДАЦИЯ

### В Vercel добавь только:
```bash
SEO_BUILD_CONCURRENCY=25
SEO_ENABLE_AI=1
DEEPSEEK_API_KEY=твой_ключ
```

### В .env.local (локально):
```bash
# Локальный AI отключен (Ollama больше не используется)
SEO_ENABLE_AI=1
DEEPSEEK_API_KEY=твой_ключ
SEO_BUILD_CONCURRENCY=6
AUTO_DEPLOY=1
```

**Результат:**
- На MacBook: DeepSeek API
- На Vercel: DeepSeek API

---

## 🔍 ПРОВЕРКА

### Локально:
```bash
# Проверь .env.local
cat .env.local | grep USE_LOCAL_AI
# Должно быть: USE_LOCAL_AI=1
```

### На Vercel:
```bash
# Через Vercel CLI
vercel env ls

# Или через веб-интерфейс
# Settings → Environment Variables
```

---

## 📝 ПРИМЕЧАНИЯ

1. **`.env.local` не попадает в git** - это правильно, он только локально
2. **Vercel переменные** - настраиваются отдельно через веб или CLI
3. **Разные значения** - нормально (6 для M1, 25 для Vercel)
4. **Автоматическое определение** - код сам определяет, где запущен
