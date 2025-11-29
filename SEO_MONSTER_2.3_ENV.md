# SEO Monster 2.3 - Переменные окружения

## ✅ Обязательные переменные (уже настроены):

```
SEO_ENABLE_AI=1
GROQ_API_KEY=your_groq_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## ⚙️ Опциональные переменные (с дефолтами):

### AI модели (опционально):
```
GROQ_MODEL=llama-3.3-70b-versatile          # дефолт: llama-3.3-70b-versatile
DEEPSEEK_MODEL=deepseek-chat                 # дефолт: deepseek-chat
```

### Конкурентность билда (НОВАЯ в 2.3, опционально):
```
SEO_BUILD_CONCURRENCY=8                      # дефолт: 8
```

**Рекомендации для SEO_BUILD_CONCURRENCY:**
- Для Vercel Pro: 8-12 (безопасно)
- Если билд слишком долгий: увеличьте до 12-16
- Если билд падает по памяти: уменьшите до 4-6

## 📝 Итого:

**Новые переменные НЕ требуются!** 

SEO Monster 2.3 будет работать с существующими переменными:
- `SEO_ENABLE_AI=1`
- `GROQ_API_KEY=...`
- `DEEPSEEK_API_KEY=...`

Переменная `SEO_BUILD_CONCURRENCY` опциональна - если не установлена, используется дефолт 8.

## 🔧 Если хотите настроить конкурентность:

В Vercel Dashboard → Settings → Environment Variables добавьте:
```
SEO_BUILD_CONCURRENCY=10
```

Это ускорит билд, но увеличит нагрузку на память. Для 15000 страниц значение 8-10 оптимально.
