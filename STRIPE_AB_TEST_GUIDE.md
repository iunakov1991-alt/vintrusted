# 📊 Stripe Dashboard - Как найти A/B Test данные

**Цель:** Узнать сколько конверсий у variant "light" vs "dark"

---

## 🎯 Пошаговая инструкция:

### **ШАГ 1: Открой Payments**

```
Stripe Dashboard → Payments
или
https://dashboard.stripe.com/payments
```

---

### **ШАГ 2: Установи фильтр по датам**

```
📅 Date Range: Jan 1, 2026 - Feb 23, 2026
```

**Где:** В правом верхнем углу, кнопка фильтра дат

---

### **ШАГ 3: Export данные**

```
Кнопка "Export" (справа сверху)
→ Download CSV
```

**Важно:** Выбери все колонки или убедись что включена колонка "Metadata"

---

### **ШАГ 4: Открой CSV в Excel/Google Sheets**

После скачивания открой файл в Excel или Google Sheets

---

### **ШАГ 5: Найди колонку "Metadata"**

Колонка будет выглядеть примерно так:

```
Metadata
--------
{"vin":"1HGCM...", "ab_variant":"light", "utm_source":"google"}
{"vin":"4T1BF...", "ab_variant":"dark", "utm_source":"direct"}
{"vin":"5YJSA...", "ab_variant":"light", "utm_source":"chatgpt.com"}
...
```

---

### **ШАГ 6: Посчитай каждый вариант**

#### **В Excel:**

```excel
Колонка для "light":
=COUNTIF(Metadata:Metadata, "*light*")

Колонка для "dark":
=COUNTIF(Metadata:Metadata, "*dark*")

Колонка для "unknown":
=COUNTIF(Metadata:Metadata, "*unknown*")
```

#### **Вручную:**

Просто Ctrl+F (Find) и ищи:
- `"ab_variant":"light"` - посчитай сколько найдено
- `"ab_variant":"dark"` - посчитай сколько найдено

---

### **ШАГ 7: Скажи мне результаты!**

Напиши мне:

```
light: XX
dark: YY
unknown: ZZ (если есть)
```

---

## 🔍 АЛЬТЕРНАТИВА: Посмотреть в Stripe напрямую (без экспорта)

### **Вариант A: Через Payments → Search**

```
1. Stripe Dashboard → Payments
2. В поиск введи: metadata['ab_variant']:'light'
3. Посмотри сколько результатов (внизу страницы)
4. Повтори для 'dark'
```

---

### **Вариант B: Через Stripe CLI**

Если у тебя установлен Stripe CLI:

```bash
# Count light variants
stripe payments list \
  --created[gte]=2026-01-01 \
  --created[lte]=2026-02-23 \
  --metadata[ab_variant]=light \
  | grep "id:" | wc -l

# Count dark variants  
stripe payments list \
  --created[gte]=2026-01-01 \
  --created[lte]=2026-02-23 \
  --metadata[ab_variant]=dark \
  | grep "id:" | wc -l
```

---

## 📊 Что я сделаю когда получу данные:

Когда ты скажешь мне цифры типа:

```
light: 15
dark: 12
```

Я посчитаю:

```
✅ WINNER: LIGHT
   - Conversions: 15 vs 12
   - Difference: +3 conversions
   - Improvement: +25%
   - Recommendation: Use LIGHT variant for 100% traffic
   - Expected impact: +3 conversions per period
```

---

## ⚡ Самый быстрый способ:

**STRIPE SEARCH** (30 секунд):

```
1. Payments → Search bar
2. Введи: metadata['ab_variant']:'light'
3. Посмотри число результатов внизу
4. Введи: metadata['ab_variant']:'dark'
5. Посмотри число результатов
6. Скажи мне оба числа!
```

---

## 🎯 Жду от тебя:

Просто напиши:

```
light: XX
dark: YY
```

И я дам полный анализ какой вариант лучше! 📊
