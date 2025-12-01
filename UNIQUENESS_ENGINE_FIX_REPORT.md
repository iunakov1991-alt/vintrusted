# Uniqueness Engine Fix Report

## Проблема

Деплой упал с ошибкой:
```
Error: Cannot read properties of undefined (reading 'join')
```

## Причина

В методе `computeStructureFingerprint` в `uniqueness-engine.js` используется `blocks.join('|')`, но `blocks` может быть `undefined`. Также `layout` может быть `undefined` или не иметь свойства `name`.

## Решение

Добавлена полная валидация в двух местах:

### 1. `computeStructureFingerprint` метод:
```javascript
computeStructureFingerprint(layout, blocks) {
  // Безопасная обработка: проверяем наличие layout и blocks
  const layoutName = (layout && layout.name) ? layout.name : 'DEFAULT';
  const blocksArray = (blocks && Array.isArray(blocks)) 
    ? blocks 
    : (layout && layout.blocks && Array.isArray(layout.blocks)) 
      ? layout.blocks 
      : [];
  const structure = `${layoutName}|${blocksArray.join('|')}`;
  return crypto.createHash('sha256').update(structure).digest('hex').substring(0, 16);
}
```

### 2. `validateUniqueness` метод:
```javascript
validateUniqueness(page) {
  // Безопасная передача: используем page.blocks или layout.blocks или пустой массив
  const blocks = page.blocks || (page.layout && page.layout.blocks) || [];
  const structureFp = this.computeStructureFingerprint(page.layout, blocks);
  // ...
}
```

## Функциональность

Теперь проверяется:
- ✅ Наличие `layout` и `layout.name`
- ✅ Наличие `blocks` и что это массив
- ✅ Fallback на `layout.blocks` если `page.blocks` отсутствует
- ✅ Fallback на пустой массив `[]` если ничего не найдено

## Статус

✅ **Исправлено и отправлено**
- Commit: `904983c9`
- Файл: `scripts/seo/uniqueness-engine.js`

## Ожидаемый результат

Следующий деплой должен:
- ✅ Успешно пройти этап `uniqueness-validation`
- ✅ Корректно обработать страницы без blocks или layout
- ✅ Продолжить выполнение pipeline

