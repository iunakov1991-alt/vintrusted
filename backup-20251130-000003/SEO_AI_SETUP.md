# SEO AI Setup Instructions

## API Keys Configuration

Для работы AI-генерации контента в SEO-системе необходимо добавить следующие переменные окружения в Vercel:

### Groq API (Primary - быстрый)
```
GROQ_API_KEY=your_groq_api_key_here
```

Получить ключ: https://console.groq.com/keys

### DeepSeek API (Fallback)
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### Включение AI
```
SEO_ENABLE_AI=1
```

## Как добавить в Vercel:

1. Перейдите в Vercel Dashboard → Ваш проект → Settings → Environment Variables
2. Добавьте все три переменные с вашими реальными API ключами:
   - `GROQ_API_KEY` = ваш Groq API ключ
   - `DEEPSEEK_API_KEY` = ваш DeepSeek API ключ
   - `SEO_ENABLE_AI` = `1`
3. Выберите окружения: Production, Preview, Development (или только Production)
4. Сохраните и перезапустите деплой

## Как это работает:

- Система сначала пытается использовать **Groq API** (быстрый)
- Если Groq недоступен, используется **DeepSeek API** как fallback
- Если оба API недоступны, используется безопасный шаблонный текст
- Все сгенерированные тексты кешируются в `data/seo/ai-cache.jsonl`

## Модели:

- **Groq**: `llama-3.3-70b-versatile` (быстрая модель)
- **DeepSeek**: `deepseek-chat` (качественная модель)

## Примечание:

⚠️ **ВАЖНО**: Не коммитьте API ключи в Git! Они должны быть только в переменных окружения Vercel.

