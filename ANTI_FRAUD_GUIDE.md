# 🚫 РУКОВОДСТВО ПО БЛОКИРОВКЕ МОШЕННИКОВ

## 📋 БЫСТРЫЙ ДОСТУП

### 1. Найти данные мошенника:
```bash
cd /Users/dmitrii/Desktop/vintrusted
node scripts/get-customer-ip.js
```
Отредактируй `email` в скрипте на нужный.

### 2. Заблокировать карту:
Открой `/Users/dmitrii/Desktop/vintrusted/api/checkout-trial-then-two-charges.js`

Добавь `card_fingerprint` в массив:
```javascript
const BLOCKED_CARD_FINGERPRINTS = [
  'fSld43eVZnTFqUDo', // Террорист с 8 покупками
  'zwYHnaH0E2dRrT9B', // tomiboss@icloud.com
  'НОВЫЙ_FINGERPRINT', // Описание
];
```

### 3. Заблокировать IP:
В том же файле добавь IP:
```javascript
const BLOCKED_IP_ADDRESSES = [
  '123.45.67.89', // tomiboss@icloud.com
  'НОВЫЙ_IP', // Описание
];
```

### 4. Деплой:
```bash
git add .
git commit -m "Block fraudulent user"
git push
```

---

## 🎯 ТИПЫ БЛОКИРОВОК

### A) БАН + ОТМЕНА ПОДПИСКИ (полный бан)
```javascript
// 1. Добавь fingerprint в BLOCKED_CARD_FINGERPRINTS
// 2. Отмени подписку в Stripe Dashboard:
//    stripe.com/customers/cus_XXX → Subscriptions → Cancel
```

### B) БАН НОВЫХ ПОКУПОК, НО ПУСТЬ ПЛАТИТ (текущий случай)
```javascript
// 1. Добавь fingerprint в BLOCKED_CARD_FINGERPRINTS
// 2. НЕ отменяй подписку в Stripe
// ✅ Новые покупки - блокируются
// ✅ Существующая подписка - работает (пусть платит $49)
```

---

## 🔍 КАК РАБОТАЕТ ЗАЩИТА

### 1️⃣ IP-блокировка
```
Проверяется при создании SetupIntent:
create-setup-intent.js → Логирует IP
checkout-trial-then-two-charges.js → Проверяет BLOCKED_IP_ADDRESSES
```

### 2️⃣ Card Fingerprint блокировка
```
Проверяется при создании Customer:
checkout-trial-then-two-charges.js → Проверяет BLOCKED_CARD_FINGERPRINTS
```

### 3️⃣ "1 карта = 1 отчет"
```
Автоматически:
- Сохраняет card_fingerprint в metadata Customer
- Проверяет дубликаты перед созданием нового Customer
```

### 4️⃣ Recurring charges НЕ блокируются
```
ВАЖНО: Существующие подписки продолжают работать!
- Блокировка срабатывает только при НОВОЙ покупке
- Recurring $49 charges проходят автоматически через Stripe
```

---

## 📊 ТЕКУЩИЕ БАНЫ

### Заблокированные карты:
1. **fSld43eVZnTFqUDo**
   - Причина: 8 покупок с одной карты
   - Статус: Полный бан
   
2. **zwYHnaH0E2dRrT9B**
   - Email: tomiboss@icloud.com
   - Customer: cus_TnePJIi8fzXSid
   - Zip: 33155 (Miami, FL)
   - Подписка: ✅ Активна (не отменена, пусть платит)
   - Новые покупки: 🚫 Заблокированы

### Заблокированные IP:
- Пока нет (будут добавляться при обнаружении)

---

## 🛠️ СКРИПТЫ

### `get-customer-ip.js`
Находит customer по email и показывает:
- Customer ID
- Card Fingerprint
- IP Address (если логируется)
- Активные подписки
- Billing address

**Использование:**
```javascript
// Отредактируй email в скрипте:
const email = 'НОВЫЙ_EMAIL@example.com';

// Запусти:
node scripts/get-customer-ip.js
```

---

## ⚠️ ВАЖНО

### НЕ БЛОКИРУЙ СЛУЧАЙНО ХОРОШИХ КЛИЕНТОВ!
- Проверь, что это действительно мошенник
- Посмотри историю платежей
- Убедись, что не спутал с легитимным покупателем

### RECURRING CHARGES ПРОДОЛЖАТ РАБОТАТЬ
- Блокировка работает только для НОВЫХ покупок
- Существующие subscriptions не затрагиваются
- Если хочешь остановить платежи → отмени subscription в Stripe Dashboard

### IP ЛОГИРУЕТСЯ ТОЛЬКО ПОСЛЕ ДЕПЛОЯ
- До деплоя сегодня IP не логировался
- Все новые покупки после деплоя будут иметь IP в metadata

---

## 📞 КОГДА БАНИТЬ

### БАН СРАЗУ:
- Множественные покупки с одной карты (3+)
- Явное мошенничество (виртуальные карты + много покупок)
- Chargeback requests

### НЕ БАНИТЬ:
- Одна покупка
- Failed payment (может быть honest mistake)
- Просто prepaid карта (если не злоупотребление)

---

## 🚀 БЫСТРЫЕ КОМАНДЫ

```bash
# Найти мошенника:
node scripts/get-customer-ip.js

# Добавить в бан:
# Редактируй: api/checkout-trial-then-two-charges.js
# → BLOCKED_CARD_FINGERPRINTS или BLOCKED_IP_ADDRESSES

# Деплой:
git add . && git commit -m "Block fraud" && git push

# Отменить подписку (если нужно):
# → Stripe Dashboard → Customers → Cancel Subscription
```

---

**Последнее обновление: 16 января 2026**
