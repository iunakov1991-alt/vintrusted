# 📚 ИСТОРИЯ ВЕРСИЙ SEO МАШИНЫ

## Версия 6.0 (Pre-M1) - Vercel Era
**Дата:** До декабря 2025  
**Платформа:** Vercel  
**AI:** Groq/DeepSeek/OpenAI API  
**Статус:** Production Ready

### Характеристики:
- 21 этап pipeline
- 30+ модулей и фич
- 15 TRIZ модулей
- Только API провайдеры (нет локального AI)
- Оптимизация для Vercel

### Ограничения:
- Зависимость от интернета
- Стоимость API вызовов
- Лимиты API провайдеров

---

## Версия 7.0 - M1 Transition
**Дата:** Декабрь 2025  
**Платформа:** MacBook Air M1 8GB  
**AI:** Ollama (локальный)  
**Статус:** ✅ Готов к использованию

### Ключевые изменения:
- Переход на локальный AI (Ollama)
- Оптимизация для M1 8GB
- Dashboard управление
- Самообучение и самопочинка

### Модули (A-I):
- [A] Semantic Scanner
- [B] Strategy Generator
- [C] Prompt Engine
- [D] Evolution Engine
- [E] TRIZ Repair
- [F] Library Scanner
- [G] AI Knowledge Core
- [H] Dashboard
- [I] Performance Learner

---

## Версия 7.1 (Phi-3 TRIZ Edition) - Current
**Дата:** Декабрь 2025  
**Платформа:** MacBook Air M1 8GB  
**AI:** Ollama Phi-3  
**Статус:** Ядро готово, Dashboard в разработке

### Улучшения:
- Генерация по секциям (принцип "Дробление")
- Батчи и очередь задач
- Легкий Knowledge Core
- Оптимизация под Phi-3

### Производительность:
- Генерация страницы: 5-10 минут (вместо 8-16)
- Батч (20 страниц): 2-3 часа (вместо 3-5 часов)
- Память: < 4GB (вместо 6GB+)

---

## Текущая конфигурация (M1 + Ollama)

```json
{
  "version": "6.0",
  "features": {
    "m1Optimization": true,
    "localAI": true
  },
  "aiProviders": ["local", "deepseek", "groq"],
  "aiMaxTokens": 400
}
```

### Переменные окружения:
```bash
USE_LOCAL_AI=1
LOCAL_AI_MODEL=phi3
SEO_BUILD_CONCURRENCY=6
```

---

## Миграция с Vercel на M1

### Что изменилось:
1. ✅ Удалены SEO страницы (генерировались на Vercel)
2. ✅ Включен локальный AI (Ollama)
3. ✅ Включена M1 оптимизация
4. ✅ Переход на локальную генерацию

### Что осталось:
- VIN страницы (генерируются локально)
- Sitemap (регенерируется локально)
- Dashboard (Monster 7.0/7.1)

---

**Последнее обновление:** 2025-12-03  
**Текущая версия:** Monster 7.1 (Phi-3 TRIZ Edition)

