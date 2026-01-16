# Как посчитать вызовы ClearVin API в Vercel

## Метод 1: Vercel Dashboard (Ручной)

1. Откройте: https://vercel.com/
2. Перейдите в проект: `vintrusted`
3. Вкладка: **Logs** (левое меню)
4. Фильтры:
   - **Deployment:** Production
   - **Function:** выберите `/api/get-clearvin-report.js`
   - **Time Range:** Custom → From: 2025-12-22
5. В поле поиска введите: `Fetching HTML report`
6. Посчитайте количество строк

**Каждая строка вида:**
```
📊 Fetching HTML report for VIN: JTHBW1GG6F2076804
```
= 1 вызов ClearVin API = 1 платный отчёт

---

## Метод 2: Vercel REST API (Автоматический)

```bash
# Получите токен: https://vercel.com/account/tokens
export VERCEL_TOKEN="your_token_here"
export VERCEL_PROJECT_ID="your_project_id"
export VERCEL_TEAM_ID="your_team_id"  # если проект в команде

# Запрос логов
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/deployments?teamId=$VERCEL_TEAM_ID" | jq

# Или используйте Vercel CLI
vercel logs production
```

---

## Метод 3: Добавить счётчик в код (Рекомендуется)

Добавьте в `/api/get-clearvin-report.js`:

```javascript
// После успешного получения отчёта
if (htmlReport) {
  // Логируем с уникальным префиксом для подсчёта
  console.log('[CLEARVIN_CALL_SUCCESS]', {
    vin: cleanVin,
    timestamp: new Date().toISOString(),
    format: reportFormat
  });
}
```

Потом в логах ищите: `[CLEARVIN_CALL_SUCCESS]`

---

## Известная информация

**Дата добавления живого API:** 22 декабря 2025, 08:39:16 PST  
**Успешных Stripe платежей:** 14 (посчитано)  
**Предполагаемых тестовых вызовов:** 5-15

**ГРУБАЯ ОЦЕНКА ВСЕГО:** 20-30 вызовов ClearVin API
