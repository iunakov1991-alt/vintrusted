# 🔐 ИНСТРУКЦИЯ ПО GITHUB SECRETS (ДЛЯ ДУРАКА)

## 📍 КУДА ИДТИ

1. **Открой GitHub:**
   - Зайди на: https://github.com/iunakov1991-alt/vintrusted
   - Нажми на вкладку **"Settings"** (вверху справа, рядом с "Code", "Issues" и т.д.)

2. **Найди Secrets:**
   - В левом меню прокрути вниз
   - Найди раздел **"Secrets and variables"**
   - Нажми на **"Actions"**

3. **Добавь секрет:**
   - Нажми кнопку **"New repository secret"** (справа вверху)

---

## 🔑 ОБЯЗАТЕЛЬНЫЕ СЕКРЕТЫ (для автодеплоя на Vercel)

### 1. VERCEL_TOKEN

**Где взять:**
1. Зайди в Vercel: https://vercel.com
2. Нажми на свой профиль (правый верхний угол)
3. Выбери **"Settings"**
4. В левом меню выбери **"Tokens"**
5. Нажми **"Create Token"**
6. Дай имя (например: "GitHub Actions")
7. Скопируй токен (показывается только один раз!)

**В GitHub:**
- Name: `VERCEL_TOKEN`
- Secret: (вставь скопированный токен)
- Нажми **"Add secret"**

---

### 2. VERCEL_ORG_ID

**Где взять:**
1. В Vercel → **Settings** → **General**
2. Найди раздел **"Team"** или **"Organization"**
3. Скопируй **"Team ID"** или **"Organization ID"**

**В GitHub:**
- Name: `VERCEL_ORG_ID`
- Secret: (вставь ID)
- Нажми **"Add secret"**

---

### 3. VERCEL_PROJECT_ID

**Где взять:**
1. В Vercel выбери свой проект (vintrusted)
2. Нажми **"Settings"** (вверху)
3. Выбери **"General"**
4. Найди **"Project ID"**
5. Скопируй его

**В GitHub:**
- Name: `VERCEL_PROJECT_ID`
- Secret: (вставь Project ID)
- Нажми **"Add secret"**

---

## ⚙️ ОПЦИОНАЛЬНЫЕ СЕКРЕТЫ (для GSC API)

Эти секреты нужны **ТОЛЬКО** если хочешь использовать Google Search Console API вместо ручного экспорта ZIP.

### 4. USE_GSC_API

**В GitHub:**
- Name: `USE_GSC_API`
- Secret: `1`
- Нажми **"Add secret"**

*(Это просто флаг "включить API")*

---

### 5. GSC_CLIENT_EMAIL

**Где взять:**
1. Зайди в Google Cloud Console: https://console.cloud.google.com
2. Создай проект (если нет)
3. Включи **Google Search Console API**
4. Создай **Service Account** (Сервисный аккаунт)
5. Скопируй **Email** сервисного аккаунта (выглядит как: `xxx@xxx.iam.gserviceaccount.com`)

**В GitHub:**
- Name: `GSC_CLIENT_EMAIL`
- Secret: (вставь email)
- Нажми **"Add secret"**

---

### 6. GSC_PRIVATE_KEY

**Где взять:**
1. В Google Cloud Console → **Service Accounts**
2. Выбери созданный аккаунт
3. Нажми **"Keys"** → **"Add Key"** → **"Create new key"**
4. Выбери формат **JSON**
5. Скачается файл, открой его
6. Найди поле `"private_key"` (это длинная строка)
7. Скопируй **ВСЮ** строку (включая `-----BEGIN PRIVATE KEY-----` и `-----END PRIVATE KEY-----`)

**В GitHub:**
- Name: `GSC_PRIVATE_KEY`
- Secret: (вставь весь private_key)
- Нажми **"Add secret"**

---

### 7. GSC_PROPERTY_URL

**Где взять:**
1. Зайди в Google Search Console: https://search.google.com/search-console
2. Выбери свой сайт (vintrusted.com)
3. В URL или в настройках найди **Property URL**
4. Формат обычно: `sc-domain:vintrusted.com` или `https://vintrusted.com`

**В GitHub:**
- Name: `GSC_PROPERTY_URL`
- Secret: (вставь property URL)
- Нажми **"Add secret"**

---

## ✅ ПРОВЕРКА

После добавления всех секретов:

1. Зайди в GitHub → **Actions**
2. Найди workflow **"Autonomy Daily SEO Cycle"**
3. Нажми **"Run workflow"** (вручную запусти для теста)
4. Проверь, что всё работает

---

## ⚠️ ВАЖНО

- **Без VERCEL секретов:** автодеплой НЕ будет работать, но автономный цикл (build + RL) будет работать БЕЗ деплоя
- **GSC API секреты:** нужны ТОЛЬКО если хочешь использовать API вместо ручного экспорта ZIP
- **Без GSC API:** система будет работать с ZIP файлами (положи их в `data/gsc/raw/`)

---

## 🎯 МИНИМУМ ДЛЯ РАБОТЫ

**Если не нужен автодеплой:**
- Можно НЕ добавлять VERCEL секреты
- Система будет работать, но не будет автоматически деплоить

**Если не нужен GSC API:**
- Можно НЕ добавлять GSC секреты
- Система будет работать с ZIP файлами

**Минимум для полной автономии:**
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID






















