# 🎯 Получить A/B Test данные из Stripe

**Проблема:** У меня нет доступа к Stripe API key в `.env` файле

**Решения:**

---

## ✅ ВАРИАНТ 1: Через Stripe CLI (рекомендую)

### Установка Stripe CLI (если еще нет):

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Other OS
# Download from: https://stripe.com/docs/stripe-cli
```

### Запуск скрипта:

```bash
# 1. Авторизуйся в Stripe CLI
stripe login

# 2. Запусти скрипт
cd /Users/dmitrii/Desktop/vintrusted
./EXTRACT_AB_VARIANT.sh
```

**Скрипт покажет:**
```
☀️  VARIANT LIGHT: XX
🌙 VARIANT DARK: YY
🏆 WINNER: LIGHT (+25%)
```

---

## ✅ ВАРИАНТ 2: Дай мне Stripe Secret Key

### Где найти:

```
Stripe Dashboard → Developers → API keys
→ Secret key (начинается с sk_live_... или sk_test_...)
```

### Что сделать:

Скопируй и отправь мне secret key, я:
1. Создам временный `.env` файл
2. Запущу скрипт
3. Получу данные
4. Удалю ключ

---

## ✅ ВАРИАНТ 3: Ты экспортируешь данные сам

### Через Stripe Dashboard:

```
1. Payments → Export CSV (Jan 1 - Feb 23)
2. Открой CSV
3. Найди колонку "Metadata"
4. Посчитай:
   - COUNTIF(Metadata, "*light*")
   - COUNTIF(Metadata, "*dark*")
5. Скажи мне результаты
```

---

## ⚡ Самый быстрый: ВАРИАНТ 1

Если у тебя есть Stripe CLI, просто запусти:

```bash
cd /Users/dmitrii/Desktop/vintrusted
./EXTRACT_AB_VARIANT.sh
```

И скопируй результат!

---

## 🎯 Что мне нужно от тебя:

**Любое из:**

1. Результат скрипта `EXTRACT_AB_VARIANT.sh`
2. Stripe Secret Key (я сам получу данные)
3. Ручной подсчет: "light: XX, dark: YY"

**Жду!** 📊
