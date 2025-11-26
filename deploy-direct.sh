#!/bin/bash

# Прямой деплой через Vercel CLI без git
# Обходит проблему с множественными деплоями через git

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     ПРЯМОЙ ДЕПЛОЙ ЧЕРЕЗ VERCEL CLI                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Проверка Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен!"
    echo ""
    echo "Установите:"
    echo "  npm i -g vercel"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI установлен"
echo ""

# Проверка vercel.json
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json не найден!"
    exit 1
fi

# Валидация JSON
echo "🔍 Валидация vercel.json..."
if python3 -m json.tool vercel.json > /dev/null 2>&1; then
    echo "✅ vercel.json валиден"
else
    echo "❌ vercel.json содержит ошибки!"
    exit 1
fi

echo ""
echo "📊 Статистика:"
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const routes = data.routes || [];
console.log('  Маршрутов:', routes.length);
" 2>/dev/null || echo "  Не удалось подсчитать маршруты"

echo ""
echo "🚀 Запуск деплоя..."
echo ""
echo "⚠️  ВНИМАНИЕ: Это задеплоит все файлы напрямую в Vercel"
echo "   Без использования git, что избежит множественных деплоев"
echo ""

# Деплой
vercel --prod --yes

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "Проверьте статус в Vercel Dashboard"


