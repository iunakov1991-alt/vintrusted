# Система отслеживания конверсий

## Обзор

Система автоматически отслеживает все конверсии (оплаты) на сайте и собирает следующие данные:

- **VIN код** - код автомобиля
- **A/B вариант** - какая версия сайта показалась пользователю (с badge или без)
- **Устройство** - Desktop или Mobile
- **Источник трафика** - utm_source, utm_medium, utm_campaign
- **IP адрес** и User Agent
- **Дата и время** конверсии

## Как это работает

### 1. Логирование конверсии

Когда пользователь завершает оплату, система автоматически:

1. Извлекает данные из Stripe Setup Intent metadata
2. Определяет устройство по User Agent
3. Сохраняет все данные в Upstash KV
4. Индексирует по дате, A/B варианту, устройству и источнику

Код: `/api/send-receipt-and-report.js`

### 2. A/B вариант и UTM метки

При создании платежа передаются:

- `ab_variant` - из localStorage (устанавливается в `/public/mobile-only.js`)
- `utm_source`, `utm_medium`, `utm_campaign` - из URL параметров

Код: 
- `/api/create-setup-intent.js` - создание Setup Intent с metadata
- `/public/vin-stripe.js` - отправка данных из клиента

### 3. API для отчетов

**Endpoint:** `GET /api/conversion-report`

**Параметры:**
- `startDate` - дата начала (YYYY-MM-DD), по умолчанию сегодня
- `endDate` - дата окончания (YYYY-MM-DD), по умолчанию сегодня
- `variant` - фильтр по A/B варианту (variant_a, variant_b)
- `device` - фильтр по устройству (desktop, mobile)
- `source` - фильтр по источнику трафика

**Пример запроса:**
```bash
curl "https://vintrusted.com/api/conversion-report?startDate=2026-01-03&endDate=2026-01-03"
```

**Пример ответа:**
```json
{
  "success": true,
  "dateRange": {
    "start": "2026-01-03",
    "end": "2026-01-03"
  },
  "stats": {
    "total": 5,
    "byVariant": {
      "variant_a": 3,
      "variant_b": 2
    },
    "byDevice": {
      "desktop": 3,
      "mobile": 2
    },
    "bySource": {
      "google": 4,
      "direct": 1
    }
  },
  "conversions": [...]
}
```

## Админ панель

**URL:** https://vintrusted.com/conversion-analytics.html

### Возможности:

1. **Фильтрация по дате** - выберите диапазон дат
2. **Фильтрация по A/B варианту** - посмотрите, какой вариант лучше конвертирует
3. **Фильтрация по устройству** - сравните Desktop vs Mobile
4. **Статистика** - общее количество конверсий и разбивка по категориям
5. **Таблица конверсий** - детальная информация по каждой конверсии
6. **Экспорт в CSV** - выгрузите данные для анализа в Excel

### Как пользоваться:

1. Откройте https://vintrusted.com/conversion-analytics.html
2. Выберите период (по умолчанию сегодня)
3. Примените фильтры если нужно
4. Нажмите "Generate Report"
5. Для экспорта нажмите "Export CSV"

## Хранение данных

Данные хранятся в **Upstash Redis (KV)** со следующей структурой:

### Keys:

```
conversion:{id}                          - полная информация о конверсии
conversions:daily:{YYYY-MM-DD}           - индекс конверсий по дате
conversions:variant:{variant}:{date}     - индекс по A/B варианту
conversions:device:{device}:{date}       - индекс по устройству
conversions:source:{source}:{date}       - индекс по источнику
```

### Срок хранения:

- Конверсии хранятся **90 дней**
- Индексы автоматически удаляются по истечении срока

## Интеграция с Google Ads

### UTM метки

Для отслеживания источника трафика добавьте UTM метки в URL Google Ads:

```
https://vintrusted.com/?utm_source=google&utm_medium=cpc&utm_campaign=vin_check_2026
```

Система автоматически:
1. Извлечет UTM параметры из URL
2. Сохранит их в Stripe metadata
3. Привяжет к конверсии

### Анализ эффективности

В админ панели вы увидите:
- Какая рекламная кампания дала больше конверсий
- Какой A/B вариант лучше работает с трафиком из Google Ads
- На каком устройстве больше конверсий

## API для программного доступа

### Получение отчета

```javascript
const response = await fetch('/api/conversion-report?startDate=2026-01-01&endDate=2026-01-31');
const data = await response.json();

console.log('Total conversions:', data.stats.total);
console.log('By variant:', data.stats.byVariant);
console.log('By device:', data.stats.byDevice);
```

### Логирование конверсии вручную (опционально)

```javascript
await fetch('/api/log-conversion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vin: '1HGBH41JXMN109186',
    abVariant: 'variant_a',
    device: 'mobile',
    source: 'google',
    medium: 'cpc',
    campaign: 'vin_check_2026'
  })
});
```

## Примеры использования

### Сравнение A/B вариантов за месяц

```bash
curl "https://vintrusted.com/api/conversion-report?startDate=2026-01-01&endDate=2026-01-31"
```

Смотрите на `stats.byVariant` для сравнения.

### Анализ эффективности Google Ads кампании

```bash
curl "https://vintrusted.com/api/conversion-report?startDate=2026-01-03&source=google"
```

### Сравнение Desktop vs Mobile

```bash
# Desktop
curl "https://vintrusted.com/api/conversion-report?device=desktop"

# Mobile
curl "https://vintrusted.com/api/conversion-report?device=mobile"
```

## Расчет ROI

### Формула:

```
CPC (Cost Per Click) = Бюджет / Клики
CR (Conversion Rate) = Конверсии / Клики
CPA (Cost Per Acquisition) = Бюджет / Конверсии
ROI = (Выручка - Расходы) / Расходы * 100%
```

### Пример расчета:

- **Бюджет:** $1000
- **Клики:** 909 (при CPC $1.10)
- **Конверсии:** 10 (из админ панели)
- **CR:** 10 / 909 = 1.1%
- **CPA:** $1000 / 10 = $100
- **Выручка:** 10 * $3 = $30 (первый платеж)
- **ROI:** ($30 - $1000) / $1000 = -97% (убыток на первом платеже)

**Важно:** Учитывайте recurring платежи $49 через 10, 20, 30 дней для полного расчета ROI.

## Troubleshooting

### Конверсии не записываются

1. Проверьте логи Vercel Functions: `/api/send-receipt-and-report`
2. Убедитесь что Upstash KV настроен (переменные окружения)
3. Проверьте что Stripe metadata содержит нужные данные

### Не отображаются UTM метки

1. Убедитесь что URL содержит utm параметры
2. Проверьте что параметры передаются в `/api/create-setup-intent`
3. Проверьте Stripe metadata в Setup Intent

### A/B вариант показывает "unknown"

1. Убедитесь что `/public/mobile-only.js` устанавливает localStorage
2. Проверьте что `ab_variant` передается в `/api/create-setup-intent`
3. Проверьте GTM dataLayer содержит правильные данные

## Поддержка

Все логи доступны в Vercel Functions Dashboard:
https://vercel.com/dmitriis-projects/vintrusted/logs

Ключевые функции для мониторинга:
- `/api/send-receipt-and-report` - логирование конверсий
- `/api/create-setup-intent` - передача metadata
- `/api/conversion-report` - генерация отчетов

