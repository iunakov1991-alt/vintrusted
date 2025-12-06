# 🚀 БЫСТРЫЙ СТАРТ: Самообучение MONSTER 8.0

**Дата:** 2025-12-06

---

## ✅ САМООБУЧЕНИЕ РАБОТАЕТ АВТОМАТИЧЕСКИ

### **Как это работает:**

1. **Генерируете статью** → `build_topic_page.sh`
2. **Валидация находит ошибки** → логируются в `data/quality_logs/quality_errors.jsonl`
3. **Метрики агрегируются** → `data/rl_aggregates.json`
4. **Стратегия обновляется** → `config/learned_strategy.json`
5. **Следующая статья** → применяет обновлённую стратегию автоматически

**Всё происходит автоматически в `build_topic_page.sh`!**

---

## 📊 ПРОВЕРКА РАБОТЫ

### **1. Проверить логи ошибок:**
```bash
tail -20 data/quality_logs/quality_errors.jsonl
```

### **2. Проверить агрегаты:**
```bash
cat data/rl_aggregates.json | jq '.metrics'
```

### **3. Проверить стратегию:**
```bash
cat config/learned_strategy.json | jq '.article_type_weights'
```

### **4. Проверить применение стратегии:**
```bash
node scripts/build_article_spec.js --topic-file data/topic.json | jq '.meta.strategy_applied, .meta.strategy_factor'
```

---

## 🎯 ПРИМЕР

### **До самообучения:**
```json
{
  "article_type_weights": {
    "dmv_state_guide": 1.0
  }
}
```

### **После ошибок (2 MAJOR ошибки):**
```json
{
  "article_type_weights": {
    "dmv_state_guide": 0.8  // ← Уменьшен вес из-за ошибок
  }
}
```

### **Результат:**
- Следующие статьи типа `dmv_state_guide` получат **меньшие требования к длине блоков**
- Это снизит вероятность ошибок валидации
- Система автоматически адаптируется к проблемным типам

---

## 🔧 РУЧНОЕ УПРАВЛЕНИЕ

### **Обновить метрики вручную:**
```bash
node scripts/rl_ingest_metrics.js
```

### **Обновить стратегию вручную:**
```bash
node scripts/rl_update_strategy.js
```

### **Сбросить стратегию:**
```bash
cat > config/learned_strategy.json << 'EOF'
{
  "version": "1.0",
  "updated_at": null,
  "article_type_weights": {},
  "audience_weights": {},
  "language_weights": {},
  "zone_priority": {},
  "block_weights": {}
}
EOF
```

---

## ✅ ИТОГ

**Самообучение полностью интегрировано и работает автоматически!**

- ✅ Логирование ошибок
- ✅ Агрегация метрик
- ✅ Обновление стратегии
- ✅ Применение к генерации

**Система учится на ошибках и улучшает качество автоматически!** 🚀

