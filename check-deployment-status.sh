#!/bin/bash
# Скрипт для автоматической проверки статуса деплоя

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА СТАТУСА ДЕПЛОЯ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Проверка последнего коммита
LAST_COMMIT=$(git log -1 --format="%h")
LAST_COMMIT_MSG=$(git log -1 --format="%s")
LAST_COMMIT_TIME=$(git log -1 --format="%cd" --date=relative)

echo "📝 ПОСЛЕДНИЙ КОММИТ:"
echo "   Hash: $LAST_COMMIT"
echo "   Сообщение: $LAST_COMMIT_MSG"
echo "   Время: $LAST_COMMIT_TIME"
echo ""

# Проверка синхронизации с remote
echo "🌐 СИНХРОНИЗАЦИЯ:"
if git diff --quiet HEAD origin/main 2>/dev/null; then
    echo "   ✅ Локальная ветка синхронизирована с origin/main"
else
    echo "   ⚠️  Есть различия между локальной и remote веткой"
    git status -sb | head -1
fi
echo ""

# Проверка Vercel CLI (если установлен)
if command -v vercel &> /dev/null; then
    echo "🔍 ПРОВЕРКА VERCEL CLI:"
    if vercel whoami &> /dev/null; then
        echo "   ✅ Vercel CLI авторизован"
        echo ""
        echo "📊 ПОСЛЕДНИЕ ДЕПЛОИ:"
        vercel ls --limit 3 2>/dev/null || echo "   ⚠️  Не удалось получить список деплоев"
    else
        echo "   ⚠️  Vercel CLI не авторизован"
    fi
else
    echo "⚠️  Vercel CLI не установлен"
    echo "   Установите: npm i -g vercel"
fi
echo ""

# Проверка исправлений
echo "✅ ИСПРАВЛЕНИЯ В КОММИТАХ:"
FIXES=$(git log --oneline --grep="Fix:" -5)
if [ -n "$FIXES" ]; then
    echo "$FIXES" | while read line; do
        echo "   $line"
    done
else
    echo "   Нет исправлений в последних коммитах"
fi
echo ""

# Рекомендации
echo "📋 РЕКОМЕНДАЦИИ:"
echo "   1. Проверьте Vercel Dashboard: https://vercel.com/dashboard"
echo "   2. Найдите деплой с коммитом: $LAST_COMMIT"
echo "   3. Проверьте Build Logs на наличие ошибок"
echo "   4. Убедитесь, что деплой завершился успешно"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

