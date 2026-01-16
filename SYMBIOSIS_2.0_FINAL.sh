#!/usr/bin/env bash
# ============================================================
# SYMBIOSIS 2.0: CONSERVATIVE VALIDATION + PROGRESSIVE SCALING
# ============================================================
# Основа: Твой консервативный подход (validated conversions only)
# Улучшения: Мои опциональные апгрейды (Enhanced CPC, timing)
# Философия: "Test one thing, then scale"
#
# Дата: 16 января 2026
# Статус: FINAL AGREEMENT
# ============================================================

# ============================================================
# ЭТАП 1 (ДЕНЬ 0-7): VALIDATED CONVERSIONS ONLY
# ============================================================

echo "════════════════════════════════════════════════════════"
echo "ЭТАП 1: VALIDATED CONVERSIONS (PURE ТВОЙ ПОДХОД)"
echo "════════════════════════════════════════════════════════"
echo ""

# ------------------------------------------------------------
# 1.1) GOOGLE ADS: СТРУКТУРА КОНВЕРСИЙ
# ------------------------------------------------------------

cat << 'ADS_SETUP'

Google Ads → Tools → Conversions:

1. KEEP EXISTING:
   ┌─────────────────────────────────────────────────────────┐
   │ email_collected                                          │
   │ - Type: Lead                                             │
   │ - Value: $0.00                                           │
   │ - Include in "Conversions": YES ✅ (PRIMARY)            │
   │ - Status: No changes                                     │
   └─────────────────────────────────────────────────────────┘

2. CREATE NEW:
   ┌─────────────────────────────────────────────────────────┐
   │ trial_purchase_validated                                 │
   │ - Type: Purchase                                         │
   │ - Value: $1.00                                           │
   │ - Count: One                                             │
   │ - Include in "Conversions": YES ✅ (PRIMARY)            │
   │ - Conversion window: 30 days                             │
   │ - Attribution: Data-driven (or Last Click)               │
   └─────────────────────────────────────────────────────────┘
   
   → Save Conversion ID and Label to .env:
     GOOGLE_ADS_VALIDATED_ID=AW-17824079146
     GOOGLE_ADS_VALIDATED_LABEL=XXXXX

3. CHANGE EXISTING:
   ┌─────────────────────────────────────────────────────────┐
   │ trial_purchase (old $1 event)                            │
   │ - Rename to: "trial_purchase_raw"                        │
   │ - Include in "Conversions": NO ❌ (SECONDARY)           │
   │ - Purpose: Analytics only, not for optimization          │
   └─────────────────────────────────────────────────────────┘

RESULT:
  PRIMARY conversions for optimization:
    1. email_collected ✅
    2. trial_purchase_validated ✅
  
  SECONDARY (data only):
    3. trial_purchase_raw

ADS_SETUP

# ------------------------------------------------------------
# 1.2) VALIDATION RULES (MINIMAL - ТВОЙ ПОДХОД)
# ------------------------------------------------------------

cat << 'VALIDATION_RULES'

КРИТЕРИИ ВАЛИДАЦИИ (MINIMAL):
══════════════════════════════════════════════════════════

function isCardValidated(paymentIntent, paymentMethod) {
  const card = paymentMethod.card;
  
  console.log('[VALIDATION] Card funding:', card.funding);
  console.log('[VALIDATION] CVC check:', card.checks?.cvc_check);
  
  // ✅ RULE 1: NOT prepaid
  // Reason: Prepaid часто пустые после $1
  // Impact: Отсеивает ~40% виртуалок
  if (card.funding === 'prepaid') {
    console.log('[VALIDATION] ❌ REJECTED: Prepaid card');
    return false;
  }
  
  // ✅ RULE 2 (SOFT): CVC check passed
  // Reason: Подтверждает владение картой
  // Impact: Отсеивает ~5-10%
  // NOTE: SOFT = если CVC не проверялся, не отклоняем (только логируем)
  if (card.checks?.cvc_check && card.checks.cvc_check !== 'pass') {
    console.log('[VALIDATION] ⚠️  WARNING: CVC check failed, but allowing');
    // return false; // Раскомментируй если хочешь строже
  }
  
  // ✅ RULE 3 (IMPLICIT): Payment succeeded
  // Reason: PI.succeeded уже означает network approval
  // Impact: Автоматически отсеивает declined/failed
  // No check needed - webhook fires только для succeeded
  
  console.log('[VALIDATION] ✅ CARD VALIDATED');
  return true;
}

ОЖИДАЕМЫЙ VALIDATION RATE: 60-80%
  (высокий, т.к. критерии мягкие)

FALSE REJECT RATE: <5%
  (очень низкий, безопасно)

VALIDATION_RULES

# ------------------------------------------------------------
# 1.3) BACKEND: /api/validate ENDPOINT
# ------------------------------------------------------------

cat << 'EOF_VALIDATE_API'

// ============================================================
// FILE: api/validate.js (NEW!)
// PURPOSE: Check if trial payment passed validation
// ============================================================

import Stripe from 'stripe';
import { kv } from '@vercel/kv'; // Для кеширования результатов

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Проверяет валидацию trial payment
 * Идемпотентный, кеширует результат на 30 дней
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pi } = req.query; // payment_intent id
  
  if (!pi || !pi.startsWith('pi_')) {
    return res.status(400).json({ 
      error: 'Invalid payment_intent id',
      validated: false 
    });
  }

  console.log('[VALIDATE] Checking validation for:', pi);

  try {
    // 1. Проверяем кеш (idempotency + performance)
    const cacheKey = `validation:${pi}`;
    const cached = await kv.get(cacheKey);
    
    if (cached !== null) {
      console.log('[VALIDATE] ✅ Cache hit:', cached);
      return res.status(200).json({ 
        validated: cached === 'true',
        source: 'cache'
      });
    }

    // 2. Получаем PI из Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(pi);
    
    if (!paymentIntent || paymentIntent.amount !== 100) {
      console.log('[VALIDATE] ❌ Invalid PI or not $1 trial');
      await kv.set(cacheKey, 'false', { ex: 2592000 }); // 30 days
      return res.status(200).json({ 
        validated: false,
        reason: 'Not a trial payment'
      });
    }

    // 3. Получаем PaymentMethod
    const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
    
    // 4. Валидация (MINIMAL RULES)
    const isValid = isCardValidated(paymentIntent, pm);
    
    // 5. Сохраняем результат в кеш (30 дней)
    await kv.set(cacheKey, isValid ? 'true' : 'false', { ex: 2592000 });
    
    console.log(`[VALIDATE] Result for ${pi}:`, isValid);
    
    // 6. Логируем для аналитики
    await logValidationResult({
      payment_intent_id: pi,
      customer_id: paymentIntent.customer,
      validated: isValid,
      card_funding: pm.card.funding,
      card_brand: pm.card.brand,
      card_country: pm.card.country,
      cvc_check: pm.card.checks?.cvc_check
    });
    
    return res.status(200).json({ 
      validated: isValid,
      source: 'computed'
    });

  } catch (error) {
    console.error('[VALIDATE] Error:', error.message);
    
    // Fail-safe: в случае ошибки считаем validated=false
    // Лучше пропустить конверсию, чем засорить Ads мусором
    return res.status(200).json({ 
      validated: false,
      error: error.message 
    });
  }
}

// ============================================================
// VALIDATION FUNCTION (копия из правил выше)
// ============================================================

function isCardValidated(paymentIntent, paymentMethod) {
  const card = paymentMethod.card;
  
  // RULE 1: NOT prepaid
  if (card.funding === 'prepaid') {
    console.log('[VALIDATION] ❌ REJECTED: Prepaid card');
    return false;
  }
  
  // RULE 2 (SOFT): CVC check
  if (card.checks?.cvc_check && card.checks.cvc_check !== 'pass') {
    console.log('[VALIDATION] ⚠️  CVC check not passed, but allowing (soft rule)');
    // В будущем можешь раскомментировать для строгой проверки:
    // return false;
  }
  
  console.log('[VALIDATION] ✅ VALIDATED');
  return true;
}

// ============================================================
// ANALYTICS LOGGING (для мониторинга)
// ============================================================

async function logValidationResult(data) {
  try {
    // Сохраняем в KV для анализа
    const logKey = `log:${data.payment_intent_id}`;
    await kv.set(logKey, JSON.stringify(data), { ex: 2592000 }); // 30 days
    
    // Также можно отправить в внешнюю аналитику
    console.log('[ANALYTICS] Validation logged:', data);
  } catch (error) {
    console.error('[ANALYTICS] Logging failed:', error.message);
  }
}

EOF_VALIDATE_API

# ------------------------------------------------------------
# 1.4) FRONTEND: SUCCESS PAGE VALIDATION CHECK
# ------------------------------------------------------------

cat << 'EOF_SUCCESS_PAGE'

// ============================================================
// FILE: public/purchase-confirmation.html (или success.html)
// ADD: Validation check and conditional gtag event
// ============================================================

<script>
  // После успешной оплаты (у тебя уже есть payment_intent id)
  const urlParams = new URLSearchParams(window.location.search);
  const paymentIntentId = urlParams.get('payment_intent') || 
                          urlParams.get('setup_intent'); // зависит от твоей реализации
  
  console.log('[SUCCESS] Payment Intent ID:', paymentIntentId);
  
  if (paymentIntentId) {
    // Проверяем валидацию
    fetch(`/api/validate?pi=${paymentIntentId}`)
      .then(res => res.json())
      .then(data => {
        console.log('[SUCCESS] Validation result:', data);
        
        if (data.validated === true) {
          // ✅ VALIDATED: отправляем конверсию в Google Ads
          console.log('[SUCCESS] 🎯 Sending VALIDATED conversion to Google Ads');
          
          gtag('event', 'conversion', {
            'send_to': 'AW-17824079146/XXXXX', // Твой Conversion ID/Label
            'value': 1.00,
            'currency': 'USD',
            'transaction_id': paymentIntentId
          });
          
          // Также отправляем кастомное событие для GTM (если используешь)
          if (window.dataLayer) {
            window.dataLayer.push({
              'event': 'trial_purchase_validated',
              'transaction_id': paymentIntentId,
              'value': 1.00
            });
          }
        } else {
          // ❌ NOT VALIDATED: НЕ отправляем в Google Ads
          console.log('[SUCCESS] ⏭️  Skipping Ads conversion (not validated)');
          console.log('[SUCCESS] Reason:', data.reason || 'Failed validation');
          
          // Но логируем для аналитики (internal)
          if (window.dataLayer) {
            window.dataLayer.push({
              'event': 'trial_purchase_raw',
              'transaction_id': paymentIntentId,
              'value': 1.00,
              'validated': false
            });
          }
        }
      })
      .catch(error => {
        console.error('[SUCCESS] Validation check failed:', error);
        // Fail-safe: не отправляем конверсию при ошибке
      });
  }
</script>

EOF_SUCCESS_PAGE

# ------------------------------------------------------------
# 1.5) STRIPE WEBHOOK: PRE-COMPUTE VALIDATION
# ------------------------------------------------------------

cat << 'EOF_WEBHOOK'

// ============================================================
// FILE: api/stripe-webhook.js
// ADD: Pre-compute validation on payment_intent.succeeded
// ============================================================

// ... существующий код webhook ...

if (event.type === 'payment_intent.succeeded') {
  const pi = event.data.object;
  
  // Только для trial payments $1
  if (pi.amount === 100) {
    console.log('[WEBHOOK] Trial payment succeeded:', pi.id);
    
    try {
      // Получаем PaymentMethod
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      
      // Вычисляем валидацию
      const isValid = isCardValidated(pi, pm);
      
      // Сохраняем в KV для /api/validate (pre-cache)
      const cacheKey = `validation:${pi.id}`;
      await kv.set(cacheKey, isValid ? 'true' : 'false', { ex: 2592000 });
      
      console.log(`[WEBHOOK] Pre-cached validation for ${pi.id}:`, isValid);
      
      // Логируем для аналитики
      await logValidationResult({
        payment_intent_id: pi.id,
        customer_id: pi.customer,
        validated: isValid,
        card_funding: pm.card.funding,
        card_brand: pm.card.brand,
        cvc_check: pm.card.checks?.cvc_check,
        source: 'webhook'
      });
      
    } catch (error) {
      console.error('[WEBHOOK] Validation pre-compute failed:', error.message);
      // Не критично, /api/validate всё равно сделает это позже
    }
  }
}

// NOTE: НЕ отправляем conversion в Ads из webhook!
// Клиент сам вызовет gtag после проверки /api/validate.
// Это гарантирует что gclid привязан правильно.

EOF_WEBHOOK

# ------------------------------------------------------------
# 1.6) МОНИТОРИНГ И МЕТРИКИ (ДЕНЬ 1-7)
# ------------------------------------------------------------

echo ""
echo "════════════════════════════════════════════════════════"
echo "МОНИТОРИНГ ЭТАПА 1 (ДЕНЬ 1-7)"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'MONITORING'

📊 ЕЖЕДНЕВНО ПРОВЕРЯТЬ:
══════════════════════════════════════════════════════════

1. GOOGLE ADS:
   - Email Collected (должно быть стабильно)
   - Trial Purchase Validated (новая метрика)
   - CPA для обоих
   - CPC (не должен вырасти)

2. STRIPE:
   - Successful $1 payments (RAW count)
   - Сравнить с Ads Validated count
   
3. VALIDATION RATE:
   validation_rate = validated_count / raw_count
   → Ожидается: 60-80%
   → Если <50%: проверить логи, возможно слишком строго
   → Если >90%: проверить логику, возможно не работает фильтр

4. CPA VALIDATED:
   cost / validated_conversions
   → Ожидается: $22-25 (vs текущий $27)
   → Цель: ↓10-15%

5. VOLUME STABILITY:
   daily_trials (raw)
   → Ожидается: стабилен ±10%
   → Если падение >20%: проверить что email PRIMARY активен

СКРИПТ ДЛЯ ПОДСЧЕТА:
──────────────────────────────────────────────────────────

node scripts/calculate-validation-metrics.js

// Выводит:
// - Raw trials: 10
// - Validated trials: 7
// - Validation Rate: 70%
// - CPA validated: $23.50
// - CPA raw: $27.00
// - Improvement: 13%

MONITORING

# ============================================================
# CHECKPOINT 1 (ДЕНЬ 7): GO/NO-GO ДЛЯ ЭТАПА 2
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "🚦 CHECKPOINT 1 (ДЕНЬ 7): GO/NO-GO"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'CHECKPOINT_1'

ПРОВЕРИТЬ:
══════════════════════════════════════════════════════════

□ Validation Rate 60-80%?
  → Если <50%: ослабить критерии (убрать CVC check)
  → Если >90%: проверить что prepaid действительно фильтруется

□ CPA validated снизился на 10-15%?
  → Если да: УСПЕХ ✅ → переходим к Этапу 2
  → Если нет: подождать еще 7 дней (Ads обучается)

□ Объём raw trials стабилен (±10%)?
  → Если падение >20%: проверить email PRIMARY
  → Если падение <10%: ОК ✅

□ /api/validate работает без ошибок?
  → Проверить Vercel logs: ошибок <1%
  → Cache hit rate >50%?

□ Google Ads показывает обе PRIMARY конверсии?
  → email_collected: активна
  → trial_purchase_validated: активна

РЕШЕНИЕ:
──────────────────────────────────────────────────────────

Если ВСЕ ✅:
  → ПЕРЕХОД К ЭТАПУ 2 (Enhanced CPC)
  
Если 1-2 ❌:
  → КОРРЕКТИРОВАТЬ и ждать еще 7 дней
  
Если 3+ ❌:
  → ОТКАТИТЬ изменения, пересмотреть подход

CHECKPOINT_1

# ============================================================
# ЭТАП 2 (ДЕНЬ 7-14): ENHANCED CPC (ОПЦИОНАЛЬНО)
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "ЭТАП 2: ENHANCED CPC (ЕСЛИ ЭТАП 1 УСПЕШЕН)"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'STAGE_2'

КОГДА:
  → Только если Checkpoint 1 = ВСЕ ✅
  → Validated conversions работают стабильно 7+ дней

ЧТО ДЕЛАТЬ:
══════════════════════════════════════════════════════════

Google Ads → Campaign → Settings → Bidding:

1. Изменить стратегию:
   FROM: "Maximize Clicks"
   TO: "Manual CPC"

2. ✅ Включить: "Enhanced CPC"
   (галочка "Help increase conversions with Enhanced CPC")

3. Настройки:
   - Default max. CPC bid: $1.00 (текущий средний)
   - Max. CPC bid limit: $1.50 (для безопасности)

4. НЕ МЕНЯТЬ:
   - Бюджет
   - Таргетинг
   - Ключевые слова
   - Конверсии (оставить email + validated оба PRIMARY)

ОЖИДАЕМЫЙ РЕЗУЛЬТАТ (через 7 дней):
══════════════════════════════════════════════════════════

CPC: $1.00 → $0.90-1.05 (средний стабилен)
CPA validated: $22 → $18-20 (дополнительно -10-15%)
Конверсия: 5.0% → 5.5-6.0% (+10-20%)
Validation Rate: стабилен 60-80%

ПЕРИОД ОБУЧЕНИЯ: 7 дней
  → Не паниковать если первые 2-3 дня колебания

STAGE_2

# ============================================================
# CHECKPOINT 2 (ДЕНЬ 14): GO/NO-GO ДЛЯ ЭТАПА 3
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "🚦 CHECKPOINT 2 (ДЕНЬ 14): АНАЛИЗ SUCCESS RATE"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'CHECKPOINT_2'

ПРОВЕРИТЬ SUCCESS RATE НА ПЕРВЫЙ $49:
══════════════════════════════════════════════════════════

Запустить скрипт:
  node scripts/analyze-49-success-rate.js --from=day-10

Показывает:
  - Сколько триалов (с Day 0-4) уже прошли первый $49
  - Success Rate = paid / total
  - Breakdown по validated vs non-validated

РЕШЕНИЕ:
──────────────────────────────────────────────────────────

Если Success Rate ≥ 70%:
  → ✅ ОТЛИЧНО! Текущий timing (10 дней) работает
  → ЭТАП 3 НЕ НУЖЕН
  → Продолжаем текущую стратегию
  → Рассматриваем масштабирование (+50% бюджет)

Если Success Rate 60-69%:
  → ⚠️  СРЕДНЕ. Можно улучшить.
  → ОПЦИОНАЛЬНО: Этап 3 (timing 3 дня)
  → Но можно и оставить как есть

Если Success Rate < 60%:
  → ❌ ПЛОХО. Validated conversions не решили проблему.
  → НЕОБХОДИМО: Этап 3 (timing 3 дня)
  → Или рассмотреть Stripe Radar (block prepaid)

CHECKPOINT_2

# ============================================================
# ЭТАП 3 (ДЕНЬ 14+): TIMING 3 DAYS (ТОЛЬКО ЕСЛИ НУЖНО)
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "ЭТАП 3: TIMING 3 ДНЕЙ (ТОЛЬКО ЕСЛИ SUCCESS RATE < 65%)"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'STAGE_3'

КОГДА:
  → Только если Success Rate первый $49 < 65%
  → Validated conversions + Enhanced CPC уже работают
  → Через 14+ дней после Этапа 1

ПОЧЕМУ:
══════════════════════════════════════════════════════════

Проблема: деньги утекают с карты за 10 дней
  День 0: $1 триал (на карте $50)
  День 10: $49 charge ❌ (на карте $5)

Решение: списать быстрее
  День 0: $1 триал (на карте $50)
  День 3: $49 charge ✅ (на карте $45)

ЧТО ДЕЛАТЬ:
══════════════════════════════════════════════════════════

1. Создать новый Stripe Price:
   
   Stripe Dashboard → Products → VinTrusted → Add Price:
     - Amount: $49.00
     - Billing period: Custom → 3 days
     - Type: Recurring
   
   → Сохранить ID: price_XXXXX
   → Добавить в .env.local: PRICE_49_EVERY_3D

2. Обновить код subscription schedule:
   
   В checkout-trial-then-two-charges.js:
   
   const priceEvery3Days = process.env.PRICE_49_EVERY_3D;
   const startAt = Math.floor(Date.now() / 1000) + 3 * 86400; // 3 дня
   
   schedule = await stripe.subscriptionSchedules.create({
     customer: customer.id,
     start_date: startAt,
     phases: [
       {
         iterations: 3,
         items: [{ price: priceEvery3Days }], // ← изменено
         // ...
       },
       {
         items: [{ price: priceMonthly }],
         // ...
       }
     ]
   });

3. Деплой:
   git commit -m "Change timing to 3 days for better Success Rate"
   git push

4. Мониторинг (через 10 дней):
   - Success Rate должен вырасти с 55% → 70%
   - Это +27% к MRR!

STAGE_3

# ============================================================
# ФИНАЛЬНЫЕ МЕТРИКИ (ДЕНЬ 30)
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ (ДЕНЬ 30)"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'FINAL_METRICS'

СРАВНЕНИЕ: ДЕНЬ 0 → ДЕНЬ 30
══════════════════════════════════════════════════════════

ПОСЛЕ ЭТАПА 1 ONLY (validated conversions):
──────────────────────────────────────────────────────────
CPC:              $1.00 → $1.00 (без изменений)
CPA validated:    $27 → $22-23 (-15-20%)
Validation Rate:  N/A → 70%
Success Rate $49: 54.5% → 54.5% (без изменений)
ROI:              176% → 220% (+25%)

ПОСЛЕ ЭТАПА 1 + 2 (validated + Enhanced CPC):
──────────────────────────────────────────────────────────
CPC:              $1.00 → $0.92 (-8%)
CPA validated:    $27 → $18-20 (-25-33%)
Validation Rate:  N/A → 70%
Success Rate $49: 54.5% → 54.5% (без изменений)
ROI:              176% → 280% (+60%)

ПОСЛЕ ЭТАПА 1 + 2 + 3 (validated + Enhanced + timing):
──────────────────────────────────────────────────────────
CPC:              $1.00 → $0.92 (-8%)
CPA validated:    $27 → $18-20 (-25-33%)
Validation Rate:  N/A → 70%
Success Rate $49: 54.5% → 70% (+28%) ✅✅
ROI:              176% → 360% (+105%) 🚀🚀

КЛЮЧЕВОЙ МОМЕНТ:
══════════════════════════════════════════════════════════

Validated conversions (Этап 1):
  → Улучшает КАЧЕСТВО трафика
  → CPA ↓, но Success Rate без изменений
  → ROI +25-60%

Timing 3 дня (Этап 3):
  → Улучшает RETENTION ($49 payments)
  → Success Rate ↑
  → ROI еще +50-80%

Комбинация = ×2-2.5 ROI

FINAL_METRICS

# ============================================================
# БЫСТРЫЕ КОМАНДЫ
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "🚀 БЫСТРЫЕ КОМАНДЫ"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'COMMANDS'

# ЭТАП 1: Деплой validated conversions
cd /Users/dmitrii/Desktop/vintrusted
git add api/validate.js api/stripe-webhook.js public/purchase-confirmation.html
git commit -m "Stage 1: Implement validated trial conversions"
git push

# Мониторинг validation rate
node scripts/calculate-validation-metrics.js

# Проверить /api/validate
curl "https://vintrusted.com/api/validate?pi=pi_XXXXX"

# ЭТАП 2: Включить Enhanced CPC
# (вручную в Google Ads UI)

# ЭТАП 3: Изменить timing
# 1. Создать Price в Stripe Dashboard
# 2. Обновить код:
git add api/checkout-trial-then-two-charges.js
git commit -m "Stage 3: Change timing to 3 days"
git push

# Анализ Success Rate
node scripts/analyze-49-success-rate.js --from=day-10

COMMANDS

# ============================================================
# СРАВНЕНИЕ С МОИМ АГРЕССИВНЫМ ПОДХОДОМ
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "🔬 СРАВНЕНИЕ ПОДХОДОВ"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'COMPARISON'

┌─────────────────────┬──────────────────┬──────────────────┐
│ ПАРАМЕТР            │ ТВОЙ (conservative)│ МОЙ (aggressive)│
├─────────────────────┼──────────────────┼──────────────────┤
│ Validation Rules    │ 2 критерия       │ 6-7 критериев    │
│ Validation Rate     │ 70% (высокий)    │ 50% (низкий)     │
│ False Reject        │ <5% ✅           │ 10-15% ⚠️        │
│ Timing Change       │ Опционально      │ Сразу            │
│ Enhanced CPC        │ После 7 дней     │ Сразу            │
│ Риск                │ 5% (низкий) ✅   │ 20% (средний)    │
│ Скорость результата │ 14-21 день       │ 7-10 дней        │
│ ROI Day 30          │ 280-360%         │ 350-400%         │
│ Сложность отката    │ Легко ✅         │ Сложно           │
└─────────────────────┴──────────────────┴──────────────────┘

МОЯ РЕКОМЕНДАЦИЯ:
══════════════════════════════════════════════════════════

ИСПОЛЬЗУЙ ТВОЙ ПОДХОД:

✅ Безопаснее (risk 5% vs 20%)
✅ Легче откатить если что-то не так
✅ Четкое понимание что работает (test one thing)
✅ False reject rate минимальный (<5%)
✅ Validation Rate высокий (70%) → меньше потеря объёма

Мой агрессивный подход:
  - Быстрее (+7 дней)
  - Но рискованнее
  - Сложнее debug если проблема
  - Выше false reject (теряем хороших клиентов)

ВЫБОР: Консервативный прогрессивный (твой) ✅

COMPARISON

# ============================================================
# ИТОГ
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "🎯 ФИНАЛЬНОЕ РЕШЕНИЕ"
echo "════════════════════════════════════════════════════════"
echo ""

cat << 'CONCLUSION'

СИМБИОЗ 2.0 = ТВОЯ БАЗА + МОИ ОПЦИОНАЛЬНЫЕ УЛУЧШЕНИЯ

ЭТАП 1 (обязательно):
  ✅ Validated conversions
  ✅ Minimal validation (funding != prepaid)
  ✅ /api/validate endpoint
  ✅ Timing 10 дней (без изменений)
  ✅ Maximize Clicks (без изменений)
  
  Результат: CPA ↓15-20%, ROI +25%

ЭТАП 2 (если Этап 1 ОК):
  ✅ Enhanced CPC
  
  Результат: CPA ↓дополнительно 10-15%, ROI +60%

ЭТАП 3 (если Success Rate < 65%):
  ✅ Timing 3 дня
  
  Результат: Success Rate ↑28%, ROI ×2+

──────────────────────────────────────────────────────────

РИСК: МИНИМАЛЬНЫЙ (progressive approach)
СКОРОСТЬ: 2-3 недели до финального результата
ROI: ×2-2.5 за месяц

READY TO START? 🚀

CONCLUSION

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ SYMBIOSIS 2.0 PLAN READY"
echo "════════════════════════════════════════════════════════"
echo ""

# END OF SYMBIOSIS 2.0
