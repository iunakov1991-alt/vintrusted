# 🎯 Conversion Goal Information

## Название цели для Google Ads / Analytics

### **Название: `purchase_confirmed`**

---

## 📍 Где срабатывает конверсия

**URL:** `https://vintrusted.com/purchase-confirmation.html`

**Когда:** Сразу после успешной оплаты, перед показом отчета

---

## 🔧 Технические детали

### Google Ads Conversion ID:
```
AW-17824079146/1pFQCO7iz9UbEKq6l7NC
```

### Параметры конверсии:
- **Value:** $3.00 USD
- **Currency:** USD
- **Transaction ID:** Setup Intent ID из Stripe

### Google Analytics Event:
- **Event name:** `purchase`
- **Value:** $3.00
- **Currency:** USD
- **Items:** VIN Report

---

## 🎨 Что происходит на странице

1. ✅ **Подтверждение оплаты** - зеленая галочка с анимацией
2. 🙏 **Благодарность** - "Thank you for your purchase"
3. 🔄 **Анимация загрузки** - 10-секундный прогресс-бар
4. 📊 **Показ VIN** - отображение VIN номера
5. ⏱️ **Обратный отсчет** - "Redirecting in X seconds"
6. ➡️ **Автоматический редирект** - через 10 секунд на `/success.html` с отчетом

---

## 📊 Старая vs Новая цель

### ❌ Старая система:
- Конверсия на `/success.html`
- Пользователь сразу видит отчет
- Нет подтверждения покупки

### ✅ Новая система:
- Конверсия на `/purchase-confirmation.html`
- Пользователь видит подтверждение → ожидание → отчет
- Лучше UX и точнее tracking

---

## 🎯 Настройка в Google Ads

1. **Campaigns** → **Conversions**
2. **New conversion action** → **Website**
3. **Conversion name:** `purchase_confirmed`
4. **Value:** Use different values for each conversion → $3.00
5. **Count:** One
6. **Conversion window:** 30 days
7. **Attribution model:** Last click

---

## 📈 Настройка в Google Analytics 4

1. **Configure** → **Events**
2. Найдите event **`purchase`**
3. **Mark as conversion** - включите
4. **Conversion name:** `purchase_confirmed`

---

## 🔗 URL Flow

```
Оплата Stripe
    ↓
/purchase-confirmation.html?vin=XXX&setup_intent=YYY
    ↓ (Google Ads & Analytics events fire here)
    ↓
    ↓ (10 seconds animation)
    ↓
/success.html?vin=XXX&setup_intent=YYY
    ↓ (Report displays)
```

---

## ✅ Проверка работы

1. Сделайте тестовую покупку
2. После оплаты должны попасть на `/purchase-confirmation.html`
3. Проверьте в консоли браузера:
   ```
   ✅ Conversion tracked: { vin: "...", setup_intent: "...", value: 3.0 }
   ```
4. Через 10 секунд должен открыться отчет на `/success.html`
5. Проверьте в Google Ads → Conversions (данные появятся в течение 24 часов)

---

**Дата создания:** December 23, 2025  
**Версия:** 1.0

