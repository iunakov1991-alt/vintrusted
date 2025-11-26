# Настройка переменных окружения в Vercel

## CLEARVIN_API_TOKEN

### Что указать:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnZpcm9ubWVudCI6InRlc3QiLCJ1c2VyIjp7ImlkIjoyNjYyNDIsImVtYWlsIjoicmVkc3RlcGxlckBnbWFpbC5jb20ifSwidmVuZG9yIjp7ImlkIjo0MzAsInN0YXR1cyI6ImFjdGl2ZSJ9LCJpYXQiOjE3NjI5NjYxNzIsImV4cCI6MTc2NTU1ODE3Mn0.x9DK0eAie7Jo-PTgXabjeRPk7s-T21TRcp5d7CbHYo4
```

### Где добавить:

1. **Откройте Vercel Dashboard:**
   - Перейдите на https://vercel.com
   - Войдите в свой аккаунт
   - Выберите проект `vintrusted` (или ваш проект)

2. **Перейдите в настройки:**
   - В меню проекта нажмите **Settings** (Настройки)
   - В левом меню выберите **Environment Variables** (Переменные окружения)

3. **Добавьте переменную:**
   - Нажмите кнопку **Add New** (Добавить новую)
   - В поле **Name** (Имя) введите: `CLEARVIN_API_TOKEN`
   - В поле **Value** (Значение) вставьте токен выше
   - Выберите все окружения:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
   - Нажмите **Save** (Сохранить)

4. **Передеплойте проект:**
   - После добавления переменной нужно передеплоить проект
   - Перейдите на вкладку **Deployments**
   - Найдите последний деплой
   - Нажмите на три точки (⋮) справа
   - Выберите **Redeploy** (Передеплоить)
   - Или просто сделайте новый коммит и пуш

### Проверка:

После деплоя проверьте, что переменная доступна:
- Откройте функцию `/api/get-clearvin-report` в логах Vercel
- Попробуйте сделать тестовый запрос с тестовым VIN

### Важно:

- ⚠️ Это **тестовый токен**, действителен до **12 декабря 2025**
- ⚠️ Для продакшена нужно будет получить **production токен** от ClearVin
- ⚠️ Токен работает только с тестовыми VIN из документации

### Альтернативный способ (через CLI):

Если используете Vercel CLI:
```bash
vercel env add CLEARVIN_API_TOKEN
# Вставьте токен когда попросит
# Выберите все окружения (production, preview, development)
```

