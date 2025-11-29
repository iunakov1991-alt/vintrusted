#!/bin/bash
# Принудительный деплой через Vercel CLI
# Этот скрипт обходит все проблемы с настройками Git в Dashboard

set -e

echo "🚀 ПРИНУДИТЕЛЬНЫЙ ДЕПЛОЙ ЧЕРЕЗ VERCEL CLI"
echo "=========================================="
echo ""

# Проверка Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен"
    echo "Установи: npm i -g vercel"
    exit 1
fi

echo "✓ Vercel CLI установлен"
echo ""

# Проверка авторизации
echo "Проверка авторизации..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Не авторизован. Запускаю vercel login..."
    vercel login
fi

echo "✓ Авторизован"
echo ""

# Проверка привязки проекта
if [ ! -f .vercel/project.json ]; then
    echo "⚠️  Проект не привязан. Запускаю vercel link..."
    vercel link --yes
else
    echo "✓ Проект привязан"
fi

echo ""
echo "📦 Текущий коммит:"
git log -1 --oneline
echo ""

# Проверка vercel.json
if [ ! -f vercel.json ]; then
    echo "❌ vercel.json не найден!"
    exit 1
fi

echo "✓ vercel.json найден"
echo ""

# Проверка package.json
if ! grep -q '"vercel-build"' package.json; then
    echo "❌ package.json не содержит 'vercel-build' скрипт!"
    exit 1
fi

echo "✓ package.json содержит vercel-build"
echo ""

# Деплой
echo "🌐 Запускаю деплой на production..."
echo ""

vercel --prod --force --yes

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН!"
echo ""
echo "Проверь результат:"
echo "1. Открой Build Logs в Vercel Dashboard"
echo "2. Должен быть коммит: $(git log -1 --format='%h')"
echo "3. Должен быть 'npm run vercel-build'"
echo "4. Должны быть логи '[SEO BUILD 5.0]'"
