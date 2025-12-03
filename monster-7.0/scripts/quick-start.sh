#!/bin/bash

# MONSTER 7.0 — БЫСТРЫЙ СТАРТ
# Автоматическая настройка и запуск системы

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MONSTER 7.0 — БЫСТРЫЙ СТАРТ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка Node.js
echo "1. Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "   ❌ Node.js не установлен"
    echo "   💡 Установите Node.js: https://nodejs.org/"
    exit 1
fi
echo "   ✅ Node.js $(node --version)"

# Установка зависимостей
echo ""
echo "2. Установка зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "   📦 Установка npm пакетов..."
    npm install
else
    echo "   ✅ Зависимости уже установлены"
fi

# Проверка системы
echo ""
echo "3. Проверка системы..."
node monster-7.0/scripts/check-system.js

# Создание директорий
echo ""
echo "4. Создание директорий..."
mkdir -p data/{knowledge,strategies,performance,feedback,reports,logs}
mkdir -p public/seo-pages
echo "   ✅ Директории созданы"

# Проверка конфигурации
echo ""
echo "5. Проверка конфигурации..."
if [ ! -f "config/monster.config.json" ]; then
    echo "   ⚠️  Конфигурация не найдена"
    echo "   💡 Создайте config/monster.config.json"
else
    echo "   ✅ Конфигурация найдена"
fi

# Запуск
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ГОТОВО К ЗАПУСКУ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Запуск Dashboard:"
echo "   npm run monster:start"
echo ""
echo "🌐 Откройте в браузере:"
echo "   http://localhost:3000/monster-ui"
echo ""
echo "💡 После запуска инициализируйте базу знаний:"
echo "   curl -X POST http://localhost:3000/api/init-knowledge"
echo ""

