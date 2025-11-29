# Как добавить Sitemap в Google Search Console

## 📍 Где добавить sitemap:

1. **Зайдите в Google Search Console**: https://search.google.com/search-console
2. **Выберите ваш сайт** (vintrusted.com)
3. **В левом меню** найдите раздел **"Sitemaps"** (или "Карта сайта" на русском)
4. **Нажмите "Добавить новую карту сайта"** (или "Add a new sitemap")

## 🔗 Какие sitemap URL нужно добавить:

### Основные sitemaps для добавления:

1. **Основной sitemap** (главные страницы):
   ```
   https://vintrusted.com/sitemap.xml
   ```

2. **SEO Monster sitemap** (SEO страницы):
   ```
   https://vintrusted.com/seo/sitemaps/sitemap-seo.xml
   ```

3. **Альтернативный SEO sitemap** (резервный):
   ```
   https://vintrusted.com/sitemap-seo-monster.xml
   ```

## ✅ Рекомендации:

### Минимальный набор (обязательно):
- `https://vintrusted.com/sitemap.xml` - основной sitemap
- `https://vintrusted.com/seo/sitemaps/sitemap-seo.xml` - SEO sitemap

### Полный набор (опционально):
- Все три sitemap URL выше

## 📝 Пошаговая инструкция:

1. Откройте Google Search Console
2. Выберите свойство `vintrusted.com`
3. В левом меню: **"Sitemaps"** → **"Добавить новую карту сайта"**
4. Введите URL sitemap (например: `sitemap.xml` или полный URL)
5. Нажмите **"Отправить"** (Submit)
6. Повторите для каждого sitemap

## ⚠️ Важно:

- Google автоматически найдет sitemaps из `robots.txt`, но **явное добавление в Search Console** дает:
  - Статистику индексации
  - Ошибки, если sitemap недоступен
  - Контроль над процессом индексации

- После добавления Google начнет индексировать страницы из sitemaps
- Процесс может занять несколько дней/недель

## 🔍 Проверка:

После добавления в Search Console вы увидите:
- Статус sitemap (Успешно / Ошибка)
- Количество обнаруженных URL
- Количество проиндексированных URL
- Дата последней обработки

## 📊 Мониторинг:

- Регулярно проверяйте статус sitemaps в Search Console
- Если есть ошибки - исправляйте их
- SEO Monster автоматически обновляет sitemaps при каждом build

