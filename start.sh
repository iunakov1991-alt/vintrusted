#!/bin/bash

# VIN Check USA - Запуск проекта
echo "🚗 Запуск VIN Check USA..."

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 16+ с https://nodejs.org"
    exit 1
fi

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Требуется Node.js версии 16 или выше. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версия: $(node -v)"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ npm версия: $(npm -v)"

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке зависимостей"
    exit 1
fi

echo "✅ Зависимости установлены"

# Проверка переменных окружения
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден. Создаю из примера..."
    cp env.example .env
    echo "📝 Отредактируйте файл .env и добавьте ваши ключи Stripe"
    echo "🔑 Получите ключи на https://dashboard.stripe.com/test/apikeys"
fi

# Проверка ключей Stripe
if grep -q "your_stripe_secret_key_here" .env; then
    echo "⚠️  Необходимо настроить ключи Stripe в файле .env"
    echo "🔑 Получите ключи на https://dashboard.stripe.com/test/apikeys"
    echo "📝 Замените 'your_stripe_secret_key_here' на ваш реальный ключ"
fi

echo ""
echo "🚀 Запуск сервера..."
echo "🌐 Откройте http://localhost:3000 в браузере"
echo "🛑 Для остановки нажмите Ctrl+C"
echo ""

# Запуск сервера
npm start
