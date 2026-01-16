# 🎯 Google Ads Setup Instructions for Tier-Based Conversions

## Текущая реализация (Stage 0)

**Цель:** Оптимизировать Google Ads для качественных конверсий (Premium/Medium tier), используя валидацию карт через Stripe.

---

## 📊 Conversion Goals Setup

### 1. Email Collected (PRIMARY) - Existing
- **Название:** `email_collected`
- **Label:** `W1thCPfat9cbEKq6l7NC`
- **Value:** $5.00 (fixed)
- **Category:** PRIMARY
- **Count:** ONE per conversion
- **Статус:** ✅ Уже настроена и работает

### 2. Trial Purchase (NEW - Tier-based)
Создайте **ТРИ новых конверсии** в Google Ads:

#### 2.1. Trial Purchase - Premium (NEW - PRIMARY)
- **Название:** `trial_purchase_premium`
- **Когда отправляется:** Только для карт с `tier='premium'` (credit/debit, cvc_pass)
- **Value:** $25.00
- **Category:** PRIMARY
- **Count:** ONE per conversion
- **Window:** 90 дней
- **Как настроить:**
  1. Google Ads → Tools & Settings → Conversions → + New Conversion Action
  2. Website → Manually enter a conversion event name
  3. Event name: `conversion` (gtag использует этот event)
  4. Category: Purchase
  5. Value: $25.00 (fixed)
  6. Count: One
  7. Click-through conversion window: 90 days
  8. View-through conversion window: 1 day
  9. Attribution model: Data-driven (или Last click если недостаточно данных)
  10. Include in "Conversions": YES ✅
  11. Primary goal: YES ✅
  12. **IMPORTANT:** Скопируйте Conversion ID и Label, обновите в коде

#### 2.2. Trial Purchase - Medium (NEW - SECONDARY)
- **Название:** `trial_purchase_medium`
- **Когда отправляется:** Для карт с `tier='medium'` (prepaid/unknown, но cvc_pass)
- **Value:** $5.00
- **Category:** SECONDARY (observational)
- **Count:** ONE per conversion
- **Window:** 90 дней
- **Как настроить:** То же самое, что Premium, но:
  - Value: $5.00
  - Include in "Conversions": YES ✅
  - Primary goal: NO ❌ (SECONDARY для мониторинга)

#### 2.3. Trial Purchase - Fraud (Negative - NO tracking)
- **НЕ создаем конверсию в Google Ads**
- Карты с `tier='fraud'` (cvc_fail, risk_highest) просто не отправляют событие
- Google Ads не получает сигнал о таких покупках
- **Это правильно:** не учим алгоритм на мошенниках

---

## 🔧 Code Update Required

### В `purchase-confirmation.html` (уже обновлено):

```javascript
// ✅ ЭТО УЖЕ РЕАЛИЗОВАНО В КОДЕ:
const validateResponse = await fetch(`/api/validate?pi=${paymentIntentId}`);
const validateData = await validateResponse.json();

const tier = validateData.tier; // 'premium' | 'medium' | 'fraud'
const value = validateData.value; // 25.00 | 5.00 | 0.00

if (tier === 'fraud') {
  console.log('[CONFIRMATION] 🔴 FRAUD detected - NOT sending conversion');
} else if (window.gtag) {
  window.gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/l62hCKPTndgbEKq6I7NC', // ⚠️  TODO: UPDATE THIS LABEL
    'transaction_id': setupIntentId || paymentIntentId,
    'value': value,
    'currency': 'USD'
  });
}
```

### ⚠️  TODO: Обновить Conversion Label

**После создания конверсии в Google Ads:**

1. Скопируйте новый Conversion ID/Label
2. Замените в `purchase-confirmation.html`:
   - Старый label: `l62hCKPTndgbEKq6I7NC`
   - Новый label: `YOUR_NEW_LABEL_HERE`

---

## 📈 Bidding Strategy Transition Plan

### Текущий статус (January 16, 2026):
- **Strategy:** Maximize Clicks
- **CPC:** $0.50
- **CPA (trial):** $27
- **Email conversions:** Active (PRIMARY)
- **Trial conversions:** Old (not tier-based)

### 🗓️  Roadmap:

#### ✅ Stage 0 (Сейчас - 3 дня):
1. **Deploy tier-based validation code** ✅
2. **Run `test-tier-distribution.js`** to check Premium/Medium ratio
3. **Stay on "Maximize Clicks"** for 3 days
4. **Monitor:**
   - Email conversions (должны остаться стабильными)
   - Premium vs Medium распределение
   - Если Premium < 30%, поднять Medium с $5 до $10

#### 🚀 Stage 1 (Day 4-7):
1. **Switch to "Maximize Conversion Value"** (без tROAS)
2. **Email:** $5.00 (PRIMARY)
3. **Trial Premium:** $25.00 (PRIMARY)
4. **Trial Medium:** $5.00 (SECONDARY)
5. **Monitor:**
   - CPM, CPC, CTR (не должны сильно вырасти)
   - Conversion volume (должен остаться ~тот же)
   - Cost per Premium conversion

#### 📊 Stage 2 (Day 8-14):
1. **Analyze results:**
   - Если Premium > 70%: все отлично, продолжаем
   - Если Premium 30-70%: хороший баланс, продолжаем
   - Если Premium < 30%: поднять Medium с $5 до $10
2. **Optionally add tROAS** (Target ROAS) если данных достаточно
3. **Conversion Window:** Убедитесь что установлен 90 дней

---

## 🧪 Testing: `test-tier-distribution.js`

**Запустите СРАЗУ после деплоя:**

```bash
cd /Users/dmitrii/Desktop/vintrusted
node scripts/test-tier-distribution.js
```

**Что он делает:**
1. Получает все успешные $1 PaymentIntents с 12 января
2. Для каждого применяет логику `getCardTier()`
3. Выводит статистику Premium/Medium/Fraud
4. Рекомендует, нужно ли поднимать Medium с $5 до $10

**Ожидаемый output:**
```
============================================================
📊 TIER DISTRIBUTION:
============================================================
🟢 Premium (credit/debit, cvc_pass): 8 (72.7%)
🟡 Medium (prepaid/unknown): 2 (18.2%)
🔴 Fraud (risk_highest, cvc_fail): 1 (9.1%)
============================================================

💡 RECOMMENDATIONS:
============================================================
✅ Premium > 70% → Текущие значения ($25/$5) оптимальны
   Google Ads получает достаточно сильных сигналов
============================================================
```

---

## 🔍 Monitoring Metrics

### В Google Ads:
1. **Search Lost IS (rank):** Если > 50%, поднять Medium с $5 до $10
2. **Cost per conversion (Premium):** Целевой CPA ~$30-40
3. **Conversion rate:** Должен остаться примерно тот же (~3-5%)
4. **Impression share:** Не должен сильно упасть

### В Stripe Dashboard:
1. **Prepaid card rate:** Если > 50%, рассмотреть BIN-checker (Stage 3)
2. **Chargeback rate:** Если > 2%, ужесточить валидацию

### В GTM / Google Analytics:
1. **`time_to_conversion` event:** Средний time ~2-5 минут (хороший)
2. **`super_fast_conversion` event:** Если много (<60s), это premium сигнал

---

## 🚨 Important Notes

### Что НЕ делать:
- ❌ Не менять $49 cadence (10 дней) - это не влияет на Ads
- ❌ Не убирать email как PRIMARY - он важен для volume
- ❌ Не переключаться на "Maximize Conversions" (без Value) - это хуже
- ❌ Не ставить tROAS слишком рано (нужно 50+ conversions)

### Что делать, если трафик упал > 20%:
1. Проверить `test-tier-distribution.js` - если Premium < 30%, поднять Medium до $10
2. Временно вернуться на "Maximize Clicks" на 1-2 дня
3. Проверить, что Email конверсия все еще PRIMARY
4. Убедиться что Conversion Window = 90 дней

### Что делать, если CPA вырос > $50:
1. Проверить Search Lost IS (rank) - если высокий, bid слишком низкий
2. Возможно, нужно повысить bid adjustment для mobile/desktop
3. Проверить Quality Score - если < 7, улучшить landing page relevance

---

## 📞 Support

Если что-то пошло не так:
1. Проверьте консоль браузера на `purchase-confirmation.html` - там логи tier validation
2. Проверьте `/api/validate` endpoint - он должен возвращать `{tier, value, details}`
3. Проверьте GTM Preview - событие `conversion` должно отправляться с правильным `value`
4. Проверьте Google Ads Real-time Conversions report

---

## 🎉 Expected Results (After 7 days)

- **CPA (Premium trial):** $25-35 (vs $27 current)
- **Conversion volume:** Similar or +10-20%
- **Quality Score:** +0.5-1.0 points (better signals)
- **ROAS:** Improved (premium customers более likely to pay $49)
- **Chargeback rate:** -20-30% (fewer fraud cards)

**Главное:** Google Ads будет оптимизировать для КАЧЕСТВЕННЫХ пользователей, а не просто для любых $1 платежей.
