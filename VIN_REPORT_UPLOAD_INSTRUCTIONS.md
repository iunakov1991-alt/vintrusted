# ИНСТРУКЦИЯ ПО ЗАГРУЗКЕ VIN ОТЧЕТА

## Текущий статус

✅ **Зависимости установлены** (`npm install` выполнен)  
✅ **Модули обучения готовы**  
⚠️ **PDF файл не найден**

## Что нужно сделать

### Вариант 1: Загрузка через файловую систему

1. Найдите файл `VIN-Report-5TDYK3DC8DS290235.pdf` на вашем компьютере
2. Скопируйте его в корень проекта:
   ```
   /Users/dmitrii/Desktop/website/VIN-Report-5TDYK3DC8DS290235.pdf
   ```

### Вариант 2: Загрузка через Cursor/IDE

1. Откройте файл `VIN-Report-5TDYK3DC8DS290235.pdf` в Cursor
2. Сохраните его в корень проекта (`/Users/dmitrii/Desktop/website/`)

### Вариант 3: Автоматический поиск

Система автоматически ищет файл в следующих местах:
- `/Users/dmitrii/Desktop/website/VIN-Report-5TDYK3DC8DS290235.pdf`
- `/Users/dmitrii/Desktop/website/data/VIN-Report-5TDYK3DC8DS290235.pdf`
- `/Users/dmitrii/Desktop/website/public/VIN-Report-5TDYK3DC8DS290235.pdf`
- `/Users/dmitrii/Desktop/website/docs/VIN-Report-5TDYK3DC8DS290235.pdf`

## После загрузки файла

Запустите обучение:

```bash
cd /Users/dmitrii/Desktop/website
node scripts/train-from-vin-report.js
```

Или обучение запустится автоматически при следующем билде SEO страниц.

## Что произойдет

1. ✅ PDF файл будет прочитан
2. ✅ Все упоминания ClearVin/Clear Vin будут удалены
3. ✅ Структура отчета будет извлечена
4. ✅ Семантические паттерны будут извлечены
5. ✅ Стиль изложения будет проанализирован
6. ✅ Данные будут сохранены в AI Training Pipeline
7. ✅ AI получит рекомендации для улучшения генерации контента

## Безопасность

🔒 **Все упоминания конкурента будут автоматически удалены:**
- ClearVin, Clear Vin, Clear-Vin
- clearvin.com, clear-vin.com
- URL конкурентов
- Email конкурентов
- Логотипы и изображения

## Проверка

После загрузки файла проверьте:

```bash
ls -la /Users/dmitrii/Desktop/website/VIN-Report-*.pdf
```

Файл должен отображаться в списке.


