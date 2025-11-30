# Руководство по деплою батчей

## Обзор

Файл `vercel.json` содержит 41,161 маршрутов (4.7MB), что может вызвать проблемы при деплое. Решение: разделить деплой на два батча.

## Структура батчей

- **Batch 1**: 20,761 маршрутов (14,000 статей batch 1 + 6,761 прочих)
- **Batch 2**: 20,400 маршрутов (20,000 статей batch 2 + 400 пагинация)
- **Итого**: 41,161 маршрутов

## Этап 1: Деплой Batch 1

### Подготовка

1. Убедитесь, что backup создан:
   ```bash
   ls -lh vercel.json.backup
   ```

2. Запустите скрипт подготовки:
   ```bash
   ./deploy-batch1.sh
   ```

### Проверка

Скрипт автоматически:
- ✅ Применяет конфигурацию Batch 1
- ✅ Валидирует JSON
- ✅ Проверяет отсутствие Batch 2 маршрутов
- ✅ Показывает статистику

### Деплой

1. Проверьте изменения:
   ```bash
   git status
   ```

2. Закоммитьте изменения:
   ```bash
   git add vercel.json
   git commit -m "Deploy batch 1: articles (14,000 routes)"
   ```

3. Запушьте и деплойте на Vercel:
   ```bash
   git push
   ```

4. Дождитесь успешного деплоя Batch 1

## Этап 2: Деплой Batch 2

### Важно

⚠️ **НЕ запускайте Batch 2 до успешного завершения деплоя Batch 1!**

### Подготовка

1. Убедитесь, что Batch 1 успешно задеплоен

2. Запустите скрипт подготовки:
   ```bash
   ./deploy-batch2.sh
   ```

### Проверка

Скрипт автоматически:
- ✅ Восстанавливает полную версию из backup
- ✅ Валидирует JSON
- ✅ Проверяет наличие всех маршрутов
- ✅ Проверяет отсутствие дубликатов

### Деплой

1. Проверьте изменения:
   ```bash
   git status
   ```

2. Закоммитьте изменения:
   ```bash
   git add vercel.json
   git commit -m "Deploy batch 2: articles2 (20,400 routes + pagination)"
   ```

3. Запушьте и деплойте на Vercel:
   ```bash
   git push
   ```

## Файлы

- `vercel.json.backup` - полная резервная копия (НЕ УДАЛЯТЬ!)
- `vercel-batch1.json` - версия только с Batch 1
- `split-vercel-batches.js` - скрипт для разделения
- `deploy-batch1.sh` - скрипт деплоя Batch 1
- `deploy-batch2.sh` - скрипт деплоя Batch 2

## Откат (Rollback)

Если что-то пошло не так:

### Откат Batch 1
```bash
git checkout HEAD~1 vercel.json
# или
cp vercel.json.backup vercel.json
git add vercel.json
git commit -m "Rollback to full configuration"
git push
```

### Откат Batch 2
```bash
cp vercel-batch1.json vercel.json
git add vercel.json
git commit -m "Rollback to batch 1 only"
git push
```

## Проверка после деплоя

После каждого деплоя проверьте:

1. **Валидность конфигурации:**
   ```bash
   python3 -m json.tool vercel.json > /dev/null && echo "OK" || echo "ERROR"
   ```

2. **Количество маршрутов:**
   ```bash
   node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('vercel.json','utf8')); console.log(d.routes.length);"
   ```

3. **Проверка на Vercel:**
   - Зайдите в Vercel Dashboard
   - Проверьте статус деплоя
   - Проверьте логи на ошибки

## Статистика

### Batch 1
- Маршрутов: 20,761
- Статей: 14,000
- Размер файла: ~2.4MB

### Batch 2 (полная версия)
- Маршрутов: 41,161
- Статей: 24,000 (14,000 + 10,000)
- Пагинация: 200 страниц
- Размер файла: ~4.7MB

## Поддержка

При возникновении проблем:
1. Проверьте backup файлы
2. Запустите скрипты валидации
3. Проверьте логи Vercel
4. При необходимости выполните откат

---

**Дата создания:** $(date)
**Версия:** 1.0


