#!/bin/bash
# Скрипт для деплоя всех изменений в Vercel
# Запустите этот скрипт через 12 часов после последнего деплоя

echo "🚀 Starting deployment to Vercel..."
echo "📅 $(date)"

# Проверяем, что мы в правильной директории
cd "$(dirname "$0")"

# Проверяем статус git
echo "📦 Checking git status..."
git status

# Убеждаемся, что все изменения закоммичены
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: There are uncommitted changes"
    read -p "Do you want to commit them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "Auto-commit before deployment"
    fi
fi

# Пушим изменения
echo "⬆️  Pushing to GitHub..."
git push

# Деплоим в Vercel
echo "🌐 Deploying to Vercel Production..."
vercel --prod

echo "✅ Deployment complete!"
echo "📅 Finished at $(date)"

