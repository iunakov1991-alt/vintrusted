/**
 * СКРИПТ МИГРАЦИИ: Добавление месячной подписки к существующим пользователям
 * =============================================================================
 * 
 * Что делает:
 * 1. Находит все активные Subscription Schedules
 * 2. Проверяет, что это schedule с 3 итерациями по $49 каждые 10 дней
 * 3. Добавляет вторую фазу: $49/месяц навсегда
 * 
 * ВАЖНО: Запускай ТОЛЬКО после создания PRICE_49_MONTHLY в Stripe!
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Переменные окружения
const PRICE_49_EVERY_10D = process.env.PRICE_49_EVERY_10D;
const PRICE_49_MONTHLY = process.env.PRICE_49_MONTHLY;

if (!PRICE_49_EVERY_10D || !PRICE_49_MONTHLY) {
  console.error('❌ ОШИБКА: Не найдены PRICE_49_EVERY_10D или PRICE_49_MONTHLY в .env.local');
  console.error('Создай PRICE_49_MONTHLY в Stripe Dashboard и добавь в .env.local!');
  process.exit(1);
}

console.log('🔍 Поиск активных Subscription Schedules...\n');

async function migrateSchedules() {
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  try {
    // Получаем все активные subscription schedules
    const schedules = await stripe.subscriptionSchedules.list({
      limit: 100,
      // Фильтруем только активные и не завершенные
    });
    
    console.log(`📊 Найдено ${schedules.data.length} subscription schedules\n`);
    
    for (const schedule of schedules.data) {
      try {
        // Проверяем статус
        if (schedule.status === 'canceled' || schedule.status === 'completed') {
          console.log(`⏭️  Пропускаю ${schedule.id} (статус: ${schedule.status})`);
          skipped++;
          continue;
        }
        
        // Проверяем, что это наш schedule (1 фаза с 3 итерациями)
        const phases = schedule.phases;
        
        if (phases.length !== 1) {
          console.log(`⏭️  Пропускаю ${schedule.id} (уже имеет ${phases.length} фаз)`);
          skipped++;
          continue;
        }
        
        const phase1 = phases[0];
        
        // Проверяем что это наш price
        if (phase1.items[0]?.price !== PRICE_49_EVERY_10D) {
          console.log(`⏭️  Пропускаю ${schedule.id} (другой price: ${phase1.items[0]?.price})`);
          skipped++;
          continue;
        }
        
        // Проверяем что осталась хотя бы 1 итерация
        const currentPhaseIndex = schedule.current_phase;
        const currentIteration = phases[currentPhaseIndex]?.metadata?.current_iteration || 0;
        
        if (phase1.iterations && currentIteration >= phase1.iterations) {
          console.log(`⏭️  Пропускаю ${schedule.id} (все 3 итерации уже завершены)`);
          skipped++;
          continue;
        }
        
        console.log(`\n🔄 Обновляю ${schedule.id}...`);
        console.log(`   Customer: ${schedule.customer}`);
        console.log(`   Текущая итерация: ${currentIteration} / ${phase1.iterations}`);
        
        // Обновляем schedule, добавляя вторую фазу
        // Для фазы 1 используем только необходимые поля
        const phase1Update = {
          items: phase1.items.map(item => ({ price: item.price })),
          iterations: phase1.iterations,
        };
        
        // Добавляем опциональные поля только если они есть
        if (phase1.start_date) {
          phase1Update.start_date = phase1.start_date;
        }
        // Добавляем end_date если есть, иначе вычисляем на основе iterations и billing interval
        if (phase1.end_date) {
          phase1Update.end_date = phase1.end_date;
        }
        if (phase1.default_payment_method) {
          phase1Update.default_payment_method = phase1.default_payment_method;
        }
        if (phase1.collection_method) {
          phase1Update.collection_method = phase1.collection_method;
        }
        if (phase1.proration_behavior) {
          phase1Update.proration_behavior = phase1.proration_behavior;
        }
        
        const updated_schedule = await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: 'release', // ✅ Подписка продолжается после завершения фаз
          phases: [
            phase1Update,
            {
              // ФАЗА 2: Новая! Бесконечная подписка $49/месяц
              items: [{ price: PRICE_49_MONTHLY }],
              default_payment_method: phase1.default_payment_method || undefined,
              collection_method: 'charge_automatically',
              proration_behavior: 'none',
            }
          ]
        });
        
        console.log(`   ✅ Обновлен! Теперь ${updated_schedule.phases.length} фазы`);
        console.log(`   Фаза 2 начнется: ${new Date(updated_schedule.phases[1].start_date * 1000).toISOString()}`);
        updated++;
        
      } catch (err) {
        console.error(`   ❌ Ошибка при обновлении ${schedule.id}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`⏭️  Пропущено: ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
    process.exit(1);
  }
}

// Запуск
migrateSchedules();
