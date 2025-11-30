# SEO Monster v2 - Проверка переменных окружения

## ✅ Текущая конфигурация (правильная)

В Vercel Dashboard → Settings → Environment Variables должны быть:

```
SEO_ENABLE_AI=1
GROQ_API_KEY=your_groq_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## ✅ Как работает код:

1. **scripts/seo/seo-ai-client.js**:
   - Использует `process.env.GROQ_API_KEY` для вызова Groq API
   - Использует `process.env.DEEPSEEK_API_KEY` для вызова DeepSeek API
   - Проверяет `process.env.SEO_ENABLE_AI` для включения/выключения AI

2. **Fallback логика**:
   - Сначала пробует Groq (быстрый)
   - Если Groq не работает → автоматически переключается на DeepSeek
   - Если оба не работают → использует безопасный шаблонный текст

## ✅ Все файлы SEO Monster используют правильные переменные:

- ✅ `seo-ai-client.js` - использует GROQ_API_KEY и DEEPSEEK_API_KEY
- ✅ `seo-master-build.js` - не использует AI переменные напрямую
- ✅ `seo-content-engine.js` - вызывает generateText из seo-ai-client.js
- ✅ Все остальные модули не зависят от AI переменных

## ✅ Проверка:

Все готово к работе! Код полностью соответствует переменным окружения в Vercel.
