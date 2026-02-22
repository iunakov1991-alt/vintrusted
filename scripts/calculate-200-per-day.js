// ПРОГНОЗ: КОГДА ВЫРУЧКА ДОСТИГНЕТ $200/ДЕНЬ

console.log('💰 ПРОГНОЗ НАКОПЛЕНИЯ ДО $200/ДЕНЬ:\n');
console.log('='.repeat(100));

// Исходные данные
const TRIAL_PRICE = 1;
const PAYMENT_PRICE = 49;

// Текущее состояние (23 чистых триала)
const currentTrials = 23;
const premiumRatio = 0.65; // 65% Premium
const mediumRatio = 0.35; // 35% Medium

// Конверсии (консервативно)
const premiumConversion = [0.60, 0.50, 0.40]; // 1-й, 2-й, 3-й платежи
const mediumConversion = [0.30, 0.20, 0.15];

// Месячные сценарии
const scenarios = {
  february: {
    name: 'ФЕВРАЛЬ 2026',
    googleBudgetPerDay: 75,
    gdnBudgetPerDay: 0,
    metaBudgetPerDay: 0,
    googleCPA: 18, // Снизился после обучения
    trialsPerDay: 75 / 18, // ~4.2
    daysInMonth: 28
  },
  march: {
    name: 'МАРТ 2026',
    googleBudgetPerDay: 100,
    gdnBudgetPerDay: 30,
    metaBudgetPerDay: 0,
    googleCPA: 15, // Еще снизился
    gdnCPA: 30,
    trialsPerDay: (100 / 15) + (30 / 30), // 6.7 + 1 = 7.7
    daysInMonth: 31
  },
  april: {
    name: 'АПРЕЛЬ 2026',
    googleBudgetPerDay: 125,
    gdnBudgetPerDay: 50,
    metaBudgetPerDay: 50,
    googleCPA: 12,
    gdnCPA: 25,
    metaCPA: 35,
    trialsPerDay: (125 / 12) + (50 / 25) + (50 / 35), // 10.4 + 2 + 1.4 = 13.8
    daysInMonth: 30
  },
  may: {
    name: 'МАЙ 2026',
    googleBudgetPerDay: 150,
    gdnBudgetPerDay: 75,
    metaBudgetPerDay: 75,
    googleCPA: 12,
    gdnCPA: 22,
    metaCPA: 28,
    trialsPerDay: (150 / 12) + (75 / 22) + (75 / 28), // 12.5 + 3.4 + 2.7 = 18.6
    daysInMonth: 31
  }
};

function calculateMonthRevenue(month, previousRecurring = 0) {
  const trials = month.trialsPerDay * month.daysInMonth;
  const premium = trials * premiumRatio;
  const medium = trials * mediumRatio;
  
  // Выручка от триалов
  const trialRevenue = trials * TRIAL_PRICE;
  
  // Платежи от триалов (происходят в этом же месяце с задержкой)
  const payment1 = (premium * premiumConversion[0] + medium * mediumConversion[0]) * PAYMENT_PRICE;
  const payment2 = (premium * premiumConversion[1] + medium * mediumConversion[1]) * PAYMENT_PRICE;
  const payment3 = (premium * premiumConversion[2] + medium * mediumConversion[2]) * PAYMENT_PRICE;
  
  // Новые рекуррентные клиенты (кто прошел все 3 платежа)
  const newRecurring = (premium * premiumConversion[2] + medium * mediumConversion[2]) * 0.75; // 75% становятся рекуррентными
  
  // Выручка от рекуррентных
  const recurringRevenue = previousRecurring * PAYMENT_PRICE;
  
  const totalRevenue = trialRevenue + payment1 + payment2 + payment3 + recurringRevenue;
  const revenuePerDay = totalRevenue / month.daysInMonth;
  
  return {
    trials,
    trialRevenue,
    payment1,
    payment2,
    payment3,
    recurringRevenue,
    totalRevenue,
    revenuePerDay,
    newRecurring: Math.round(newRecurring * 10) / 10,
    totalRecurring: previousRecurring + newRecurring
  };
}

console.log('\n📅 МЕСЯЦ ЗА МЕСЯЦЕМ:\n');

// Январь (текущее состояние)
console.log('ЯНВАРЬ 2026 (ФАКТ):');
console.log('   Чистые триалы: 23');
console.log('   Выручка от триалов: $23');
console.log('   $49 платежей: $98 (уже прошли)');
console.log('   Ожидается от триалов: ~$1,381');
console.log('   Средняя выручка/день: ~$50 (с учетом задержек)');
console.log('');

// Текущие рекуррентные (старая система)
let recurringClients = 3; // 3 старых клиента

// Февраль
console.log('─'.repeat(100));
const feb = calculateMonthRevenue(scenarios.february, recurringClients);
recurringClients = feb.totalRecurring;

console.log(`\n${scenarios.february.name}:`);
console.log(`   Бюджет/день: $${scenarios.february.googleBudgetPerDay} (Google Search)`);
console.log(`   CPA: $${scenarios.february.googleCPA}`);
console.log(`   Триалы/день: ${scenarios.february.trialsPerDay.toFixed(1)}`);
console.log(`   Триалов за месяц: ${feb.trials.toFixed(0)}`);
console.log('');
console.log('   ВЫРУЧКА:');
console.log(`   - Триалы: $${feb.trialRevenue.toFixed(0)}`);
console.log(`   - 1-е платежи $49: $${feb.payment1.toFixed(0)}`);
console.log(`   - 2-е платежи $49: $${feb.payment2.toFixed(0)}`);
console.log(`   - 3-и платежи $49: $${feb.payment3.toFixed(0)}`);
console.log(`   - Рекуррентные: $${feb.recurringRevenue.toFixed(0)} (${recurringClients.toFixed(1)} клиентов)`);
console.log(`   ────────────────────────────────`);
console.log(`   💰 ИТОГО ЗА МЕСЯЦ: $${feb.totalRevenue.toFixed(0)}`);
console.log(`   💰 СРЕДНЯЯ ВЫРУЧКА/ДЕНЬ: $${feb.revenuePerDay.toFixed(2)}`);
console.log(`   🔄 Новых рекуррентных: ${feb.newRecurring} клиентов`);
console.log('');

// Март
console.log('─'.repeat(100));
const mar = calculateMonthRevenue(scenarios.march, recurringClients);
recurringClients = mar.totalRecurring;

console.log(`\n${scenarios.march.name}:`);
console.log(`   Бюджет/день: $${scenarios.march.googleBudgetPerDay} (Google) + $${scenarios.march.gdnBudgetPerDay} (GDN)`);
console.log(`   CPA Google: $${scenarios.march.googleCPA}, GDN: $${scenarios.march.gdnCPA}`);
console.log(`   Триалы/день: ${scenarios.march.trialsPerDay.toFixed(1)}`);
console.log(`   Триалов за месяц: ${mar.trials.toFixed(0)}`);
console.log('');
console.log('   ВЫРУЧКА:');
console.log(`   - Триалы: $${mar.trialRevenue.toFixed(0)}`);
console.log(`   - 1-е платежи $49: $${mar.payment1.toFixed(0)}`);
console.log(`   - 2-е платежи $49: $${mar.payment2.toFixed(0)}`);
console.log(`   - 3-и платежи $49: $${mar.payment3.toFixed(0)}`);
console.log(`   - Рекуррентные: $${mar.recurringRevenue.toFixed(0)} (${recurringClients.toFixed(1)} клиентов)`);
console.log(`   ────────────────────────────────`);
console.log(`   💰 ИТОГО ЗА МЕСЯЦ: $${mar.totalRevenue.toFixed(0)}`);
console.log(`   💰 СРЕДНЯЯ ВЫРУЧКА/ДЕНЬ: $${mar.revenuePerDay.toFixed(2)}`);
console.log(`   🔄 Новых рекуррентных: ${mar.newRecurring} клиентов`);

if (mar.revenuePerDay >= 200) {
  console.log(`   🎯 ✅ ДОСТИГНУТО $200/ДЕНЬ!`);
}
console.log('');

// Апрель
console.log('─'.repeat(100));
const apr = calculateMonthRevenue(scenarios.april, recurringClients);
recurringClients = apr.totalRecurring;

console.log(`\n${scenarios.april.name}:`);
console.log(`   Бюджет/день: $${scenarios.april.googleBudgetPerDay} (Google) + $${scenarios.april.gdnBudgetPerDay} (GDN) + $${scenarios.april.metaBudgetPerDay} (Meta)`);
console.log(`   Триалы/день: ${scenarios.april.trialsPerDay.toFixed(1)}`);
console.log(`   Триалов за месяц: ${apr.trials.toFixed(0)}`);
console.log('');
console.log('   ВЫРУЧКА:');
console.log(`   - Триалы: $${apr.trialRevenue.toFixed(0)}`);
console.log(`   - 1-е платежи $49: $${apr.payment1.toFixed(0)}`);
console.log(`   - 2-е платежи $49: $${apr.payment2.toFixed(0)}`);
console.log(`   - 3-и платежи $49: $${apr.payment3.toFixed(0)}`);
console.log(`   - Рекуррентные: $${apr.recurringRevenue.toFixed(0)} (${recurringClients.toFixed(1)} клиентов)`);
console.log(`   ────────────────────────────────`);
console.log(`   💰 ИТОГО ЗА МЕСЯЦ: $${apr.totalRevenue.toFixed(0)}`);
console.log(`   💰 СРЕДНЯЯ ВЫРУЧКА/ДЕНЬ: $${apr.revenuePerDay.toFixed(2)}`);
console.log(`   🔄 Новых рекуррентных: ${apr.newRecurring} клиентов`);

if (apr.revenuePerDay >= 200) {
  console.log(`   🎯 ✅ ДОСТИГНУТО $200/ДЕНЬ!`);
}
console.log('');

// Май
console.log('─'.repeat(100));
const may = calculateMonthRevenue(scenarios.may, recurringClients);
recurringClients = may.totalRecurring;

console.log(`\n${scenarios.may.name}:`);
console.log(`   Бюджет/день: $${scenarios.may.googleBudgetPerDay} (Google) + $${scenarios.may.gdnBudgetPerDay} (GDN) + $${scenarios.may.metaBudgetPerDay} (Meta)`);
console.log(`   Триалы/день: ${scenarios.may.trialsPerDay.toFixed(1)}`);
console.log(`   Триалов за месяц: ${may.trials.toFixed(0)}`);
console.log('');
console.log('   ВЫРУЧКА:');
console.log(`   - Триалы: $${may.trialRevenue.toFixed(0)}`);
console.log(`   - 1-е платежи $49: $${may.payment1.toFixed(0)}`);
console.log(`   - 2-е платежи $49: $${may.payment2.toFixed(0)}`);
console.log(`   - 3-и платежи $49: $${may.payment3.toFixed(0)}`);
console.log(`   - Рекуррентные: $${may.recurringRevenue.toFixed(0)} (${recurringClients.toFixed(1)} клиентов)`);
console.log(`   ────────────────────────────────`);
console.log(`   💰 ИТОГО ЗА МЕСЯЦ: $${may.totalRevenue.toFixed(0)}`);
console.log(`   💰 СРЕДНЯЯ ВЫРУЧКА/ДЕНЬ: $${may.revenuePerDay.toFixed(2)}`);
console.log(`   🔄 Новых рекуррентных: ${may.newRecurring} клиентов`);

if (may.revenuePerDay >= 200) {
  console.log(`   🎯 ✅ ДОСТИГНУТО $200/ДЕНЬ!`);
}
console.log('');

console.log('='.repeat(100));
console.log('\n🎯 ВЫВОДЫ:\n');

if (mar.revenuePerDay >= 200) {
  console.log(`✅ $200/ДЕНЬ ДОСТИГАЕТСЯ В МАРТЕ 2026 ($${mar.revenuePerDay.toFixed(2)}/день)`);
} else if (apr.revenuePerDay >= 200) {
  console.log(`✅ $200/ДЕНЬ ДОСТИГАЕТСЯ В АПРЕЛЕ 2026 ($${apr.revenuePerDay.toFixed(2)}/день)`);
} else if (may.revenuePerDay >= 200) {
  console.log(`✅ $200/ДЕНЬ ДОСТИГАЕТСЯ В МАЕ 2026 ($${may.revenuePerDay.toFixed(2)}/день)`);
}

console.log('');
console.log('КЛЮЧЕВЫЕ ДРАЙВЕРЫ:');
console.log('1. Снижение CPA (с $25 до $12-15)');
console.log('2. Масштабирование бюджета ($75 → $225/день)');
console.log('3. Добавление каналов (GDN в марте, Meta в апреле)');
console.log('4. Накопление рекуррентных клиентов');
console.log('');
console.log('='.repeat(100));
