# SEO AI Setup v2 - Прямые API ключи

## Конфигурация переменных окружения для SEO Monster v2

SEO Monster v2 использует прямые API ключи для Groq и DeepSeek с автоматическим fallback.

### Необходимые переменные окружения:

В Vercel Dashboard → Settings → Environment Variables добавьте:

```
SEO_ENABLE_AI=1
GROQ_API_KEY=your_groq_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### Опциональные переменные:

```
GROQ_MODEL=llama-3.3-70b-versatile  # по умолчанию: llama-3.3-70b-versatile
DEEPSEEK_MODEL=deepseek-chat        # по умолчанию: deepseek-chat
```

## Как это работает:

- ✅ Система сначала пытается использовать **Groq API** (быстрый, через `GROQ_API_KEY`)
- ✅ Если Groq недоступен или возвращает ошибку, автоматически переключается на **DeepSeek API** (через `DEEPSEEK_API_KEY`)
- ✅ Если оба API недоступны, используется безопасный шаблонный текст
- ✅ Все сгенерированные тексты кешируются в `data/seo/ai-cache.jsonl`

## Преимущества текущей реализации:

- ✅ Простота - не нужно настраивать endpoint
- ✅ Надежность - автоматический fallback между провайдерами
- ✅ Понятность - сразу видно, какие провайдеры используются
- ✅ Не добавляет новых rewrites в vercel.json
- ✅ Сохраняет существующую конфигурацию Vercel

## Примечание:

⚠️ **ВАЖНО**: Не коммитьте API ключи в Git! Они должны быть только в переменных окружения Vercel.

