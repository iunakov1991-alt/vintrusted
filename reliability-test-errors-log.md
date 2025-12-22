# Логи ошибок тестовой генерации 10 статей

## Общая статистика
- **Всего статей**: 10
- **Успешно**: 0
- **Ошибок**: 10
- **Успешность**: 0.0%

## Детальные ошибки по статьям

### Статья #1
- **Контекст**: 2015 44 undefined in 31
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: В функции `checkArticleErrors` вызывается `article.blocks.forEach()`, но `article.blocks` не является массивом
- **Стек ошибки**: 
  ```
  TypeError: article.blocks.forEach is not a function
      at checkArticleErrors (scripts/test-system-reliability.js:145:146)
      at testSystemReliability (scripts/test-system-reliability.js:224:224)
  ```

### Статья #2
- **Контекст**: 2023 51 undefined in 23
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #3
- **Контекст**: 2016 0 undefined in 28
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #4
- **Контекст**: 2022 10 undefined in 30
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #5
- **Контекст**: 2023 49 undefined in 17
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #6
- **Контекст**: 2022 30 undefined in 34
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #7
- **Контекст**: 2019 38 undefined in 27
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #8
- **Контекст**: 2021 7 undefined in 25
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #9
- **Контекст**: 2018 6 undefined in 11
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

### Статья #10
- **Контекст**: 2020 10 undefined in 40
- **Ошибка**: `Generation failed: article.blocks.forEach is not a function`
- **Причина**: Та же проблема - `article.blocks` не массив

## Анализ проблемы

### Корневая причина
Функция `checkArticleErrors` в файле `scripts/test-system-reliability.js` на строке 145 пытается вызвать `article.blocks.forEach()`, но `article.blocks` может быть:
1. `undefined`
2. `null`
3. Объектом (не массивом)
4. Массивом

### Проблемный код (ДО исправления):
```javascript
if (article.blocks) {
  article.blocks.forEach(block => {
    // ...
  });
}
```

### Исправленный код (ПОСЛЕ исправления):
```javascript
if (article.blocks && Array.isArray(article.blocks)) {
  article.blocks.forEach(block => {
    // ...
  });
}
```

## Дополнительные проблемы

### Проблема с контекстом
Все статьи имеют `undefined` в контексте (например, "2015 44 undefined in 31"), что указывает на проблему с генерацией тест-кейсов:
- `make` или `model` не определены
- Возможно, проблема в функции `generateTestCases()` - неправильный выбор из `makesModels`

### Логи из терминала (частичные)
Из вывода терминала видно, что:
1. Статьи генерировались успешно (видны логи генерации блоков)
2. Пост-обработка выполнялась (видны логи применения правил)
3. Ошибка возникала только при проверке результатов

## Выводы

1. **Основная проблема**: Неправильная проверка типа `article.blocks` в функции `checkArticleErrors`
2. **Вторичная проблема**: Неправильная генерация тест-кейсов (undefined в контексте)
3. **Статус**: Исправления уже применены в коде, но статьи не были сохранены из-за ошибки

## Рекомендации

1. ✅ Исправление уже применено - добавлена проверка `Array.isArray(article.blocks)`
2. ⚠️ Нужно проверить функцию `generateTestCases()` для исправления проблемы с undefined
3. ⚠️ Перезапустить тест после исправлений









