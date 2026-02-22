# 🧪 Тест GCLID Конверсии - Пошаговая Инструкция

**Цель:** Проверить что tier-based конверсия ($25 Premium / $5 Medium) отправляется с кнопки "View Report" с правильным GCLID

---

## ✅ ШАГ 1: Получи Preview URL с GCLID

### 1.1 Открой Google Ads
```
https://ads.google.com
```

### 1.2 Найди Ad Preview Tool
```
Левое меню → Tools (🔧) → Planning → Ad Preview and Diagnosis
```

Или прямая ссылка:
```
https://ads.google.com/aw/adpreview
```

### 1.3 Настрой Preview
- **Location:** United States
- **Language:** English  
- **Device:** Desktop
- **Search term:** (твое ключевое слово, например "VIN check")

### 1.4 Найди Свое Объявление
- Нажми **Preview**
- Найди объявление для vintrusted.com
- **Правый клик** на заголовок → **Copy link address**

### 1.5 Получишь URL
```
https://vintrusted.com?gclid=EAIaIQobChMI...
```

**⏸️ СТОП! Скопируй этот URL и отправь мне первые символы gclid для проверки**

---

## ✅ ШАГ 2: Открой в Приватном Окне

### 2.1 Открой Incognito/Private
```
Chrome: Cmd+Shift+N (Mac) / Ctrl+Shift+N (Windows)
Safari: Cmd+Shift+N
Firefox: Cmd+Shift+P
```

### 2.2 Вставь URL с GCLID
```
https://vintrusted.com?gclid=EAIaIQobChMI...
```

### 2.3 Открой Console (F12)
```
Windows: F12
Mac: Cmd+Option+J
```

### 2.4 Проверь GCLID Сохранился
В Console введи:
```javascript
localStorage.getItem('gclid')
```

Должно вывести:
```
"EAIaIQobChMI..."
```

**⏸️ СТОП! Скопируй результат и отправь мне. Если null - что-то не так!**

---

## ✅ ШАГ 3: Пройди Флоу Покупки

### 3.1 Введи VIN
```
1HGCM82633A004352
```

### 3.2 Кликни "Get Report"

### 3.3 Оплати $2.99
Тестовая карта:
```
Number: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: 12345
Email: (любой, например test123@test.com)
```

### 3.4 Дождись purchase-confirmation.html
После оплаты увидишь страницу подтверждения

**⏸️ СТОП! НЕ закрывай окно, держи Console открытым**

---

## ✅ ШАГ 4: Проверь Tier в KV (Опционально)

### 4.1 Открой Vercel Dashboard
```
https://vercel.com
```

### 4.2 Найди KV Storage
```
Твой проект → Storage → KV
```

### 4.3 Найди Customer
Поиск по ключу:
```
customer:email:ТВОЙ_EMAIL
```

### 4.4 Проверь Tier
Должно быть:
```json
{
  "tier": "premium",
  "tier_value": 25.00
}
```
или
```json
{
  "tier": "medium", 
  "tier_value": 5.00
}
```

**⏸️ СТОП! Скриншот KV записи и отправь мне**

---

## ✅ ШАГ 5: Открой My Reports

### 5.1 Перейди на My Reports
```
https://vintrusted.com/my-reports.html?email=ТВОЙ_EMAIL
```

### 5.2 Убедись что Console Открыт (F12)

### 5.3 Проверь Customer Data Loaded
В Console должно быть:
```
[MY-REPORTS] ✅ Customer data loaded: {
  email: "...",
  tier: "premium",
  tier_value: 25
}
```

**⏸️ СТОП! Если tier: null - что-то не так. Скриншот и отправь мне**

---

## ✅ ШАГ 6: ГЛАВНЫЙ ТЕСТ - Кликни Кнопку!

### 6.1 Найди Кнопку "View Report"
Должна быть под отчетом с VIN

### 6.2 Кликни "View Report"

### 6.3 Смотри Логи в Console

**КРИТИЧНЫЕ ЛОГИ:**
```
[VIEW-REPORT] 👀 User viewing report: 1HGCM82633A004352

[DOWNLOAD-CONVERSION] 📊 Using tier-based value: premium = $25

[DOWNLOAD-CONVERSION] ✅ GCLID found: EAIaIQobChMI...

[DOWNLOAD-CONVERSION] 🎯 "view" conversion sent: {
  vin: "1HGCM82633A004352",
  tier: "🟢 PREMIUM",
  value: "$25",
  gclid: "YES"
}
```

**⏸️ СТОП! КРИТИЧНО - Сделай скриншот этих логов и отправь мне!**

---

## ✅ ШАГ 7: Проверь Google Ads (Через 1-2 Часа)

### 7.1 Зайди в Google Ads
```
https://ads.google.com
```

### 7.2 Открой Conversions
```
Tools & Settings → Conversions
```

### 7.3 Найди "$1 Trial - Premium/Medium"
Кликни на конверсию

### 7.4 Проверь Recent Conversions
Должна быть новая конверсия:
- **Date:** сегодня
- **Value:** $25 (Premium) или $5 (Medium)
- **Source:** vintrusted.com
- **Conversion ID:** твой GCLID

**⏸️ СТОП! Скриншот конверсии в Google Ads и отправь мне**

---

## ✅ ИТОГОВЫЙ ЧЕКЛИСТ

Отметь что сделано:

- [ ] Шаг 1: Получил URL с gclid из Google Ads Preview
- [ ] Шаг 2: Открыл в приватном окне, gclid сохранился
- [ ] Шаг 3: Прошел оплату $2.99
- [ ] Шаг 4: Проверил tier в KV (premium или medium)
- [ ] Шаг 5: Открыл my-reports.html, увидел customer data с tier
- [ ] Шаг 6: **ГЛАВНОЕ** - Кликнул кнопку, увидел логи с gclid: "YES"
- [ ] Шаг 7: Через 1-2 часа увидел конверсию в Google Ads

---

## ⚠️ Если Что-то Пошло Не Так

### Проблема: GCLID не сохранился (Шаг 2.4)
```
Решение:
1. Убедись что URL содержит ?gclid=
2. Попробуй другой браузер
3. Убедись что приватное окно
4. Напиши мне - разберемся
```

### Проблема: tier: null (Шаг 5.3)
```
Решение:
1. Проверь KV в Vercel
2. Если там нет tier - делай еще одну покупку
3. Напиши мне - разберемся
```

### Проблема: gclid: "NO" (Шаг 6.3)
```
Решение:
1. Проверь localStorage.getItem('gclid') в Console
2. Проверь document.cookie в Console
3. Возможно gclid потерялся - начни с Шага 1
4. Напиши мне - разберемся
```

### Проблема: Конверсия не появилась в Google Ads (Шаг 7.4)
```
Решение:
1. Подожди еще 1-2 часа (иногда задержка до 4 часов)
2. Проверь что в логах было "conversion sent: {gclid: YES}"
3. Проверь Conversion Label: MpIjCLKgpuYbEKq6l7NC
4. Напиши мне - разберемся
```

---

## 📞 Связь со Мной

**После каждого СТОП-шага отправляй мне:**
1. Скриншоты
2. Скопированные логи из Console
3. Результат (работает / не работает / ошибка)

**Не торопись, делай по шагам!** 🎯
