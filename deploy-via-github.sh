#!/bin/bash

# Деплой через GitHub (Vercel автоматически задеплоит после push)
# Оптимизирован для работы с большим количеством файлов

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     ДЕПЛОЙ ЧЕРЕЗ GITHUB (VERCEL АВТОМАТИЧЕСКИ)         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Проверка git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен!"
    exit 1
fi

# Проверка remote
if ! git remote get-url origin &> /dev/null; then
    echo "❌ GitHub remote не настроен!"
    echo "   Настройте: git remote add origin <your-repo-url>"
    exit 1
fi

echo "✅ Git настроен"
echo "✅ GitHub подключен: $(git remote get-url origin)"
echo ""

# Проверка vercel.json
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json не найден!"
    exit 1
fi

# Валидация
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
" 2>/dev/null || echo "  Не удалось подсчитать"

echo ""
echo "📦 Подготовка к коммиту..."
echo ""

# Добавляем только важные файлы (избегаем зависания)
echo "Добавление файлов..."

# Основные файлы конфигурации
git add vercel.json 2>/dev/null || true
git add vercel.json.backup 2>/dev/null || true
git add vercel-batch1.json 2>/dev/null || true

# Списки статей
git add articles2-list.json 2>/dev/null || true
git add pagination-routes.json 2>/dev/null || true

# Sitemap
git add public/sitemap.xml 2>/dev/null || true

# Скрипты (опционально)
git add deploy-*.sh 2>/dev/null || true
git add *.md 2>/dev/null || true

# Добавляем папки статей (может занять время, но необходимо)
echo "Добавление статей (это может занять несколько минут)..."
git add articles2/ 2>/dev/null || true

echo "✅ Файлы добавлены"
echo ""

# Проверка статуса
echo "📋 Статус коммита:"
git status --short | head -10
echo ""

# Создание коммита
echo "💾 Создание коммита..."
git commit -m "Deploy all: 24,000 articles + pagination (41,161 routes)" || {
    echo "⚠️  Нет изменений для коммита или коммит уже существует"
    echo "   Проверьте: git status"
}

echo ""
echo "🚀 Отправка в GitHub..."
echo "   Vercel автоматически задеплоит после push"
echo ""

# Push
read -p "Отправить изменения в GitHub? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main 2>&1 || git push 2>&1
    echo ""
    echo "✅ Изменения отправлены в GitHub"
    echo "✅ Vercel начнет автоматический деплой"
    echo ""
    echo "📊 Проверьте статус деплоя в Vercel Dashboard"
else
    echo "❌ Отменено. Выполните вручную: git push"
fi


