# 📊 Как получить результаты A/B теста

**Варианты:** "light" vs "dark"  
**Цель:** Узнать какой вариант лучше конвертит

---

## 🎯 У вас 2 варианта первого экрана:

### Variant "light" (светлый)
```
50% пользователей видят светлую версию
```

### Variant "dark" (темный)
```
50% пользователей видят темную версию
```

**Вариант сохраняется в:**
- Cookie: `ab_variant`
- Stripe metadata: `ab_variant`
- GA4 events: `ab_variant`
- Vercel KV: `conversions:variant:{variant}:{date}`

---

## 📊 3 способа получить данные:

### **Способ 1: Через API (если задеплоен)**

```bash
curl "https://vintrusted.com/api/conversion-report?startDate=2026-01-01&endDate=2026-02-23"
```

**Если API работает, покажет:**
```json
{
  "stats": {
    "byVariant": {
      "light": 15,
      "dark": 12
    }
  }
}
```

**Статус:** ⚠️ API возможно не деплоен

---

### **Способ 2: Через Google Analytics 4**

**Шаги:**
```
1. Google Analytics → Reports → Explore
2. Create custom report
3. Dimensions: Event Name = "purchase" или "conversion"
4. Breakdown: ab_variant (custom dimension)
5. Metric: Event count
6. Date range: Jan 1 - Feb 23
```

**Должно показать:**
```
ab_variant = light: XX conversions
ab_variant = dark: YY conversions
```

---

### **Способ 3: Через Stripe Metadata (вручную)**

**Шаги:**
```
1. Stripe Dashboard → Payments
2. Filters: Jan 1 - Feb 23
3. Export to CSV
4. Колонка "Metadata" → найти "ab_variant"
5. Посчитать в Excel:
   - COUNTIF(metadata, "light")
   - COUNTIF(metadata, "dark")
```

---

## 🔍 Быстрая проверка (если есть доступ):

### **В Google Analytics:**

```
GA4 → Events → conversion
→ Add comparison: ab_variant
→ Date: Jan 1 - Feb 23
```

**Или:**

```
GA4 → Explore → Free form
→ Rows: ab_variant
→ Values: Conversions
→ Date: Jan 1 - Feb 23
```

---

## 💡 Что я могу сделать:

### **Вариант A: Исправить API и получить данные**

Если хочешь - я могу:
1. Проверить почему API не работает
2. Исправить его
3. Задеплоить
4. Получить точную статистику

**Время:** 30 минут

### **Вариант B: Ты скажешь данные из GA4/Stripe**

Скажи мне:
```
Variant light: XX conversions
Variant dark: YY conversions
```

И я посчитаю какой лучше!

---

## 📊 Формат анализа (когда получу данные):

```
VARIANT LIGHT (светлый):
  Conversions: 15
  Conversion Rate: 2.1%
  Winner: ✅

VARIANT DARK (темный):
  Conversions: 12
  Conversion Rate: 1.7%
  Winner: ❌

RECOMMENDATION:
→ Оставить только "light" версию
→ CR improvement: +24%
→ Дополнительные 3 конверсии в месяц
```

---

## 🚀 Что делать:

**Вариант 1:** Дай мне данные из GA4 или Stripe  
**Вариант 2:** Я исправлю API и достану данные сам  

**Что выбираешь?** 🎯
