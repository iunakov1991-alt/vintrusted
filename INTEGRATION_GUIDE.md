# 🚀 Пошаговая Интеграция A/B Теста

## ✅ Что уже готово:

1. **AB_TEST_SETUP_INSTRUCTIONS.md** - полное руководство по настройке и анализу
2. **public/ab-test.js** - JavaScript для ротации и отслеживания
3. **css/ab-hero.css** - стили для обеих версий
4. **ab-hero-section.html** - HTML новой hero-секции
5. **Backup:** `index.html.backup-TIMESTAMP` - на случай проблем

---

## 📝 Шаги интеграции:

### Шаг 1: Добавить CSS

**В `index.html` найти секцию `<head>` и добавить ПЕРЕД закрывающим `</head>`:**

```html
<!-- A/B Test Styles -->
<link rel="stylesheet" href="/css/ab-hero.css">
```

---

### Шаг 2: Добавить JavaScript

**В `index.html` найти секцию `<head>` и добавить ПОСЛЕ GTM-KR67NRNW:**

```html
<!-- A/B Test Script -->
<script src="/public/ab-test.js"></script>
```

**Важно:** Скрипт должен загружаться СРАЗУ, не через `defer` или `async`!

---

### Шаг 3: Заменить Hero-секцию

**В `index.html` найти существующую hero-секцию:**

Ищите что-то вроде:
```html
<section class="hero-section">
  <!-- старый контент -->
</section>
```

**Заменить на содержимое файла `ab-hero-section.html`**

---

### Шаг 4: Обновить Purchase Confirmation

**В `purchase-confirmation.html` найти место, где отправляется событие `purchase`:**

```javascript
dataLayer.push({
  'event': 'purchase',
  'value': 3.00,
  'currency': 'USD'
});
```

**Добавить строку с `ab_variant`:**

```javascript
dataLayer.push({
  'event': 'purchase',
  'ab_variant': getCookie('ab_variant') || 'unknown',  // <-- ДОБАВИТЬ ЭТУ СТРОКУ
  'value': 3.00,
  'currency': 'USD'
});
```

**И добавить функцию getCookie в начало скрипта:**

```javascript
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
```

---

## 🧪 Тестирование:

### 1. Локальная проверка:

```bash
# В терминале
cd /Users/dmitrii/Desktop/website
python3 -m http.server 8000
```

Откройте: `http://localhost:8000`

### 2. Проверка в браузере:

**Chrome DevTools → Console:**

```javascript
// Проверить вариант
document.cookie

// Должно быть: ab_variant=light или ab_variant=dark

// Проверить dataLayer
dataLayer

// Должен содержать: { event: 'ab_test_view', ab_variant: 'light' }
```

### 3. Проверка в разных режимах:

- Откройте в **обычном окне** - запомните вариант
- Откройте в **инкогнито** - может быть другой вариант
- Обновите страницу 10 раз - вариант должен оставаться тем же

---

## 🚀 Deployment:

```bash
git add .
git commit -m "feat: implement A/B test for hero section

- Added 50/50 split between light and dark variants
- Cookie-based variant persistence (30 days)
- Full GTM/GA4 tracking integration
- Conversion tracking with variant attribution"
git push
```

---

## 📊 Настройка GTM (подробно в AB_TEST_SETUP_INSTRUCTIONS.md):

1. Создать переменную `AB Test Variant`
2. Добавить `ab_variant` в теги конверсий
3. Создать пользовательский отчет в GA4

---

## ⚠️ Что проверить перед запуском:

- [ ] Обе версии отображаются корректно
- [ ] Cookie сохраняется
- [ ] dataLayer получает `ab_test_view`
- [ ] Клик на форму отправляет `ab_test_click`
- [ ] Purchase отправляет `ab_variant`
- [ ] GTM переменная настроена
- [ ] Тест на мобильных устройствах

---

## 🆘 Если что-то пошло не так:

### Восстановить из backup:

```bash
cp index.html.backup-TIMESTAMP index.html
git checkout index.html
```

### Проверить консоль браузера:

Должны быть логи:
```
[AB TEST] New visitor - assigned variant: light
[AB TEST] Applied variant class: variant-light
[AB TEST] Sent to dataLayer: {...}
```

---

## 📞 Поддержка:

Если возникли вопросы - проверьте:
1. `AB_TEST_SETUP_INSTRUCTIONS.md` - полное руководство
2. Консоль браузера - логи работы скрипта
3. GTM Preview Mode - проверка отправки событий
4. GA4 DebugView - проверка получения событий

---

**Готово! Система A/B теста готова к запуску! 🎯**

