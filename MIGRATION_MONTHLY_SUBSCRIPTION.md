# 🔄 ИНСТРУКЦИЯ: Миграция на месячную подписку

## 📋 Что мы делаем?

**Старая логика:**
- День 0: $1 (trial)
- День 10, 20, 30: $49 (3 списания)
- ❌ **КОНЕЦ** (подписка отменяется)

**Новая логика:**
- День 0: $1 (trial)
- День 10, 20, 30: $49 (3 списания каждые 10 дней)
- ✅ День 60, 90, 120...: **$49/месяц НАВСЕГДА** (до отмены пользователем)

---

## 🚀 ШАГ 1: Создай новый Price в Stripe

### В Stripe Dashboard:

1. Открой [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Найди продукт **"Report subs"**
3. Нажми **"Add another price"**
4. Заполни:
   - **Price:** `49.00 USD`
   - **Billing period:** `Monthly` (каждый месяц)
   - **Payment type:** `Recurring`
5. Нажми **"Save"**
6. **СКОПИРУЙ `price_id`** (начинается с `price_xxxxx`)

Например: `price_1Qabcd1234567890`

---

## 🔧 ШАГ 2: Добавь переменную окружения в Vercel

### В терминале:

```bash
cd /Users/dmitrii/Desktop/vintrusted

# Добавляем переменную для всех окружений
vercel env add PRICE_49_MONTHLY production
# Вставь скопированный price_id

vercel env add PRICE_49_MONTHLY preview
# Вставь тот же price_id

vercel env add PRICE_49_MONTHLY development
# Вставь тот же price_id
```

---

## 📦 ШАГ 3: Деплой обновленного кода

```bash
cd /Users/dmitrii/Desktop/vintrusted
git add .
git commit -m "feat: add monthly subscription after 3x $49 payments"
git push origin main
```

После деплоя **новые пользователи** будут автоматически переходить на месячную подписку! ✅

---

## 🔄 ШАГ 4: Мигрируй существующих пользователей

### Создай `.env.local` с Stripe ключами:

```bash
cd /Users/dmitrii/Desktop/vintrusted

# Создай файл .env.local
cat > .env.local << 'EOF'
STRIPE_SECRET_KEY=sk_live_xxxxx
PRICE_49_EVERY_10D=price_xxxxx
PRICE_49_MONTHLY=price_xxxxx
EOF
```

**Найти ключи:**
- `STRIPE_SECRET_KEY`: `vercel env pull .env.local` или [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
- `PRICE_49_EVERY_10D`: `vercel env pull .env.local`
- `PRICE_49_MONTHLY`: price_id который ты создал в ШАГ 1

---

### Запусти скрипт миграции:

```bash
cd /Users/dmitrii/Desktop/vintrusted

# Установи зависимости (если нужно)
npm install stripe dotenv

# Запусти миграцию
node scripts/migrate-to-monthly-subscription.js
```

**Что произойдет:**
- Скрипт найдет все активные Subscription Schedules
- Проверит, что это подписка с 3 итерациями по $49 каждые 10 дней
- Добавит вторую фазу: $49/месяц навсегда
- Покажет статистику: сколько обновлено, пропущено, ошибок

---

## ✅ Проверка

### После миграции проверь в Stripe Dashboard:

1. Открой [Stripe Dashboard → Customers](https://dashboard.stripe.com/customers)
2. Выбери любого клиента
3. Открой **Subscriptions → Schedule**
4. Должно быть **2 фазы:**
   - **Phase 1:** 3 iterations, $49 every 10 days
   - **Phase 2:** $49/month (no end date)

---

## 🎯 Готово!

Теперь:
- ✅ **Новые пользователи** автоматически переходят на месячную подписку
- ✅ **Существующие пользователи** мигрированы (если запустил скрипт)
- ✅ **Все подписки** будут продолжаться до отмены пользователем

---

## 📞 Помощь

Если что-то пошло не так:
- Проверь логи в консоли: `vercel logs`
- Проверь Stripe Dashboard → Events
- Напиши мне - разберемся! 😊
