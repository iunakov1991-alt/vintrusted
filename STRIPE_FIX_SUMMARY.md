# Исправление проблемы с платежкой Stripe на странице отчета

## Проблема
На странице `report.html` не отображалась платежная форма Stripe.

## Причины
1. Отсутствовал файл `/public/vin-stripe.js` - основной скрипт виджета оплаты
2. Отсутствовал API endpoint `/api/stripe-config.js` для получения публичного ключа Stripe
3. Неправильная настройка роутинга в `vercel.json` - `/api/stripe-config` указывал на неправильный файл

## Исправления

### 1. Восстановлен файл vin-stripe.js
- Скопирован из бэкапа: `backup-20251130-000003/public/vin-stripe.js`
- Размещен в: `/public/vin-stripe.js`
- Размер: 10KB

### 2. Создан API endpoint stripe-config.js
- Создан файл: `/api/stripe-config.js`
- Функция: Возвращает STRIPE_PUBLISHABLE_KEY из переменных окружения
- Включает CORS headers для кросс-доменных запросов

### 3. Обновлен vercel.json
Добавлены/исправлены следующие конфигурации:

#### Builds:
```json
{
  "src": "api/stripe-config.js",
  "use": "@vercel/node"
},
{
  "src": "api/collect-vin.js",
  "use": "@vercel/node"
},
{
  "src": "public/**/*.js",
  "use": "@vercel/static"
}
```

#### Rewrites:
```json
{
  "source": "/api/stripe-config",
  "destination": "/api/stripe-config.js"
},
{
  "source": "/api/collect-vin",
  "destination": "/api/collect-vin.js"
}
```

## Что нужно проверить в Vercel

### Переменные окружения (Environment Variables)
Убедитесь, что в настройках Vercel проекта установлены:

1. **STRIPE_PUBLISHABLE_KEY** - публичный ключ Stripe (начинается с `pk_test_` или `pk_live_`)
2. **STRIPE_SECRET_KEY** - секретный ключ Stripe (начинается с `sk_test_` или `sk_live_`)
3. **PRICE_49_EVERY_10D** - ID цены в Stripe для подписки $49 каждые 10 дней

### Как добавить переменные в Vercel:
1. Зайдите в проект на vercel.com
2. Settings → Environment Variables
3. Добавьте каждую переменную для всех окружений (Production, Preview, Development)

## Тестирование

После деплоя проверьте:

1. Откройте страницу: `https://vintrusted.com/report.html?vin=1HGCM82633A004352`
2. Должна загрузиться платежная форма Stripe в правой колонке
3. Проверьте консоль браузера (F12) на наличие ошибок
4. Попробуйте ввести тестовую карту: `4242 4242 4242 4242`

## Файлы, которые были изменены

1. `/public/vin-stripe.js` - восстановлен из бэкапа
2. `/api/stripe-config.js` - создан новый файл
3. `/vercel.json` - обновлены builds и rewrites

## Деплой

Для применения изменений выполните:

```bash
git add .
git commit -m "Fix Stripe payment widget on report page"
git push origin main
```

Vercel автоматически задеплоит изменения.

## Дополнительная информация

- Виджет использует Stripe Payment Element API
- Поддерживает карты и Apple Pay / Google Pay
- Цена: $3.00 за отчет + подписка $49 каждые 10 дней (3 платежа)
- После оплаты пользователь перенаправляется на `/payment-success.html`

