#!/usr/bin/env bash
# Безопасный деплой с валидацией и предотвращением 404

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

echo "=== БЕЗОПАСНЫЙ ДЕПЛОЙ MONSTER 8.0 ==="
echo ""

# Шаг 1: Валидация страниц
echo "[1/4] Валидация страниц перед деплоем..."
if ! node scripts/validate_before_deploy.js; then
  echo ""
  echo "❌ Валидация не пройдена. Деплой отменен."
  echo "Исправьте ошибки и попробуйте снова."
  exit 1
fi

# Шаг 2: Проверка структуры
echo ""
echo "[2/4] Проверка структуры файлов..."

EN_PAGES=$(find public/semantic-pages/en -type f -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
ES_PAGES=$(find public/semantic-pages/es -type f -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')

echo "  EN страниц: $EN_PAGES"
echo "  ES страниц: $ES_PAGES"
echo "  Всего: $((EN_PAGES + ES_PAGES))"

if [ "$EN_PAGES" -eq 0 ] && [ "$ES_PAGES" -eq 0 ]; then
  echo ""
  echo "❌ Нет страниц для деплоя!"
  exit 1
fi

# Шаг 3: Проверка vercel.json
echo ""
echo "[3/4] Проверка конфигурации Vercel..."

if ! node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))" 2>/dev/null; then
  echo "❌ Ошибка в vercel.json"
  exit 1
fi

# Проверяем наличие rewrites для semantic-pages
if ! grep -q "semantic-pages" vercel.json; then
  echo "⚠️  WARNING: vercel.json не содержит rewrites для semantic-pages"
  echo "   Добавьте rewrites для /en/* и /es/* путей"
fi

# Шаг 4: Создание sitemap (опционально)
echo ""
echo "[4/4] Генерация sitemap..."

if [ -f "scripts/build-sitemap-only.js" ]; then
  node scripts/build-sitemap-only.js || echo "⚠️  Sitemap generation failed (non-critical)"
else
  echo "  Sitemap generator not found (skipping)"
fi

# Финальная проверка
echo ""
echo "=== ПРОВЕРКА ПЕРЕД ДЕПЛОЕМ ==="
echo ""
echo "✅ Валидация пройдена"
echo "✅ Структура файлов корректна"
echo "✅ Конфигурация Vercel проверена"
echo ""
echo "📊 Статистика:"
echo "   EN страниц: $EN_PAGES"
echo "   ES страниц: $ES_PAGES"
echo "   Всего: $((EN_PAGES + ES_PAGES))"
echo ""
echo "🚀 Готово к деплою!"
echo ""
echo "Для деплоя выполните:"
echo "  vercel --prod"
echo ""
echo "Или через Git:"
echo "  git add ."
echo "  git commit -m 'Deploy MONSTER 8.0 pages'"
echo "  git push"

