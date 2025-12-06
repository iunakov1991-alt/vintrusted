#!/usr/bin/env bash
# Автоматическое резервное копирование перед деплоем

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="backups"

mkdir -p "$BACKUP_ROOT"
BACKUP_PATH="$BACKUP_ROOT/$BACKUP_DIR"

echo "[BACKUP] Creating backup: $BACKUP_PATH"

# Создаем структуру директорий
mkdir -p "$BACKUP_PATH/public"
mkdir -p "$BACKUP_PATH/data/seo/ai-training"
mkdir -p "$BACKUP_PATH/config"

# Копируем критичные данные
echo "[BACKUP] Copying semantic pages..."
if [ -d "public/semantic-pages" ]; then
  cp -r "public/semantic-pages" "$BACKUP_PATH/public/" || true
fi

echo "[BACKUP] Copying AI training data..."
if [ -d "data/seo/ai-training" ]; then
  cp -r "data/seo/ai-training"/* "$BACKUP_PATH/data/seo/ai-training/" || true
fi

echo "[BACKUP] Copying config files..."
if [ -f "config/topic-priority.json" ]; then
  cp "config/topic-priority.json" "$BACKUP_PATH/config/" || true
fi

if [ -f "config/learned_strategy.json" ]; then
  cp "config/learned_strategy.json" "$BACKUP_PATH/config/" || true
fi

# Создаем метаданные бэкапа
cat > "$BACKUP_PATH/backup-info.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_type": "pre-deploy",
  "files": {
    "semantic_pages": "$(find "$BACKUP_PATH/public/semantic-pages" -type f 2>/dev/null | wc -l | tr -d ' ')",
    "ai_training": "$(find "$BACKUP_PATH/data/seo/ai-training" -type f 2>/dev/null | wc -l | tr -d ' ')"
  }
}
EOF

# Подсчитываем размер
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "[BACKUP] ✅ Backup created: $BACKUP_PATH ($BACKUP_SIZE)"

# Удаляем старые бэкапы (оставляем последние 5)
echo "[BACKUP] Cleaning old backups (keeping last 5)..."
cd "$BACKUP_ROOT"
ls -t | tail -n +6 | xargs -r rm -rf

echo "[BACKUP] ✅ Backup complete!"
