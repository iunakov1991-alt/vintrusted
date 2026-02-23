# 🔍 Как получить точные данные по recurring платежам

**Цель:** Узнать сколько recurring платежей ($49) было от 9 Google Ads customers

---

## 🚀 Вариант 1: Запустить скрипт (2 минуты)

### Шаг 1: Найди STRIPE_SECRET_KEY

**Где искать:**
```bash
# В Vercel:
Vercel Dashboard → Settings → Environment Variables
→ STRIPE_SECRET_KEY

# Или в Stripe:
Stripe Dashboard → Developers → API keys
→ Secret key (starts with sk_live_...)
```

### Шаг 2: Экспортируй ключ

```bash
export STRIPE_SECRET_KEY="sk_live_ваш_ключ_здесь"
```

### Шаг 3: Запусти скрипт

```bash
cd /Users/dmitrii/Desktop/vintrusted
node scripts/calculate-google-ads-recurring.js
```

### Что покажет скрипт:

```
═══════════════════════════════════════════════
  GOOGLE ADS CUSTOMERS: TRIAL + RECURRING
═══════════════════════════════════════════════

👤 user1@example.com
   Trial: $1 (1/15/2026)
   GCLID: ✅ Cj0KCQiA...
   Recurring payments: 2
     - $49 (1/25/2026)
     - $49 (2/5/2026)

👤 user2@example.com
   Trial: $1 (1/16/2026)
   GCLID: ✅ Cj0KCQiA...
   Recurring payments: 1
     - $49 (1/26/2026)

... (все 9 customers)

═══════════════════════════════════════════════
  SUMMARY
═══════════════════════════════════════════════

Google Ads Customers: 9

Trial Revenue:
  Customers: 9
  Amount: $9

Recurring Revenue:
  Customers with recurring: X
  Total recurring payments: Y
  Total recurring amount: $ZZZ
  Avg payments per converted customer: N

Conversion Rate: XX%

TOTAL REVENUE: $XXX

═══════════════════════════════════════════════
  GOOGLE ADS ROI
═══════════════════════════════════════════════

Ad Spend: $526
Total Revenue: $XXX
Profit/Loss: $XXX
ROI: XX%

CPA: $58.44
Revenue per Customer: $XX

Status: ✅/❌
```

---

## 🖱️ Вариант 2: Посмотреть в Stripe Dashboard (5 минут)

### Шаг 1: Открой Stripe Dashboard

```
Stripe → Customers
→ Filters → Created: Jan 12 - Jan 30, 2026
```

### Шаг 2: Найди Google Ads customers

Ищи customers с:
- `utm_medium: cpc` в metadata
- ИЛИ `utm_source: google` в metadata

### Шаг 3: Для каждого customer посмотри payments

```
Customer → Payments
→ Посчитай сколько платежей по $49
→ Запиши даты
```

### Шаг 4: Посчитай вручную

```
Customer 1: 2 × $49 = $98
Customer 2: 1 × $49 = $49
Customer 3: 0 × $49 = $0
...
Customer 9: 3 × $49 = $147

Total recurring: $XXX
```

---

## 📊 Вариант 3: Использовать CRM Dashboard

**Если у вас есть доступ к CRM:**

```
https://vintrusted.com/crm
→ Password: vintrusted2026
→ Фильтр: Jan 12-30
→ Source: Google
→ Посмотреть recurring revenue
```

---

## 🎯 Что мне нужно от тебя:

После того как получишь данные, скажи мне:

1. **Сколько customers из 9 заплатили recurring?**
   - Пример: "5 из 9"

2. **Сколько ВСЕГО recurring платежей было?**
   - Пример: "12 платежей по $49"

3. **Сколько каждый customer заплатил?**
   - Пример:
     ```
     Customer 1: 2 × $49
     Customer 2: 1 × $49
     Customer 3: 3 × $49
     ...
     ```

**И я посчитаю точный ROI!** 📊

---

## 🔢 Пример расчета (когда получу данные):

### Предположим данные:

```
9 Google Ads customers
5 из них заплатили recurring
12 recurring платежей по $49
```

### ROI:

```
Trial Revenue:
  9 × $1 = $9

Recurring Revenue:
  12 × $49 = $588

Total Revenue:
  $9 + $588 = $597

Ad Spend: $526

Profit:
  $597 - $526 = +$71

ROI:
  ($597 / $526 - 1) × 100% = +13.5% ✅

CPA: $58.44
Revenue per Customer: $66.33
LTV: $66.33
```

---

## 💡 Быстрый способ

**Самый быстрый:** Дай мне `STRIPE_SECRET_KEY` и я запущу скрипт за 10 секунд!

```bash
# Просто скажи:
STRIPE_SECRET_KEY="sk_live_ваш_ключ"

# И я сразу выведу все данные!
```

---

**Жду данные чтобы посчитать точный ROI с recurring платежами!** 🚀
