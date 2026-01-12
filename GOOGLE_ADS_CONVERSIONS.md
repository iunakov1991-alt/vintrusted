# Google Ads Конверсии - Настройка

## Google Ads Account ID
**AW-17824079146**

---

## Структура конверсий

### 🎯 PRIMARY CONVERSION (Основная)

#### 1. Email Collected - Сбор Email
- **Название**: Email Collected
- **Категория**: Lead (Лид)
- **Страница**: `/email-capture.html`
- **Триггер**: Отправка email формы
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

### 🔸 SECONDARY CONVERSIONS (Дополнительные)

#### 2. Report Viewed - Просмотр Отчета
- **Название**: Report Viewed
- **Категория**: Page View (Просмотр страницы)
- **Страница**: `/success.html`
- **Триггер**: Загрузка страницы успеха
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

#### 3. Purchase - Покупка Отчета
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

## User Journey (Путь пользователя)

```
1. Главная страница (index.html)
   ↓
   Ввод VIN
   ↓
2. 🎯 Email Capture (email-capture.html)
   ↓
   Email Collected - PRIMARY CONVERSION ✓
   ↓
3. Report Page (report.html)
   ↓
   Оплата через Stripe
   ↓
4. 🔸 Success Page (success.html)
   ↓
   Report Viewed - SECONDARY CONVERSION ✓
   ↓
5. 🔸 Purchase Confirmation (purchase-confirmation.html)
   ↓
   Purchase - SECONDARY CONVERSION ✓
```

---

## Настройка в Google Ads

### Создание конверсии "Email Collected"

1. Войдите в Google Ads → **Инструменты и настройки** → **Конверсии**
2. Нажмите **+ Новая конверсия**
3. Выберите **Веб-сайт**
4. Заполните параметры:
   - **Название**: Email Collected
   - **Категория**: Lead (Лид)
   - **Подсчет**: Каждая (Every)
   - **Окно конверсии**: 30 дней
   - **Окно взаимодействия с рекламой**: 1 день
   - **Модель атрибуции**: На основе данных или Последний клик
5. В разделе **Tag setup** выберите **Use Google tag**
6. Скопируйте **Conversion ID** и **Conversion Label**
7. Вставьте в код (уже реализовано в `email-capture.html`)

### Настройка приоритетов

В интерфейсе Google Ads установите:
- **Email Collected**: Primary (Основная) - включить в столбец "Конверсии"
- **Report Viewed**: Secondary (Дополнительная) - включить в "Все конверсии"
- **Purchase**: Secondary (Дополнительная) - включить в "Все конверсии"

---

## Файлы с реализацией

1. **email-capture.html** - страница сбора email (Primary conversion)
2. **success.html** - просмотр отчета (Secondary conversion)
3. **purchase-confirmation.html** - покупка (Secondary conversion)
4. **mobile-first-screen.js** - редирект на email-capture
5. **index.html** - редирект на email-capture

---

## Проверка работы

### Тестирование в браузере:
```javascript
// В консоли браузера на email-capture.html:
console.log(window.dataLayer); // Должен показать события

// Проверить gtag:
window.gtag('event', 'test', {'test': 'value'});
```

### Google Ads Preview Mode:
1. Откройте Google Ads → Конверсии
2. Включите **Тестовый режим** (Test mode)
3. Пройдите весь путь пользователя
4. Проверьте, что конверсии регистрируются

---

## Примечания

⚠️ **Важно**: 
- Конверсия "Email Collected" должна иметь label `email_collected` в Google Ads
- Убедитесь, что в Google Ads включен Google Tag (gtag.js)
- Проверьте, что домен vintrusted.com добавлен в настройки конверсий

📊 **Рекомендации**:
- Отслеживайте конверсии в Google Ads еженедельно
- Сравнивайте Email Collected → Report Viewed → Purchase для анализа воронки
- Оптимизируйте кампании под Primary конверсию (Email Collected)
