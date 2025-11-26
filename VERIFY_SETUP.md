# Проверка настройки ClearVin API

## 1. Проверка токена в Vercel

### Шаги:
1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект `vintrusted`
3. Перейдите в **Settings** → **Environment Variables**
4. Найдите переменную `CLEARVIN_API_TOKEN`
5. Проверьте, что она:
   - ✅ Существует
   - ✅ Имеет значение (тестовый токен из `CLEARVIN_SETUP.md`)
   - ✅ Включена для всех окружений (Production, Preview, Development)

### Если токена нет:
1. Нажмите **Add New**
2. Name: `CLEARVIN_API_TOKEN`
3. Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnZpcm9ubWVudCI6InRlc3QiLCJ1c2VyIjp7ImlkIjoyNjYyNDIsImVtYWlsIjoicmVkc3RlcGxlckBnbWFpbC5jb20ifSwidmVuZG9yIjp7ImlkIjo0MzAsInN0YXR1cyI6ImFjdGl2ZSJ9LCJpYXQiOjE3NjI5NjYxNzIsImV4cCI6MTc2NTU1ODE3Mn0.xDK0eAie7Jo-PTgXabjeRPk7s-T21TRcp5d7CbHYo4`
4. Выберите все окружения
5. Нажмите **Save**
6. **ВАЖНО**: Передеплойте проект (Deployments → ... → Redeploy)

---

## 2. Проверка передачи VIN в URL

### Как проверить:
1. Откройте сайт: `https://vintrusted.com`
2. Введите тестовый VIN: `5TDYK3DC8DS290235`
3. Пройдите процесс оплаты
4. После успешной оплаты проверьте URL в адресной строке

### Ожидаемый URL:
```
https://vintrusted.com/success.html?vin=5TDYK3DC8DS290235&setup_intent=seti_xxxxx
```

### Если VIN отсутствует в URL:
- Проверьте логи Vercel Function `checkout-trial-then-two-charges`
- Убедитесь, что VIN передается в `req.body.vin` при отправке формы
- Проверьте, что VIN сохраняется в `SetupIntent.metadata.vin`

---

## 3. Проверка логов Vercel Functions

### Шаги:
1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект → **Deployments**
3. Выберите последний deployment
4. Перейдите в **Functions** → **get-clearvin-report**
5. Откройте **Logs**

### Что искать в логах:

#### ✅ Успешный запрос:
```
Fetching ClearVin report for VIN: 5TDYK3DC8DS290235
Response status: 200
Response text length: 50000
Successfully extracted HTML report, length: 50000
```

#### ❌ Ошибка авторизации:
```
Response status: 401
ClearVin API authorization failed
```
**Решение**: Проверьте токен в Environment Variables

#### ❌ Пустой отчет:
```
HTML report is empty or whitespace only
```
**Решение**: 
- Проверьте, что VIN валидный (17 символов)
- Попробуйте другой тестовый VIN
- Подождите 10-30 секунд и попробуйте снова (отчет может генерироваться)

#### ❌ VIN не найден:
```
Vin not found. Unable to generate report.
```
**Решение**: Используйте другой тестовый VIN из списка

---

## 4. Тестирование API напрямую

### Локальный тест:
```bash
node check-clearvin-setup.js
```

Этот скрипт проверит:
- Формат токена
- Доступность API
- Формат ответа

### Тест через браузер:
Откройте в браузере:
```
https://vintrusted.com/api/get-clearvin-report?vin=5TDYK3DC8DS290235
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "report": "<html>...",
  "vin": "5TDYK3DC8DS290235"
}
```

**Если ошибка:**
- `500: ClearVin API token not configured` → Токен не добавлен в Vercel
- `401: ClearVin API authorization failed` → Токен неверный или истек
- `400: Valid VIN is required` → VIN не передан или неверный формат

---

## 5. Проверка передачи VIN в коде

### Где VIN передается:

1. **При создании SetupIntent** (`api/create-setup-intent.js`):
   ```javascript
   const { vin } = req.body;
   // Сохраняется в metadata
   metadata: { vin: vin }
   ```

2. **При checkout** (`api/checkout-trial-then-two-charges.js`):
   ```javascript
   const { vin } = req.body; // Из формы
   let finalVin = vin || si.metadata?.vin || ''; // Приоритет: body > metadata
   // Добавляется в success URL
   params.append('vin', finalVin);
   ```

3. **На странице success.html**:
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   let vin = urlParams.get('vin'); // Из URL
   // Fallback: localStorage, sessionStorage, или API
   ```

### Как проверить в браузере:
1. Откройте DevTools (F12)
2. Перейдите на вкладку **Network**
3. Найдите запрос к `/api/checkout-trial-then-two-charges`
4. Проверьте **Request Payload** → должно быть `vin: "5TDYK3DC8DS290235"`

---

## 6. Тестовые VIN для проверки

Используйте эти VIN для тестирования:
- `5TDYK3DC8DS290235` ✅ (Toyota Sienna 2013)
- `2T1LR32E35C508537` ✅
- `KNDJD733865514567` ✅
- `WAUDG74F25N111998` ✅

---

## 7. Чеклист проверки

- [ ] Токен `CLEARVIN_API_TOKEN` добавлен в Vercel Environment Variables
- [ ] Проект передеплоен после добавления токена
- [ ] VIN передается в URL после оплаты (`?vin=...`)
- [ ] API endpoint `/api/get-clearvin-report` возвращает HTML отчет
- [ ] Логи Vercel Functions показывают успешные запросы
- [ ] На странице `success.html` отображается отчет (после ввода email)

---

## 8. Частые проблемы и решения

### Проблема: "ClearVin API token not configured"
**Решение**: Добавьте `CLEARVIN_API_TOKEN` в Vercel и передеплойте

### Проблема: "VIN not found in URL parameters"
**Решение**: 
- Проверьте, что VIN передается в `req.body.vin` при checkout
- Проверьте, что VIN сохраняется в `SetupIntent.metadata.vin`

### Проблема: "Empty HTML report"
**Решение**:
- Подождите 10-30 секунд и попробуйте снова
- Используйте другой тестовый VIN
- Проверьте логи Vercel для деталей

### Проблема: "401 Unauthorized"
**Решение**:
- Проверьте, что токен правильный
- Проверьте, что токен не истек (тестовый токен действует до 12/12/2025)
- Убедитесь, что токен добавлен для Production окружения

---

## 9. Полезные ссылки

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [ClearVin API Documentation](https://www.clearvin.com/rest/vendor/report)

