# 🛡️ ДВУСТОРОННЯЯ ИЗОЛЯЦИЯ MOBILE ↔️ DESKTOP

## ✅ ГОТОВО: Полная защита в обе стороны

### Мобилка → Десктоп ❌
Изменения в мобильной версии **НЕ ВЛИЯЮТ** на десктоп

### Десктоп → Мобилка ❌
Изменения в десктопной версии **НЕ ВЛИЯЮТ** на мобилку

### Исключения (общие ресурсы) 🔄
- Google Tag Manager (GTM)
- Analytics / DataLayer
- SEO meta теги
- Шрифты
- Favicon
- Stripe оплата

---

## 📁 Файлы для разработки

### Мобилка:
- **HTML:** `<div class="mobile-only">` в `index.html`, `report.html`
- **CSS:** `/css/mobile-only.css`
- **JS:** `/public/mobile-only.js`
- **Правила:** `MOBILE_SAFE_DEVELOPMENT.md` ⚠️ ОБЯЗАТЕЛЬНО

### Десктоп:
- **HTML:** `<div class="desktop-only">` в `index.html`, `report.html`
- **CSS:** `/css/ab-hero.css`, `styles.css`, и другие
- **JS:** Различные файлы
- **Правила:** `DESKTOP_SAFE_DEVELOPMENT.md` ⚠️ ОБЯЗАТЕЛЬНО

---

## 🎯 Быстрая проверка

### Перед изменением МОБИЛКИ:
1. ✅ Все стили начинаются с `.mobile-device .mobile-only`?
2. ✅ Весь JS проверяет `isMobile` в начале?
3. ✅ Используешь префикс `mobile-` для классов?
4. ✅ Не трогаешь файлы десктопа?

### Перед изменением ДЕСКТОПА:
1. ✅ Стили внутри `.desktop-only` или скопированы?
2. ✅ JS не трогает элементы с `mobile-` префиксом?
3. ✅ Не трогаешь `/css/mobile-only.css`?
4. ✅ Не трогаешь `/public/mobile-only.js`?
5. ⚠️ Меняешь GTM/SEO? → Проверь на ОБОИХ устройствах!

---

## 🚀 Тестирование

```bash
# 1. Открой сайт в Chrome
# 2. F12 (DevTools)
# 3. Cmd/Ctrl + Shift + M (Toggle device toolbar)
# 4. Переключайся между Desktop/iPhone
# 5. Обновляй страницу после переключения
# 6. Проверяй что обе версии работают
```

---

## 📚 Полная документация

- `MOBILE_SAFE_DEVELOPMENT.md` - Правила для мобилки (с примерами)
- `DESKTOP_SAFE_DEVELOPMENT.md` - Правила для десктопа (с примерами)
- `ISOLATION_SUMMARY.md` - Техническая документация системы
- `MOBILE_IMPLEMENTATION_GUIDE.md` - Пошаговая инструкция

---

## 🆘 Если что-то сломалось

### Десктоп сломался:
```bash
# Восстановить из бекапа
cd /Users/dmitrii/Desktop/website
cp -r backup-desktop-prod-20251231-042724/* .
git add -A && git commit -m "Restore from backup"
git push origin main && vercel --prod --yes
```

### Мобилка сломалась:
```bash
# Удалить мобильные файлы
rm css/mobile-only.css
rm public/mobile-only.js
# Восстановить из Git
git checkout HEAD -- css/mobile-only.css public/mobile-only.js
git push origin main && vercel --prod --yes
```

---

**Статус:** ✅ Продакшн  
**Дата:** 2024-12-31 04:52  
**Защита:** Двусторонняя Mobile ↔️ Desktop  
**Исключения:** GTM, Analytics, SEO, Fonts, Favicon

