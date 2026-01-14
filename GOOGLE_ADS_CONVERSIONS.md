# Google Ads Конверсии - Настройка

## Google Ads Account ID
**AW-17824079146**

---

## Структура конверсий

### 🎯 PRIMARY CONVERSION (Основная)

#### 1. Purchase - Покупка Отчета
- **Название**: Purchase
- **Категория**: Purchase (Покупка)
- **Страница**: `/purchase-confirmation.html`
- **Триггер**: Успешная оплата Stripe
- **Send To**: `AW-17824079146/l62hCKPTndgbEKq6I7NC`
- **Код события**:
```javascript
gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/l62hCKPTndgbEKq6I7NC',
    'transaction_id': setupIntentId
});
```

**DataLayer события**:
```javascript
// Событие 1: purchase
window.dataLayer.push({
    'event': 'purchase',
    'transaction_id': setupIntentId || '',
    'value': 1.0,
    'currency': 'USD'
});

// Событие 2: POKUPKA (дубликат для дополнительного отслеживания)
window.dataLayer.push({
    'event': 'POKUPKA',
    'transaction_id': setupIntentId || '',
    'value': 1.0,
    'currency': 'USD'
});
```

---

### 🔸 SECONDARY CONVERSIONS (Дополнительные)

#### 2. Email Collected - Сбор Email (после оплаты)
- **Название**: Email Collected
- **Категория**: Lead (Лид)
- **Страница**: `/email-capture.html`
- **Триггер**: Отправка email формы (ПОСЛЕ оплаты)
- **Label**: `C-ywCOm90-EbEKq6l7NC`
- **Код события**:
```javascript
gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/C-ywCOm90-EbEKq6l7NC',
    'transaction_id': vin + '_' + Date.now()
});
```

**DataLayer событие**:
```javascript
window.dataLayer.push({
    'event': 'email_collected',
    'vin': vin,
    'email': email,
    'timestamp': new Date().toISOString()
});
```

---

#### 3. Report Viewed - Просмотр Полного Отчета
- **Название**: Report Viewed
- **Категория**: Page View (Просмотр страницы)
- **Страница**: `/success.html`
- **Триггер**: Загрузка страницы успеха (после email)
- **Send To**: `AW-17824079146/I62hCKPTndgbEKq6l7NC`
- **Код события**:
```javascript
gtag('event', 'conversion', {
    'send_to': 'AW-17824079146/I62hCKPTndgbEKq6l7NC'
});
```

**DataLayer событие**:
```javascript
window.dataLayer.push({
    'event': 'report_viewed',
    'vin': vin
});
```

---

## User Journey (Путь пользователя) - ОБНОВЛЕННЫЙ

```
1. Главная страница (index.html)
   ↓
   Ввод VIN
   ↓
2. Report Page (report.html) - Предварительный отчет
   ↓
   Оплата через Stripe
   ↓
3. 🎯 Purchase Confirmation (purchase-confirmation.html)
   ↓
   Purchase - PRIMARY CONVERSION ✓
   ↓
4. 🔸 Email Capture (email-capture.html)
   ↓
   Email Collected - SECONDARY CONVERSION ✓
   ↓
5. 🔸 Success Page (success.html) - Полный отчет
   ↓
   Report Viewed - SECONDARY CONVERSION ✓
```

---

## Настройка в Google Ads

### ⚠️ ВАЖНЫЕ ИЗМЕНЕНИЯ ДЛЯ РУЧНОЙ НАСТРОЙКИ:

#### 1. Изменить приоритет конверсии "Purchase"
1. Войдите в Google Ads → **Инструменты и настройки** → **Конверсии**
2. Найдите конверсию **"Purchase"** (l62hCKPTndgbEKq6I7NC)
3. Измените настройку:
   - ✅ Включить в столбец **"Конверсии"** (Primary)
   - ✅ Установить как **Основное действие**
   - Подсчет: **Один** (One)
   - Ценность: **$1.00** (динамическая)

#### 2. Изменить приоритет конверсии "Email Collected"
1. Найдите конверсию **"Email Collected"** (C-ywCOm90-EbEKq6l7NC)
2. Измените настройку:
   - ⚪ Переместить в **"Все конверсии"** (Secondary)
   - ❌ Снять галочку **"Основное действие"**
   - Подсчет: **Каждая** (Every)
   - Ценность: Не указывать

#### 3. Оставить без изменений "Report Viewed"
- Остается в категории **Secondary**
- Включено в "Все конверсии"

---

### Настройка приоритетов (ИТОГОВАЯ)

В интерфейсе Google Ads должно быть:
- **Purchase** (l62hCKPTndgbEKq6I7NC): ✅ Primary (Основная) - включить в "Конверсии"
- **Email Collected** (C-ywCOm90-EbEKq6l7NC): ⚪ Secondary (Дополнительная) - "Все конверсии"
- **Report Viewed** (I62hCKPTndgbEKq6l7NC): ⚪ Secondary (Дополнительная) - "Все конверсии"

---

## Google Tag Manager (GTM)

### Что делать с триггером email_collected:

**НЕ УДАЛЯЙТЕ триггер `email_collected`** - он по-прежнему используется для аналитики!

Просто убедитесь, что:
1. Триггер `email_collected` существует в GTM
2. Он срабатывает при событии dataLayer `email_collected`
3. Связанные теги продолжают работать для отслеживания

---

## Файлы с реализацией

1. **index.html** - редирект на report.html (было: email-capture.html)
2. **mobile-first-screen.js** - редирект на report.html (было: email-capture.html)
3. **report.html** - страница предварительного отчета и оплаты
4. **api/checkout-trial-then-two-charges.js** - редирект на email-capture.html после оплаты
5. **email-capture.html** - страница сбора email ПОСЛЕ оплаты (Secondary conversion)
6. **success.html** - просмотр полного отчета (Secondary conversion)
7. **purchase-confirmation.html** - подтверждение покупки (Primary conversion)

---

## Проверка работы

### Тестирование нового флоу:
1. **Главная** → Введите VIN → должен открыться `/report.html`
2. **Report** → Оплата → должен открыться `/email-capture.html`
3. **Email Capture** → Введите email → должен открыться `/success.html`

### Google Ads Preview Mode:
1. Откройте Google Ads → Конверсии
2. Включите **Тестовый режим** (Test mode)
3. Пройдите весь путь пользователя
4. Проверьте последовательность конверсий:
   - ✅ Purchase (Primary) - должна сработать ПЕРВОЙ
   - ✅ Email Collected (Secondary) - должна сработать ПОСЛЕ оплаты
   - ✅ Report Viewed (Secondary) - должна сработать ПОСЛЕДНЕЙ

---

## Примечания

⚠️ **Важно**: 
- Конверсия "Purchase" теперь ОСНОВНАЯ (Primary)
- Email собирается ПОСЛЕ оплаты, а не до
- Это увеличивает конверсию на этапе payment, т.к. не требуем email до оплаты

📊 **Рекомендации**:
- Оптимизируйте кампании под Primary конверсию (Purchase)
- Следите за воронкой: VIN Entry → Report View → Purchase → Email → Full Report
- Email Collected можно использовать для ремаркетинга
