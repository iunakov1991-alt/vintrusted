#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# 🔥 ADVANCED IMPLEMENTATION: ПРОДВИНУТЫЕ ОПТИМИЗАЦИИ
# ════════════════════════════════════════════════════════════════════════════
#
# БАЗИС: 3-tier system (Premium=$25, Medium=$5, Fraud=$0) ✅
# 
# ПРОДВИНУТЫЕ ОПТИМИЗАЦИИ:
# 1. Тестирование Tier-логики (перед запуском)
# 2. Окно конверсии 30-90 дней
# 3. Time-to-Conversion как сигнал качества
# 4. BIN-чекер для точной идентификации карт
# 5. Data-Driven Attribution
# 6. Negative Conversion для chargeback
# 7. GCLID в localStorage (критично!)
# 8. Search Lost IS мониторинг
# 9. Emancipated Emails (delayed conversions)
#
# Дата: 16 января 2026
# Статус: ADVANCED LEVEL
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail
clear

echo "════════════════════════════════════════════════════════════════════════════"
echo "         🔬 РЕКОМЕНДАЦИЯ #1: ТЕСТИРОВАНИЕ TIER-ЛОГИКИ                      "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'TIER_TESTING'

КРИТИЧНО: ПРОТЕСТИРУЙ TIER DISTRIBUTION ДО ЗАПУСКА!
══════════════════════════════════════════════════════════════════════════════

ПРОБЛЕМА:
  Если в Premium попадает <30%, твои креативы привлекают "холодную" аудиторию.
  Нужно поднять Medium до $10 (не $5).

ДЕЙСТВИЕ:
  Прогони api/validate.js в тестовом режиме на реальных транзакциях из Stripe.

╔════════════════════════════════════════════════════════════════════════════╗
║              СКРИПТ: scripts/test-tier-distribution.js                     ║
╚════════════════════════════════════════════════════════════════════════════╝

import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Copy determineTier function from api/validate.js
function determineTier(pi, pm) {
  // ... (весь код из validate.js)
}

async function testTierDistribution() {
  console.log('🔬 Тестирование Tier Distribution...\n');
  
  // Получаем последние 100 успешных $1 платежей
  const payments = await stripe.paymentIntents.list({
    limit: 100,
    status: 'succeeded'
  });
  
  const trialsOnly = payments.data.filter(pi => pi.amount === 100);
  
  console.log(\`Найдено \${trialsOnly.length} trial payments\n\`);
  
  const tierCounts = {
    premium: 0,
    medium: 0,
    fraud: 0
  };
  
  const tierValues = {
    premium: 0,
    medium: 0,
    fraud: 0
  };
  
  for (const pi of trialsOnly) {
    try {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      const result = determineTier(pi, pm);
      
      tierCounts[result.tier]++;
      tierValues[result.tier] += result.value;
      
      console.log(\`[\${result.tier.toUpperCase()}] $\${result.value} - \${pm.card.funding} - \${pm.card.brand}\`);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  const total = trialsOnly.length;
  
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📊 TIER DISTRIBUTION:');
  console.log('════════════════════════════════════════════════════════');
  console.log(\`Premium: \${tierCounts.premium} (\${(tierCounts.premium/total*100).toFixed(1)}%)\`);
  console.log(\`Medium:  \${tierCounts.medium} (\${(tierCounts.medium/total*100).toFixed(1)}%)\`);
  console.log(\`Fraud:   \${tierCounts.fraud} (\${(tierCounts.fraud/total*100).toFixed(1)}%)\`);
  console.log('');
  console.log(\`Total Conversion Value: $\${(tierValues.premium + tierValues.medium).toFixed(2)}\`);
  console.log(\`Avg Value per Trial: $\${((tierValues.premium + tierValues.medium)/total).toFixed(2)}\`);
  console.log('════════════════════════════════════════════════════════');
  
  // КРИТИЧЕСКИЙ ЧЕКПОИНТ
  const premiumPercent = (tierCounts.premium / total) * 100;
  
  if (premiumPercent < 30) {
    console.log('\n⚠️  WARNING: Premium < 30%!');
    console.log('   Твои креативы привлекают "холодную" аудиторию.');
    console.log('   РЕКОМЕНДАЦИЯ: Подними Medium value до $10 (не $5)');
  } else if (premiumPercent > 70) {
    console.log('\n✅ EXCELLENT: Premium > 70%!');
    console.log('   Отличное качество трафика.');
  } else {
    console.log('\n✅ GOOD: Premium 30-70%');
    console.log('   Нормальное распределение.');
  }
}

testTierDistribution().catch(console.error);

════════════════════════════════════════════════════════════════════════════════

ЗАПУСК:
node scripts/test-tier-distribution.js

ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
  Premium: 60-70% (хорошо)
  Medium:  20-30% (норма)
  Fraud:   5-10% (приемлемо)

ЕСЛИ Premium < 30%:
  → Подними Medium value: $5 → $10
  → Или улучши креативы (привлекай "горячих")

TIER_TESTING

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #2: ОКНО КОНВЕРСИИ 30-90 ДНЕЙ
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         ⏰ РЕКОМЕНДАЦИЯ #2: ОКНО КОНВЕРСИИ 30-90 ДНЕЙ                     "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'CONVERSION_WINDOW'

КРИТИЧНО ДЛЯ MAXIMIZE CONVERSION VALUE!
══════════════════════════════════════════════════════════════════════════════

ПРОБЛЕМА:
  Если окно конверсии = 7 дней (default), Google теряет delayed conversions.
  Алгоритм не видит полную картину.

РЕШЕНИЕ:
  Установи минимум 30, лучше 90 дней.

КАК НАСТРОИТЬ:
──────────────────────────────────────────────────────────────────────────────

Google Ads → Tools → Conversions → [Твоя конверсия] → Edit

1. Click-through conversion window: 90 days (было 30 по умолчанию)
   → Пользователь кликнул на объявление, потом вернулся через 60 дней

2. Engaged-view conversion window: 1 day (оставить как есть)
   → Просмотр без клика

ПОЧЕМУ 90 ДНЕЙ:
──────────────────────────────────────────────────────────────────────────────

Твоя модель: Trial $1 → потом $49 через 10 дней.

Сценарий:
  День 0: Клик на объявление → Email collected ($5)
  День 3: Вернулся direct → Trial purchase ($25)
  День 13: Первый $49 (в будущем можешь отслеживать)

Если окно = 7 дней:
  → Google НЕ засчитает Day 13 как успех того клика
  → Потеря данных для обучения

Если окно = 90 дней:
  → Google видит весь путь
  → Лучше понимает "кто конвертирует позже"

CONVERSION_WINDOW

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #3: TIME-TO-CONVERSION КАК СИГНАЛ
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         ⚡ РЕКОМЕНДАЦИЯ #3: TIME-TO-CONVERSION СИГНАЛ                     "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'TIME_TO_CONVERSION'

МОЩНЫЙ СИГНАЛ ДЛЯ GOOGLE ADS!
══════════════════════════════════════════════════════════════════════════════

ИДЕЯ:
  Быстрая конверсия (< 60 сек) = сильнее сигнал для алгоритма.
  Долгая конверсия (10+ мин) = слабее сигнал.

ЛОГИКА:
  Если пользователь оплатил за 30 секунд → он "горячий"
  Если пользователь "тупил" 10 минут → он сомневался

ДЕЙСТВИЕ:
  Логируй время и отправляй Super Premium ($30) для быстрых конверсий.

╔════════════════════════════════════════════════════════════════════════════╗
║              КОД: TRACKING TIME-TO-CONVERSION                              ║
╚════════════════════════════════════════════════════════════════════════════╝

FILE: public/index.html (или любая первая страница)
──────────────────────────────────────────────────────────────────────────────

<script>
  // Сохраняем время первого визита
  if (!localStorage.getItem('landing_time')) {
    localStorage.setItem('landing_time', Date.now());
  }
</script>

FILE: public/purchase-confirmation.html
──────────────────────────────────────────────────────────────────────────────

<script>
  const landingTime = parseInt(localStorage.getItem('landing_time') || Date.now());
  const conversionTime = Date.now();
  const timeToConversion = Math.floor((conversionTime - landingTime) / 1000); // seconds
  
  console.log(\`[TIME] Time to conversion: \${timeToConversion}s\`);
  
  // Отправляем в /api/validate с параметром time
  fetch(\`/api/validate?pi=\${pi}&ttc=\${timeToConversion}\`)
    .then(res => res.json())
    .then(data => {
      let finalValue = data.value;
      
      // SUPER PREMIUM: быстрая + качественная конверсия
      if (data.tier === 'premium' && timeToConversion < 60) {
        finalValue = 30.00; // ✅ Super Premium!
        console.log('[TIME] ⚡ SUPER PREMIUM: Fast + Quality');
      }
      
      if (data.tier === 'premium' && timeToConversion < 300) {
        finalValue = 27.00; // ✅ Premium+
        console.log('[TIME] ⚡ PREMIUM+: Medium speed + Quality');
      }
      
      // Отправляем в Ads с adjusted value
      gtag('event', 'conversion', {
        'send_to': 'AW-17824079146/XXXXX',
        'value': finalValue,
        'currency': 'USD',
        'transaction_id': pi
      });
      
      // Clear landing time for next session
      localStorage.removeItem('landing_time');
    });
</script>

РЕЗУЛЬТАТ:
──────────────────────────────────────────────────────────────────────────────

TIER STRUCTURE С TIME:
  • Super Premium (< 60s): $30
  • Premium+ (< 5min): $27
  • Premium (любое): $25
  • Medium: $5
  • Fraud: $0

Ads будет ОСОБЕННО ценить быстрые конверсии.

TIME_TO_CONVERSION

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #4 + #5: DATA-DRIVEN ATTRIBUTION
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         🎯 РЕКОМЕНДАЦИЯ #5: DATA-DRIVEN ATTRIBUTION                       "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'ATTRIBUTION_MODEL'

КРИТИЧНО ДЛЯ MAXIMIZE CONVERSION VALUE!
══════════════════════════════════════════════════════════════════════════════

ПРОБЛЕМА С LAST CLICK:
  Пользователь:
    1. Клик на объявление "купить VIN report" → Email
    2. Клик на брендовое "vintrusted" → Trial purchase
  
  Last Click Attribution:
    → Весь кредит идет брендовому запросу
    → Generic запрос не получает кредит за Email
    → Google перегревает ставки на бренде
    → Убивает поиск новых клиентов

РЕШЕНИЕ: DATA-DRIVEN ATTRIBUTION
══════════════════════════════════════════════════════════════════════════════

КАК НАСТРОИТЬ:
──────────────────────────────────────────────────────────────────────────────

Google Ads → Tools → Conversions → [Твоя конверсия] → Edit

Attribution model: Data-driven (Атрибуция на основе данных)

ПОЧЕМУ ЭТО ЛУЧШЕ:
  ✅ Google распределяет кредит между всеми касаниями
  ✅ Понимает какие keywords "знакомят" (Email)
  ✅ Понимает какие keywords "закрывают" (Trial)
  ✅ Не перегревает брендовые запросы
  ✅ Продолжает искать новых клиентов

ТРЕБОВАНИЯ:
  → Минимум 400 conversions за 30 дней
  → Минимум 15000 кликов за 30 дней
  
  Если не хватает:
    → Используй Linear attribution (временно)
    → Переключишься на Data-Driven позже

ATTRIBUTION_MODEL

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #7: GCLID В LOCALSTORAGE (КРИТИЧНО!)
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         🔑 РЕКОМЕНДАЦИЯ #7: GCLID В LOCALSTORAGE (КРИТИЧНО!)              "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'GCLID_STORAGE'

ПРОБЛЕМА: ПОТЕРЯ DELAYED CONVERSIONS
══════════════════════════════════════════════════════════════════════════════

СЦЕНАРИЙ:
  День 0: Пользователь кликнул на Ads → оставил Email → ушел
  День 3: Вернулся через Direct URL → купил Trial
  
  Обычный gtag:
    → Не видит gclid (Direct traffic)
    → Конверсия НЕ засчитывается в Ads
    → Google теряет данные

РЕШЕНИЕ: СОХРАНЯЙ GCLID В LOCALSTORAGE
══════════════════════════════════════════════════════════════════════════════

╔════════════════════════════════════════════════════════════════════════════╗
║              FILE: public/gclid-storage.js (НОВЫЙ, КРИТИЧНО!)              ║
╚════════════════════════════════════════════════════════════════════════════╝

// ────────────────────────────────────────────────────────────────────────────
// СОХРАНЕНИЕ GCLID ПРИ ПЕРВОМ ВИЗИТЕ
// ────────────────────────────────────────────────────────────────────────────

(function() {
  // Получаем gclid из URL
  const urlParams = new URLSearchParams(window.location.search);
  const gclid = urlParams.get('gclid');
  
  if (gclid) {
    // Сохраняем в localStorage (живет 90 дней)
    const gclidData = {
      gclid: gclid,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    localStorage.setItem('_gcl', JSON.stringify(gclidData));
    console.log('[GCLID] Saved to localStorage:', gclid);
  }
  
  // Также сохраняем через стандартный gclid-cookie.js (для бекенда)
})();

// ────────────────────────────────────────────────────────────────────────────
// ВОССТАНОВЛЕНИЕ GCLID ПРИ КОНВЕРСИИ
// ────────────────────────────────────────────────────────────────────────────

FILE: public/purchase-confirmation.html (ADD THIS)
──────────────────────────────────────────────────────────────────────────────

<script>
  // Проверяем есть ли gclid в URL (fresh click)
  const urlParams = new URLSearchParams(window.location.search);
  let gclid = urlParams.get('gclid');
  
  // Если нет в URL, пытаемся восстановить из localStorage
  if (!gclid) {
    try {
      const gclidData = JSON.parse(localStorage.getItem('_gcl'));
      
      if (gclidData && gclidData.gclid) {
        const ageInDays = (Date.now() - gclidData.timestamp) / (1000 * 60 * 60 * 24);
        
        // Используем если младше 90 дней
        if (ageInDays < 90) {
          gclid = gclidData.gclid;
          console.log(\`[GCLID] Restored from localStorage (age: \${ageInDays.toFixed(1)} days)\`);
        } else {
          console.log('[GCLID] Expired (> 90 days)');
        }
      }
    } catch (error) {
      console.error('[GCLID] Error reading localStorage:', error);
    }
  }
  
  // Отправляем конверсию с правильным gclid
  fetch(\`/api/validate?pi=\${pi}\`)
    .then(res => res.json())
    .then(data => {
      // ... tier logic ...
      
      // Отправляем в Ads с ВОССТАНОВЛЕННЫМ gclid
      gtag('event', 'conversion', {
        'send_to': 'AW-17824079146/XXXXX',
        'value': conversionValue,
        'currency': 'USD',
        'transaction_id': pi,
        // ✅ КРИТИЧНО: передаем gclid вручную если есть
        ...(gclid && { 'gclid': gclid })
      });
      
      console.log('[CONVERSION] Sent with gclid:', gclid || 'none');
    });
</script>

РЕЗУЛЬТАТ:
══════════════════════════════════════════════════════════════════════════════

ДО (без localStorage):
  Потеря 20-30% delayed conversions
  Google не видит их
  Хуже обучение алгоритма

ПОСЛЕ (с localStorage):
  ✅ Восстановление delayed conversions
  ✅ Google видит полную картину
  ✅ Быстрее обучение
  ✅ Ниже CPA

ВАЖНО:
  Добавь <script src="/gclid-storage.js"></script> на ВСЕ страницы!

GCLID_STORAGE

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #6: NEGATIVE CONVERSION (CHARGEBACK)
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         🔄 РЕКОМЕНДАЦИЯ #6: NEGATIVE CONVERSION (ПРОДВИНУТО)              "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'NEGATIVE_CONVERSION'

ВЫСШИЙ ПИЛОТАЖ: FEEDBACK LOOP ДЛЯ ADS
══════════════════════════════════════════════════════════════════════════════

ИДЕЯ:
  Если пользователь сделал Chargeback/Refund в первые 48 часов:
    → Отправь Google "отмену конверсии" (Retraction)
    → Алгоритм получит "по рукам" за фродера
    → Не будет приводить похожих

КАК ЭТО РАБОТАЕТ:
──────────────────────────────────────────────────────────────────────────────

Google Ads API: Conversion Adjustments
https://developers.google.com/google-ads/api/docs/conversions/upload-adjustments

Что можно сделать:
  • RESTATE: Изменить ценность конверсии
  • RETRACT: Полностью отменить конверсию

КОГДА ИСПОЛЬЗОВАТЬ:
──────────────────────────────────────────────────────────────────────────────

Stripe Webhook: charge.dispute.created (chargeback)
  → Отправь RETRACT в Google Ads
  
Stripe Webhook: charge.refunded (refund)
  → Если рефанд в первые 48 часов → RETRACT
  → Если позже → не трогай (это бизнес-решение)

╔════════════════════════════════════════════════════════════════════════════╗
║              КОД: CONVERSION ADJUSTMENT (ОПЦИОНАЛЬНО)                      ║
╚════════════════════════════════════════════════════════════════════════════╝

FILE: api/stripe-webhook.js (ADD)
──────────────────────────────────────────────────────────────────────────────

if (event.type === 'charge.dispute.created') {
  const charge = event.data.object;
  const pi = charge.payment_intent;
  
  console.log('[DISPUTE] Chargeback detected:', pi);
  
  // Получаем original conversion
  const logKey = \`log:\${pi}\`;
  const logData = await kv.get(logKey);
  
  if (logData) {
    const data = JSON.parse(logData);
    
    if (data.gclid) {
      // Отправляем RETRACT через Google Ads API
      // (требует настройки Google Ads API client)
      
      console.log('[DISPUTE] Would send RETRACT for gclid:', data.gclid);
      
      // Примерный код (требует Google Ads API setup):
      /*
      await googleAdsClient.uploadConversionAdjustment({
        gclid: data.gclid,
        conversion_action: 'AW-17824079146/XXXXX',
        adjustment_type: 'RETRACT',
        adjustment_datetime: new Date().toISOString()
      });
      */
    }
  }
}

СЛОЖНОСТЬ:
  → Требует Google Ads API setup (не простой gtag)
  → Нужен OAuth credentials
  → Нужен backend job queue

ПРИОРИТЕТ:
  → LOW (можно добавить позже)
  → Эффект: 1-3% improvement CPA
  → Сложность: HIGH

РЕКОМЕНДАЦИЯ:
  Отложи на потом, когда все остальное работает.

NEGATIVE_CONVERSION

read -p "Нажми Enter чтобы продолжить..."
clear

# ════════════════════════════════════════════════════════════════════════════
# РЕКОМЕНДАЦИЯ #8: SEARCH LOST IS МОНИТОРИНГ
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "         📊 РЕКОМЕНДАЦИЯ #8: SEARCH LOST IS МОНИТОРИНГ                     "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'SEARCH_LOST_IS'

КРИТИЧЕСКАЯ МЕТРИКА ДЛЯ MAXIMIZE CONVERSION VALUE
══════════════════════════════════════════════════════════════════════════════

ЧТО ЭТО:
  Search Lost IS (rank) = Impression Share потерянный из-за низкого Ad Rank

ПОЧЕМУ ВАЖНО:
  Если > 50%:
    → Google хочет выкупать Premium-аудиторию
    → НО твои лимиты (бюджет/tROAS) слишком жесткие
    → Ты теряешь качественный трафик

ГДЕ СМОТРЕТЬ:
──────────────────────────────────────────────────────────────────────────────

Google Ads → Campaigns → Columns → Customize Columns
  → Competitive metrics:
    ✅ Search Impr. share
    ✅ Search Lost IS (rank)
    ✅ Search Lost IS (budget)

ИНТЕРПРЕТАЦИЯ:
──────────────────────────────────────────────────────────────────────────────

Search Lost IS (rank) < 20%:
  ✅ Отлично, Ad Rank достаточный

Search Lost IS (rank) 20-50%:
  ⚠️ Норма, можно оптимизировать

Search Lost IS (rank) > 50%:
  ❌ ПРОБЛЕМА! Google не может выкупать аукционы
  
  Решения:
    1. Увеличить бюджет (+30-50%)
    2. Снизить Target ROAS (если установлен)
    3. ВРЕМЕННО поднять Medium value: $5 → $10
       → Даст системе больше "топлива" для аукционов

Search Lost IS (budget) > 30%:
  ❌ ПРОБЛЕМА! Бюджет заканчивается раньше конца дня
  
  Решение:
    → Увеличить daily budget

МОНИТОРИНГ:
──────────────────────────────────────────────────────────────────────────────

Проверяй эту метрику ЕЖЕДНЕВНО первые 14 дней после запуска Max Conv Value.

Если Lost IS (rank) растет > 50%:
  → Action: Подними Medium value $5 → $10 (временно)
  → Это даст алгоритму больше виртуального budget для участия

SEARCH_LOST_IS

read -p "Нажми Enter для финального чеклиста..."
clear

# ════════════════════════════════════════════════════════════════════════════
# ФИНАЛЬНЫЙ ЧЕКЛИСТ
# ════════════════════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════════════════"
echo "              ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ (ПРОДВИНУТАЯ НАСТРОЙКА)                 "
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

cat << 'FINAL_CHECKLIST'

╔════════════════════════════════════════════════════════════════════════════╗
║                         STAGE 0: ПОДГОТОВКА (РАСШИРЕННАЯ)                 ║
╚════════════════════════════════════════════════════════════════════════════╝

КОД:
──────────────────────────────────────────────────────────────────────────────
□ 1. api/validate.js (3-tier system) ✅
□ 2. public/gclid-storage.js (КРИТИЧНО!) ✅
□ 3. public/purchase-confirmation.html (tier + gclid restore) ✅
□ 4. public/email-capture.html (value $5) ✅
□ 5. api/stripe-webhook.js (pre-cache) ✅

ТЕСТИРОВАНИЕ:
──────────────────────────────────────────────────────────────────────────────
□ 6. scripts/test-tier-distribution.js ✅
□ 7. Запустить тест на последних 100 триалах
□ 8. Проверить: Premium > 30%?
     → Если < 30%: подними Medium $5 → $10

GOOGLE ADS:
──────────────────────────────────────────────────────────────────────────────
□ 9. Conversions:
     - email_collected: $5.00, PRIMARY
     - trial_purchase: dynamic ($25-30/$5/$0), PRIMARY
     - trial_purchase_raw: SECONDARY

□ 10. Conversion window: 90 days (было 30)

□ 11. Attribution model: Data-Driven
      (или Linear если < 400 conversions)

□ 12. Добавить столбцы:
      - Search Impr. share
      - Search Lost IS (rank)
      - Search Lost IS (budget)

ДЕПЛОЙ:
──────────────────────────────────────────────────────────────────────────────
□ 13. git add -A && git commit && git push
□ 14. Vercel deploy
□ 15. Тестовая покупка (проверить gclid restore)
□ 16. ⏳ ЖДАТЬ 3 дня (накопление Conv. Value)

╔════════════════════════════════════════════════════════════════════════════╗
║                         STAGE 1: ЗАПУСК (ДЕНЬ 0-14)                        ║
╚════════════════════════════════════════════════════════════════════════════╝

□ 17. Переключить на Maximize Conversion Value
□ 18. Target ROAS: НЕ СТАВИТЬ (первые 14 дней)

МОНИТОРИНГ (ЕЖЕДНЕВНО):
──────────────────────────────────────────────────────────────────────────────
□ 19. Tier distribution:
      - Premium: 60-70%?
      - Medium: 20-30%?
      - Fraud: 5-10%?

□ 20. Search Lost IS (rank):
      - < 20%: ✅ Отлично
      - 20-50%: ⚠️ Норма
      - > 50%: ❌ Подними Medium value $5 → $10

□ 21. CPA validated: падает?

□ 22. Conversion Value: растет?

╔════════════════════════════════════════════════════════════════════════════╗
║                         ПРОДВИНУТЫЕ ОПТИМИЗАЦИИ (ПОТОМ)                    ║
╚════════════════════════════════════════════════════════════════════════════╝

MEDIUM PRIORITY (через 14 дней):
──────────────────────────────────────────────────────────────────────────────
□ 23. Time-to-conversion tracking:
      - Super Premium (< 60s): $30
      - Premium+ (< 5min): $27

□ 24. BIN-checker integration (опционально):
      - binlist.net API
      - Точнее определять virtual cards

LOW PRIORITY (через 30+ дней):
──────────────────────────────────────────────────────────────────────────────
□ 25. Negative conversions (chargeback retract)
      - Требует Google Ads API setup
      - Сложно, но дает 1-3% improvement

□ 26. Emancipated emails (delayed conversions)
      - Email retention + gclid в БД
      - Отслеживание delayed purchases

FINAL_CHECKLIST

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "🚀 ПРОДВИНУТАЯ НАСТРОЙКА ГОТОВА!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Приоритет реализации:"
echo "  1. HIGH: GCLID в localStorage (критично!) ✅"
echo "  2. HIGH: Тестирование tier distribution ✅"
echo "  3. HIGH: Conversion window 90 days ✅"
echo "  4. HIGH: Data-Driven Attribution ✅"
echo "  5. MEDIUM: Time-to-conversion tracking"
echo "  6. MEDIUM: Search Lost IS мониторинг"
echo "  7. LOW: BIN-checker"
echo "  8. LOW: Negative conversions"
echo ""
echo "Скажи 'Начинаем реализацию' для создания всех файлов!"
echo "════════════════════════════════════════════════════════════════════════════"

# END OF ADVANCED IMPLEMENTATION
