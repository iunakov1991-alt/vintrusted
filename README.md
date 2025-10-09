# VIN Check USA 🚗

Онлайн-платформа для проверки VIN-номеров автомобилей в США. Получите полный отчет об автомобиле за $1 с автоматической подпиской $49/месяц.

## 🚀 Возможности

- **Полная проверка VIN** - Получите детальный отчет об автомобиле за $1
- **Автоматическая подписка** - $49/месяц за неограниченные проверки
- **Безопасные платежи** - Интеграция со Stripe
- **Мгновенные результаты** - Отчет готов за секунды
- **Мобильная адаптация** - Работает на всех устройствах
- **Печать и экспорт** - Сохраните отчет в PDF

## 📋 Что включает отчет

- ✅ Базовая информация об автомобиле
- ✅ История регистрации и владельцев
- ✅ Аварии и повреждения
- ✅ Финансовая информация (залоги, лизинг)
- ✅ История технического обслуживания
- ✅ Отзывы и кампании безопасности
- ✅ Рыночная стоимость и анализ

## 🛠 Установка и запуск

### Требования
- Node.js 16+ 
- npm или yarn
- Stripe аккаунт

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/your-username/vin-check-usa.git
cd vin-check-usa
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**
```bash
cp env.example .env
```

Отредактируйте `.env` файл и добавьте ваши ключи Stripe:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

4. **Запустите сервер**
```bash
# Для разработки
npm run dev

# Для продакшена
npm start
```

5. **Откройте в браузере**
```
http://localhost:3000
```

## 🔧 Настройка Stripe

### 1. Создайте аккаунт Stripe
- Зарегистрируйтесь на [stripe.com](https://stripe.com)
- Получите тестовые ключи из Dashboard

### 2. Создайте продукты и цены
```bash
# Создайте продукт для проверки VIN ($1)
stripe products create --name "VIN Check" --description "Single VIN report"

# Создайте цену для продукта
stripe prices create --product prod_xxx --unit-amount 100 --currency usd

# Создайте продукт для подписки ($49/месяц)
stripe products create --name "VIN Check Subscription" --description "Unlimited VIN checks"

# Создайте цену для подписки
stripe prices create --product prod_yyy --unit-amount 4900 --currency usd --recurring interval=month
```

### 3. Настройте Webhook
- В Stripe Dashboard перейдите в Webhooks
- Добавьте endpoint: `https://yourdomain.com/api/webhook`
- Выберите события: `payment_intent.succeeded`, `invoice.payment_succeeded`, `customer.subscription.deleted`

## 📁 Структура проекта

```
vin-check-usa/
├── index.html          # Главная страница
├── report.html         # Страница отчета
├── styles.css          # Основные стили
├── report.css          # Стили для отчета
├── script.js           # Основной JavaScript
├── report.js           # JavaScript для отчета
├── server.js           # Express сервер
├── package.json        # Зависимости
├── env.example         # Пример переменных окружения
└── README.md           # Документация
```

## 🔌 API Endpoints

### POST /api/vin-check
Проверка VIN-номера
```json
{
  "vin": "1HGBH41JXMN109186"
}
```

### POST /api/create-payment-intent
Создание платежа
```json
{
  "vin": "1HGBH41JXMN109186",
  "amount": 100
}
```

### POST /api/create-subscription
Создание подписки
```json
{
  "customerId": "cus_xxx",
  "priceId": "price_xxx"
}
```

## 🎨 Кастомизация

### Изменение дизайна
- Отредактируйте `styles.css` для изменения цветов и стилей
- Основные цвета: `#2563eb` (синий), `#fbbf24` (желтый)

### Добавление новых функций
- Расширьте `script.js` для дополнительной функциональности
- Добавьте новые API endpoints в `server.js`

## 🚀 Деплой

### Heroku
```bash
# Установите Heroku CLI
npm install -g heroku

# Логин в Heroku
heroku login

# Создайте приложение
heroku create your-app-name

# Добавьте переменные окружения
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Деплой
git push heroku main
```

### Vercel
```bash
# Установите Vercel CLI
npm install -g vercel

# Деплой
vercel --prod
```

## 📊 Аналитика и мониторинг

### Stripe Dashboard
- Отслеживайте платежи и подписки
- Анализируйте конверсию
- Настройте уведомления

### Google Analytics
Добавьте в `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔒 Безопасность

- Все платежи обрабатываются через Stripe
- VIN номера валидируются на сервере
- HTTPS обязательно для продакшена
- Регулярно обновляйте зависимости

## 📞 Поддержка

- Email: support@vincheckusa.com
- Телефон: +1 (555) 123-4567
- Документация: [docs.vincheckusa.com](https://docs.vincheckusa.com)

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Сделайте коммит изменений
4. Отправьте Pull Request

## 📈 Roadmap

- [ ] Интеграция с реальными VIN API
- [ ] Мобильное приложение
- [ ] API для партнеров
- [ ] Расширенная аналитика
- [ ] Многоязычная поддержка

---

**VIN Check USA** - Надежная проверка автомобилей по VIN-номеру в США 🚗✨
