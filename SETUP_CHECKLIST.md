# ✅ ЧЕКЛИСТ НАСТРОЙКИ ЛОКАЛЬНОГО AI НА M1

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### 1. Установить Ollama (5 минут)

```bash
# Вариант 1: Через Homebrew (рекомендуется)
brew install ollama

# Вариант 2: Скачать с сайта
# https://ollama.ai/download
```

**Проверка:**
```bash
ollama --version
# Должно показать версию
```

---

### 2. Загрузить модель (5-10 минут)

```bash
# Легкая модель (2 GB) - рекомендуется для 8GB MacBook
ollama pull phi3

# Или более мощная (4-5 GB) - если есть 16GB+
ollama pull llama3.1:8b
```

**Проверка:**
```bash
ollama list
# Должна быть видна загруженная модель
```

**Тест:**
```bash
ollama run phi3 "Привет, как дела?"
# Должен ответить
```

---

### 3. Настроить переменные окружения (2 минуты)

Добавь в `.env.local`:

```bash
# Локальный AI
USE_LOCAL_AI=1
LOCAL_AI_MODEL=phi3

# Оптимизация для M1
SEO_BUILD_CONCURRENCY=6

# Автоматическая выгрузка на Vercel (опционально)
AUTO_DEPLOY=1
VERCEL_DEPLOY_HOOK=твой_webhook_url
```

**Проверка:**
```bash
cat .env.local | grep USE_LOCAL_AI
# Должно показать USE_LOCAL_AI=1
```

---

### 4. Установить зависимости (если нужно)

```bash
# Проверь, есть ли node-fetch (для vercel-deploy)
npm list node-fetch

# Если нет, установи (обычно не нужно, fetch встроен в Node 18+)
# npm install node-fetch
```

---

### 5. Запустить билд с garbage collection (рекомендуется)

Для лучшей очистки памяти запускай с флагом:

```bash
node --expose-gc scripts/seo/seo-master-build.js
```

Или добавь в `package.json`:

```json
{
  "scripts": {
    "seo-build": "node --expose-gc scripts/seo/seo-master-build.js"
  }
}
```

Тогда можно запускать:
```bash
npm run seo-build
```

---

## 🔍 ПРОВЕРКА ГОТОВНОСТИ

### Быстрая проверка:

```bash
# 1. Ollama установлен?
ollama --version

# 2. Модель загружена?
ollama list | grep phi3

# 3. Модель работает?
ollama run phi3 "test"

# 4. Переменные окружения настроены?
cat .env.local | grep USE_LOCAL_AI

# 5. Код на месте?
ls scripts/seo/ai/local-ai-provider.js
ls scripts/seo/utils/m1-optimizer.js
```

**Если все команды работают - готово!**

---

## 🚀 ЗАПУСК

```bash
# Обычный запуск
node scripts/seo/seo-master-build.js

# Или с garbage collection (лучше для памяти)
node --expose-gc scripts/seo/seo-master-build.js
```

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема: "Ollama not found"
**Решение:**
```bash
# Проверь установку
which ollama

# Если нет, установи
brew install ollama

# Или добавь в PATH
export PATH="/usr/local/bin:$PATH"
```

### Проблема: "Model not found"
**Решение:**
```bash
# Проверь загруженные модели
ollama list

# Если phi3 нет, загрузи
ollama pull phi3
```

### Проблема: "Out of memory"
**Решение:**
- Используй более легкую модель: `phi3` вместо `llama3.1:8b`
- Уменьши `SEO_BUILD_CONCURRENCY` до 4
- Закрой другие приложения

### Проблема: "Garbage collection not available"
**Решение:**
- Запускай с флагом: `node --expose-gc scripts/seo/seo-master-build.js`
- Или добавь в `package.json` скрипт

---

## 📊 ЧТО ДОЛЖНО РАБОТАТЬ

После настройки:

1. ✅ Ollama установлен и работает
2. ✅ Модель загружена и отвечает
3. ✅ Переменные окружения настроены
4. ✅ Билд запускается
5. ✅ Локальный AI используется (видно в логах: "Trying local AI first...")
6. ✅ Память очищается после билда
7. ✅ Автоматическая выгрузка на Vercel (если настроена)

---

## 🎯 МИНИМАЛЬНАЯ НАСТРОЙКА

Если хочешь быстро протестировать:

```bash
# 1. Установи Ollama
brew install ollama

# 2. Загрузи модель
ollama pull phi3

# 3. Добавь в .env.local
echo "USE_LOCAL_AI=1" >> .env.local
echo "LOCAL_AI_MODEL=phi3" >> .env.local

# 4. Запусти
node --expose-gc scripts/seo/seo-master-build.js
```

**Готово!** Все остальное работает автоматически.

---

## 📝 ИТОГОВЫЙ ЧЕКЛИСТ

- [ ] Ollama установлен (`ollama --version`)
- [ ] Модель загружена (`ollama pull phi3`)
- [ ] Модель работает (`ollama run phi3 "test"`)
- [ ] `.env.local` настроен (`USE_LOCAL_AI=1`)
- [ ] Код на месте (проверено автоматически)
- [ ] Билд запускается (`node scripts/seo/seo-master-build.js`)
- [ ] Локальный AI используется (видно в логах)

**Если все галочки - готово к работе!** 🚀







