# 📥 Настройка Конверсии "Download Report" в Google Ads

**Дата:** 22 февраля 2026  
**Цель:** Добавить быструю конверсию "Скачать/Показать отчет" как дополнительный сигнал для Google Ads Smart Bidding

---

## 🎯 Зачем Нужна Эта Конверсия?

### Проблема с Tier-Based:
- ✅ Tier-based работает (+21.8% разница Premium vs Medium)
- ❌ НО: Google Ads получает сигнал только через **3 дня** (когда проходит $49)
- ❌ Smart Bidding учится **медленно** из-за задержки

### Решение - Добавить "Download Report":
- ⚡ **Мгновенный сигнал** - конверсия происходит через 1-2 минуты после клика
- 🎯 **Показывает вовлеченность** - пользователь реально открыл отчет
- 📊 **Комбо эффект** - Google Ads учится на 3 сигналах вместо 1:
  1. **Tier** ($25 Premium / $5 Medium) - мгновенно
  2. **Download Report** ($10) - через минуту ⭐ **НОВОЕ**
  3. **$49 Payment** ($49) - через 3 дня

---

## 📋 Шаг 1: Создание Конверсии в Google Ads UI

### 1.1 Войдите в Google Ads
- Откройте [ads.google.com](https://ads.google.com)
- Выберите аккаунт **AW-17824079146**

### 1.2 Создайте Новую Конверсию
1. Перейдите в **Tools & Settings** (⚙️) → **Conversions**
2. Нажмите **+ New conversion action**
3. Выберите **Website**

### 1.3 Настройте Параметры

#### **Goal and action optimization:**
- **Category:** Purchase/Sale
- **Conversion name:** `Download Report`
- **Value:** Use the same value for each conversion
  - **Amount:** `10` USD
- **Count:** One (рекомендуется) или Every (если хотите считать каждый просмотр)

#### **Attribution settings:**
- **Click-through conversion window:** 30 days
- **Engaged-view conversion window:** 1 day
- **Attribution model:** Data-driven (рекомендуется)

#### **Advanced settings:**
- **Include in "Conversions":** ✅ YES (важно!)

### 1.4 Получите Conversion Label

После создания Google Ads покажет:

```
Conversion ID: AW-17824079146
Conversion Label: XXXXX (это и есть ваш новый label)
```

**СКОПИРУЙТЕ Conversion Label!** Он нам понадобится.

---

## 📋 Шаг 2: Добавление Label в Код

### 2.1 Обновите `my-reports.html`

Найдите строку в функции `sendDownloadConversion()`:

```javascript
'send_to': 'AW-17824079146/DOWNLOAD_REPORT_LABEL', // TODO: Заменить на реальный label
```

Замените на:

```javascript
'send_to': 'AW-17824079146/ВАШ_НОВЫЙ_LABEL',
```

### 2.2 Пример:

Если ваш Conversion Label = `AbC123XyZ`, то строка должна быть:

```javascript
'send_to': 'AW-17824079146/AbC123XyZ',
```

---

## 📋 Шаг 3: Deploy

```bash
cd /Users/dmitrii/Desktop/vintrusted
vercel --prod
```

---

## 🧪 Шаг 4: Тестирование

### 4.1 Откройте Консоль Разработчика (Chrome DevTools)

1. Перейдите на `https://vintrusted.com/my-reports.html?email=YOUR_EMAIL`
2. Нажмите F12 → Console
3. Кликните "View Report" или "Download" на любом отчете

### 4.2 Проверьте Логи

Вы должны увидеть:

```
[VIEW-REPORT] 👀 User viewing report: 1HGCM82633A004352
[DOWNLOAD-CONVERSION] ✅ GCLID found: CjwKCAiA...
[DOWNLOAD-CONVERSION] 🎯 "view" conversion sent: {vin: "1HGCM82633A004352", value: "$10", gclid: "YES"}
```

### 4.3 Проверьте Network Tab

1. F12 → Network → Фильтр: `google`
2. После клика должен быть запрос к `google-analytics.com/g/collect` с параметрами:
   - `v=2`
   - `tid=G-XXXXXXXXX`
   - `en=conversion`

---

## 📊 Шаг 5: Мониторинг в Google Ads

### 5.1 Проверьте Конверсии

Через 1-2 часа после теста:

1. Google Ads → **Tools & Settings** → **Conversions**
2. Найдите **Download Report**
3. Проверьте столбец **Conversions (Last 7 days)**

### 5.2 Что Ожидать?

**Первые 7 дней:**
- Конверсий должно быть **больше** чем trial платежей ($2.99)
- Примерно **80-90%** пользователей открывают отчет после покупки
- Если trial = 20, то Download Report должно быть ~16-18

**Через 2 недели:**
- Smart Bidding начнет учитывать новый сигнал
- Качество трафика может улучшиться
- CPA может немного вырасти (но ROI должен остаться стабильным или улучшиться)

---

## 🎯 Настройка Bid Strategies (Опционально)

### Вариант 1: Оставить Как Есть
- Tier-based продолжает работать ($25 Premium / $5 Medium)
- "Download Report" добавляет дополнительный быстрый сигнал
- Google Ads учитывает все конверсии для Smart Bidding

### Вариант 2: Комбо Bid Adjustment

Если хотите больше контроля:

1. Создайте 3 отдельные кампании:
   - **Campaign A:** Target "Download Report" ($10 CPA)
   - **Campaign B:** Target "$49 Payment" ($49 CPA)
   - **Campaign C:** Комбо обе конверсии

2. Через 4 недели сравните ROI и выберите лучшую

---

## ⚠️ Важные Заметки

### 1. НЕ Отключайте Tier-Based!
- Tier-based ($25/$5) **работает** и предсказывает успех
- "Download Report" - это **ДОПОЛНЕНИЕ**, а не замена

### 2. GCLID Критичен
- Без GCLID конверсия не будет приписана к объявлению
- Убедитесь что `gclid-storage.js` и `gclid-cookie.js` работают
- Проверьте в консоли: `window.GclidStorage.get()`

### 3. Value = $10 Условный
- Это не реальная стоимость, а **signal value** для Google Ads
- $10 = "средняя ценность между $2.99 (trial) и $49 (full)"
- Можете экспериментировать: $5, $15, $20

### 4. Count = One vs Every
- **One** - считаем только первый просмотр отчета (рекомендуется)
- **Every** - считаем каждый просмотр (может быть шумно, если юзер открывает 10 раз)

---

## 🔧 Troubleshooting

### Конверсии Не Приходят

**Проблема:** Через 24 часа конверсии = 0

**Решение:**
1. Проверьте что Conversion Label правильный в коде
2. Проверьте консоль: есть ли ошибки?
3. Проверьте Network: идет ли запрос к `google-analytics.com`?
4. Проверьте Google Ads: статус конверсии = "Active"?

### GCLID Не Передается

**Проблема:** В логах `[DOWNLOAD-CONVERSION] ⚠️ No GCLID found`

**Решение:**
1. Проверьте URL: есть ли `?gclid=...` в адресной строке?
2. Проверьте localStorage: `localStorage.getItem('gclid')`
3. Проверьте cookies: `document.cookie`
4. Убедитесь что `gclid-storage.js` загружается **ДО** основного скрипта

### Конверсий Слишком Много

**Проблема:** Download Report > Trial Payments * 3

**Решение:**
1. Измените Count с "Every" на "One"
2. Проверьте дубликаты: может пользователь кликает 10 раз?
3. Добавьте debounce в `sendDownloadConversion()`:
   ```javascript
   let lastConversionTime = 0;
   const now = Date.now();
   if (now - lastConversionTime < 5000) return; // 5 sec cooldown
   lastConversionTime = now;
   ```

---

## 📈 Метрики для Отслеживания

### Неделя 1-2:
- ✅ Download Report конверсии приходят
- ✅ Ratio: Download / Trial ≈ 80-90%
- ⏳ Smart Bidding еще не учится

### Неделя 3-4:
- 📊 Smart Bidding начинает учитывать сигнал
- 📈 Quality Score может немного вырасти
- 💰 CPA может колебаться (+/- 20%)

### Месяц 2+:
- 🎯 Smart Bidding полностью обучен
- ✅ ROI должен улучшиться или остаться стабильным
- 📉 Fraud rate может снизиться (лучший targeting)

---

## ✅ Чеклист

- [ ] Создана конверсия "Download Report" в Google Ads UI
- [ ] Скопирован Conversion Label
- [ ] Обновлен код в `my-reports.html` с правильным label
- [ ] Deploy на Vercel
- [ ] Тест: кликнули View/Download, видим логи в консоли
- [ ] Через 24 часа: конверсия появилась в Google Ads
- [ ] Через 7 дней: Ratio Download/Trial ≈ 80-90%
- [ ] Tier-based НЕ отключен (Premium $25, Medium $5)

---

**Готово!** 🎉

Теперь у вас есть **3 сигнала** для Google Ads вместо 1:
1. 🟢 Tier-based (мгновенно, предсказывает качество)
2. 📥 Download Report (1 минута, показывает вовлеченность)
3. 💰 $49 Payment (3 дня, финальное подтверждение)

Google Ads Smart Bidding будет учиться **быстрее** и **точнее**!
