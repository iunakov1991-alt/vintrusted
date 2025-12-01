# Layout Fallback Fix Report

## Проблема

Деплой упал с ошибкой:
```
Error: Cannot read properties of undefined (reading 'blocks')
```

## Причина

В этапе `html-rendering` используется `page.layout`, который может быть `undefined`. При попытке доступа к `layout.blocks` возникает ошибка.

## Решение

Добавлена проверка и fallback для `page.layout` в этапе `html-rendering`:

```javascript
// Проверяем наличие layout, если нет - выбираем дефолтный
if (!page.layout) {
  page.layout = layoutEngine.selectLayout(page, rlState.layoutWeights);
}
```

## Функциональность

Теперь:
- ✅ Проверяется наличие `page.layout` перед использованием
- ✅ Если `layout` отсутствует, выбирается дефолтный через `layoutEngine.selectLayout()`
- ✅ Это гарантирует, что `page.layout` всегда определен перед вызовом `templateEngine.renderPage()`

## Статус

✅ **Исправлено и отправлено**
- Commit: `32cf158d`
- Файл: `scripts/seo/seo-master-build.js`

## Ожидаемый результат

Следующий деплой должен:
- ✅ Успешно пройти этап `html-rendering`
- ✅ Корректно обработать страницы без layout
- ✅ Продолжить выполнение pipeline

