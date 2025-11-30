# SEO-ДИЗАЙН ABSOLUTE 1000% — Документация

## Обзор

Новый дизайн SEO-страниц в стиле **DMV × Apple × LegalTech** для максимального SEO-эффекта, CTR и доверия Google.

## Структура

### Новые файлы

1. **CSS**: `css/seo-absolute.css`
   - Полный стиль для всех блоков
   - Mobile-responsive
   - DMV/Apple/LegalTech эстетика

2. **Template Engine**: `scripts/seo/dom/template-engine-absolute.js`
   - 11 обязательных блоков
   - Поддержка AI-изображений
   - Полная Schema.org разметка

3. **Layout Engine**: `scripts/seo/dom/layout-engine-absolute.js`
   - 6 вариантов layout (DMV, APPLE, LEGAL, HYBRID, ANALYTIC, RISK)
   - Вариативный DOM для уникальности

4. **AI Image Generator**: `scripts/seo/images/ai-image-generator.js`
   - Генерация изображений по кластерам
   - Неблокирующая генерация
   - WebP формат

## 11 Обязательных Блоков

1. **HERO** — VIN крупно, метаданные, summary, CTA
2. **Key Facts** — 4-6 карточек с иконками
3. **Deep Explanation** — 2-3 абзаца объяснения
4. **Vehicle Specs Table** — DMV-стиль таблица
5. **State Insights** — карточка с state-специфичной информацией
6. **Common Risks** — маркированный список рисков
7. **Market Value** — два диапазона цен
8. **AI Analysis** — расширенный экспертный текст
9. **Free vs Paid** — таблица сравнения
10. **FAQ** — минимум 4 вопроса
11. **Internal Links** — две колонки (state + make)

## Layout Варианты

- **DMV**: Классический DMV-стиль, структурированный
- **APPLE**: Чистый, минималистичный
- **LEGAL**: Детальный, структурированный
- **HYBRID**: Сбалансированный
- **ANALYTIC**: Фокус на аналитике
- **RISK**: Фокус на рисках

## AI-Изображения

- Генерация по кластерам: `state-make-intent`
- Типы: `hero` (1200×800) и `og` (1200×630)
- Формат: WebP
- Неблокирующая генерация (страница создается даже без изображения)

## Schema.org

Полная разметка:
- WebPage
- Breadcrumb
- Vehicle
- Product
- FAQPage

## Интеграция

Все интегрировано в `seo-master-build.js`:
- Используется `TemplateEngineAbsolute`
- Используется `LayoutEngineAbsolute`
- Добавлен этап `ai-images-generation`

## Mobile UX

- 100% читабельность
- Вертикальная структура
- Идеальные отступы
- Фиксированная контент-ширина
- CTA всегда в зоне видимости

## Результат

Дизайн максимизирует:
- SEO-силу
- Время на странице
- CTR из Google
- Доверие Google
- Масштабируемость

