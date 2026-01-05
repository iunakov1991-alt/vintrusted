# Что сделать руками в Google Ads (интерфейс)

## A. Включи автотегирование (gclid)
1) Google Ads → Настройки аккаунта
2) Auto-tagging → ON (включить)
3) Сохранить

## B. Создай конверсию "Purchase" (Website)
1) Цели → Сводка → Создать конверсию
2) Category: Purchase
3) Conversion name: `Stripe Purchase`
4) Value:
   - Use different values for each conversion → ON
5) Count: **Every** (каждая покупка)
6) Click-through conversion window: 30 days
7) Attribution: Data-driven
8) Save

## C. Забери идентификаторы конверсии
После создания у тебя будут:
- Conversion ID (AW-XXXXXXXXX)
- Conversion label (например: `AbCdEfGhIjK...`)

Эти два значения ты внесёшь в ENV:
- `GOOGLE_ADS_CONVERSION_ID=AW-17824079146`
- `GOOGLE_ADS_CONVERSION_LABEL=l62hCKPTndgbEKq6I7NC`

## D. Проверка в Ads
Цели → твоя конверсия → Diagnostics
Там будет видно:
- Received
- No recent conversions
- Tag issues

