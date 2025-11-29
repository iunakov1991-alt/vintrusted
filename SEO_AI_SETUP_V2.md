# SEO AI Setup v2 - Универсальный Endpoint

## Обновление переменных окружения для SEO Monster v2

В версии 2 используется универсальный AI endpoint вместо прямых вызовов Groq/DeepSeek.

### Вариант 1: Использовать Groq (рекомендуется - быстрый)

В Vercel Dashboard → Settings → Environment Variables добавьте:

```
SEO_ENABLE_AI=1
SEO_AI_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
SEO_AI_API_KEY=your_groq_api_key_here
SEO_AI_MODEL=llama-3.3-70b-versatile
```

Получить ключ: https://console.groq.com/keys

### Вариант 2: Использовать DeepSeek

```
SEO_ENABLE_AI=1
SEO_AI_ENDPOINT=https://api.deepseek.com/v1/chat/completions
SEO_AI_API_KEY=your_deepseek_api_key_here
SEO_AI_MODEL=deepseek-chat
```

### Вариант 3: Использовать другой OpenAI-совместимый endpoint

Любой endpoint, который поддерживает формат OpenAI API:

```
SEO_ENABLE_AI=1
SEO_AI_ENDPOINT=https://your-proxy-endpoint.com/v1/chat/completions
SEO_AI_API_KEY=your_api_key
SEO_AI_MODEL=gpt-4o-mini
```

## Как обновить существующие переменные:

1. Перейдите в Vercel Dashboard → Ваш проект → Settings → Environment Variables
2. Удалите старые переменные (если есть):
   - `GROQ_API_KEY`
   - `DEEPSEEK_API_KEY`
3. Добавьте новые переменные (выберите один из вариантов выше)
4. Сохраните и перезапустите деплой

## Преимущества v2:

- ✅ Универсальный формат - работает с любым OpenAI-совместимым API
- ✅ Легко переключаться между провайдерами
- ✅ Не добавляет новых rewrites в vercel.json
- ✅ Сохраняет существующую конфигурацию Vercel

## Примечание:

⚠️ **ВАЖНО**: Не коммитьте API ключи в Git! Они должны быть только в переменных окружения Vercel.

