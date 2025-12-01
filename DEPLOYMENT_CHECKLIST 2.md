# Deployment & GSC Setup Checklist

## ✅ Pre-Deployment Verification

### 1. Vercel Configuration

**Build Command:**
- ✅ `vercel-build` в `package.json` → `node scripts/build-seo-full-5.js`
- ✅ Vercel автоматически использует этот скрипт

**Output Directory:**
- ✅ Статика в `public/`
- ✅ Vercel должен быть настроен на `public` как output directory

**Sitemap:**
- ✅ `public/sitemap-seo.xml` создан
- ✅ Содержит ссылки на `sitemap-en-index.xml` и `sitemap-es-index.xml`

### 2. Generated Pages

**KG Hub Pages:**
- ✅ State hubs: `/state/{state}/`
- ✅ State+Make hubs: `/state/{state}/{make}/`
- ✅ Make hubs: `/make/{make}/`
- ✅ DMV hubs: `/dmv/{state}/`
- ✅ Fraud hubs: `/fraud/{topic}/`
- ✅ Auctions hubs: `/auctions/{topic}/`

**Total:** ~39,714 HTML files generated

---

## 🚀 Deployment Steps

### Step 1: Verify Vercel Settings

1. Зайди в Vercel Dashboard → твой проект
2. Settings → General:
   - **Build Command:** `npm run vercel-build` (или оставь как есть, если уже настроено)
   - **Output Directory:** `public` (или оставь пустым, если Vercel сам определяет)
   - **Install Command:** `npm install` (если нужно)

### Step 2: Deploy

**Вариант A: Git Push (рекомендуется)**
```bash
git add .
git commit -m "feat: SEO build with KG hubs and massive-wrapper modes"
git push origin main  # или master
```

**Вариант B: Manual Redeploy**
1. Vercel Dashboard → Deployments
2. Нажми "Redeploy" на последнем деплое
3. Или создай новый деплой через "Deploy" → "Browse"

### Step 3: Wait for Build

- Build должен завершиться успешно
- Проверь логи в Vercel Dashboard
- Ожидаемое время: ~3-5 минут (с новым лимитом 20k страниц)

---

## 🔍 Post-Deployment Verification

### 1. Check Main Pages

Открой на прод-домене (https://vintrusted.com):

- ✅ Главная: `https://vintrusted.com/`
- ✅ VIN страницы: `https://vintrusted.com/vin-check/{state}/{make}/{year}/`
- ✅ State hub: `https://vintrusted.com/state/ca/`
- ✅ Make hub: `https://vintrusted.com/make/toyota/`
- ✅ DMV hub: `https://vintrusted.com/dmv/ca/`
- ✅ Fraud hub: `https://vintrusted.com/fraud/salvage-concealment/`
- ✅ Auctions hub: `https://vintrusted.com/auctions/copart/`

### 2. Check Page Elements

На каждой странице проверь:

- ✅ **Логотип:** виден в header (`id="site-logo"`)
- ✅ **H1:** есть и корректный
- ✅ **Таблица:** есть (минимум 1 таблица)
- ✅ **FAQ:** есть (минимум 2-3 вопроса)
- ✅ **Внутренние ссылки:** работают (Related blocks, navigation)
- ✅ **Вёрстка:** ничего не развалилось, адаптивность

### 3. Check Sitemap

- ✅ `https://vintrusted.com/sitemap-seo.xml` открывается
- ✅ Содержит ссылки на `sitemap-en-index.xml` и `sitemap-es-index.xml`
- ✅ Индексы открываются и содержат ссылки на части sitemap

---

## 🔗 Google Search Console Setup

### Step 1: Property Setup

1. Зайди в [Google Search Console](https://search.google.com/search-console)
2. Если property нет:
   - Add Property → Domain
   - Введи: `vintrusted.com`
   - Подтверди владение через DNS (добавь TXT запись) или HTML файл

### Step 2: Submit Sitemap

1. В GSC → Sitemaps
2. В поле "Add a new sitemap" введи:
   ```
   sitemap-seo.xml
   ```
3. Нажми "Submit"

**Важно:** Не добавляй полный URL, только имя файла: `sitemap-seo.xml`

### Step 3: Request Indexing (опционально)

Для быстрой индексации ключевых страниц:

1. GSC → URL Inspection
2. Введи URL и нажми "Request Indexing" для:
   - `https://vintrusted.com/state/ca/`
   - `https://vintrusted.com/make/toyota/`
   - `https://vintrusted.com/dmv/ca/`
   - `https://vintrusted.com/fraud/salvage-concealment/`
   - `https://vintrusted.com/auctions/copart/`
   - 2-3 VIN страницы

### Step 4: Monitor

Через 1-2 недели проверь:

- **Coverage:** сколько страниц проиндексировано
- **Performance:** клики, impressions, CTR
- **Sitemap status:** нет ли ошибок

---

## 📊 Expected Results

### After 1 Week:
- ✅ 100+ страниц проиндексировано
- ✅ Sitemap обработан без ошибок
- ✅ Первые impressions в GSC

### After 2-4 Weeks:
- ✅ 1,000+ страниц проиндексировано
- ✅ Первые клики и трафик
- ✅ CTR начинает формироваться

---

## 🐛 Troubleshooting

### Build Fails in Vercel:
- Проверь логи в Vercel Dashboard
- Убедись, что `SEO_BUILD_MODE` не установлен в `full` (должен быть `local` или не установлен)
- Проверь, что все зависимости в `package.json`

### Pages Not Loading:
- Проверь `vercel.json` routes
- Убедись, что `public/static-pages/**` правильно настроен
- Проверь, что файлы действительно задеплоены

### Sitemap Not Found:
- Проверь, что `public/sitemap-seo.xml` существует после билда
- Убедись, что Vercel не блокирует статические файлы
- Проверь права доступа к файлу

### GSC Errors:
- Убедись, что sitemap доступен по `https://vintrusted.com/sitemap-seo.xml`
- Проверь формат XML (должен быть валидным)
- Убедись, что все ссылки в sitemap ведут на существующие страницы

---

## ✅ Final Checklist

- [ ] Vercel build завершился успешно
- [ ] Главная страница открывается
- [ ] KG hub страницы открываются
- [ ] VIN страницы открываются
- [ ] Sitemap доступен
- [ ] GSC property создан
- [ ] Sitemap добавлен в GSC
- [ ] Ключевые URL запрошены на индексацию

**Готово! 🎉**

