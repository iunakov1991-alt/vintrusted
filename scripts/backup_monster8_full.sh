#!/usr/bin/env bash

# backup_monster8_full.sh
# Полный бэкап MONSTER 8.0 и сайта

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Параметры
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_DIR="backups/monster8-full-${TIMESTAMP}"
BACKUP_ROOT="${PROJECT_ROOT}/${BACKUP_DIR}"

log() {
  echo "[BACKUP] $(date '+%H:%M:%S') $*"
}

log "Начало полного бэкапа MONSTER 8.0 и сайта"
log "Директория бэкапа: ${BACKUP_DIR}"

# Создаем директорию бэкапа
mkdir -p "$BACKUP_ROOT"

# ============================================================
# 1. MONSTER 8.0 - ОСНОВНЫЕ КОМПОНЕНТЫ
# ============================================================

log "Бэкап MONSTER 8.0 компонентов..."

# Оркестратор
if [ -f "monster8_orchestrator.sh" ]; then
  mkdir -p "$BACKUP_ROOT/monster8"
  cp "monster8_orchestrator.sh" "$BACKUP_ROOT/monster8/"
  log "  ✅ Оркестратор"
fi

# Dashboard
if [ -d "monster-8.0" ]; then
  mkdir -p "$BACKUP_ROOT/monster-8.0"
  cp -r "monster-8.0"/* "$BACKUP_ROOT/monster-8.0/"
  log "  ✅ Dashboard"
fi

# Скрипты MONSTER 8.0
mkdir -p "$BACKUP_ROOT/scripts"
for script in \
  "scripts/batch_scheduler.js" \
  "scripts/build_topics_batch.parallel.js" \
  "scripts/auto_deploy_page.sh" \
  "scripts/auto_backup.sh" \
  "scripts/watchdog_orchestrator.js" \
  "scripts/update_deploy_status.js" \
  "scripts/sort_topics_by_priority.js" \
  "scripts/generate_semantic_pages_sitemap.js" \
  "scripts/validate_before_deploy.js" \
  "scripts/safe_deploy.sh"; do
  if [ -f "$script" ]; then
    cp "$script" "$BACKUP_ROOT/scripts/"
    log "  ✅ $(basename $script)"
  fi
done

# ============================================================
# 2. КОНФИГУРАЦИИ
# ============================================================

log "Бэкап конфигураций..."

mkdir -p "$BACKUP_ROOT/config"
for config in \
  "config/topic-priority.json" \
  "config/batch-strategy.json" \
  "config/monster-7.1.config.json" \
  "config/autonomy-config.json" \
  "config/cluster-policy.json" \
  "config/lang-policy.json"; do
  if [ -f "$config" ]; then
    cp "$config" "$BACKUP_ROOT/config/"
    log "  ✅ $(basename $config)"
  fi
done

# ============================================================
# 3. ДАННЫЕ ОБУЧЕНИЯ И КЭШ
# ============================================================

log "Бэкап данных обучения..."

mkdir -p "$BACKUP_ROOT/data/seo/ai-training"
for data_file in \
  "data/seo/ai-training/learned-strategy.json" \
  "data/seo/ai-training/knowledge-base.jsonl" \
  "data/seo/ai-cache.jsonl" \
  "data/seo/config.json" \
  "data/seo/url-seeds.json"; do
  if [ -f "$data_file" ]; then
    mkdir -p "$BACKUP_ROOT/$(dirname $data_file)"
    cp "$data_file" "$BACKUP_ROOT/$data_file"
    log "  ✅ $(basename $data_file)"
  fi
done

# ============================================================
# 4. СГЕНЕРИРОВАННЫЕ СТРАНИЦЫ
# ============================================================

log "Бэкап сгенерированных страниц..."

if [ -d "public/semantic-pages" ]; then
  mkdir -p "$BACKUP_ROOT/public"
  log "  Копирование semantic-pages (это может занять время)..."
  cp -r "public/semantic-pages" "$BACKUP_ROOT/public/" 2>/dev/null || {
    log "  ⚠️  Частичная ошибка копирования (возможно, файлы заблокированы)"
  }
  log "  ✅ semantic-pages"
fi

# ============================================================
# 5. САЙТМАПЫ
# ============================================================

log "Бэкап сайтмапов..."

if [ -d "public/seo/sitemaps" ]; then
  mkdir -p "$BACKUP_ROOT/public/seo"
  cp -r "public/seo/sitemaps" "$BACKUP_ROOT/public/seo/" 2>/dev/null || true
  log "  ✅ sitemaps"
fi

if [ -f "public/sitemap-seo-monster.xml" ]; then
  mkdir -p "$BACKUP_ROOT/public"
  cp "public/sitemap-seo-monster.xml" "$BACKUP_ROOT/public/" 2>/dev/null || true
  log "  ✅ sitemap-seo-monster.xml"
fi

# ============================================================
# 6. КОНФИГУРАЦИЯ ПРОЕКТА
# ============================================================

log "Бэкап конфигурации проекта..."

for config_file in \
  "vercel.json" \
  "package.json" \
  "index.html" \
  ".gitignore" \
  "README.md"; do
  if [ -f "$config_file" ]; then
    cp "$config_file" "$BACKUP_ROOT/" 2>/dev/null || true
    log "  ✅ $config_file"
  fi
done

# ============================================================
# 7. API ENDPOINTS
# ============================================================

log "Бэкап API endpoints..."

if [ -d "api" ]; then
  mkdir -p "$BACKUP_ROOT/api"
  for api_file in \
    "api/semantic-page.js" \
    "api/seo-sitemap.js" \
    "api/seo-page.js"; do
    if [ -f "$api_file" ]; then
      cp "$api_file" "$BACKUP_ROOT/api/" 2>/dev/null || true
      log "  ✅ $(basename $api_file)"
    fi
  done
fi

# ============================================================
# 8. ДОКУМЕНТАЦИЯ
# ============================================================

log "Бэкап документации..."

mkdir -p "$BACKUP_ROOT/docs"
for doc_file in \
  "docs/BATCH_SCHEDULER_IMPLEMENTATION.md" \
  "docs/LEARNING_MEMORY_STATUS.md" \
  "docs/IMPROVEMENTS_PROPOSAL.md" \
  "docs/MONSTER8_READINESS_REPORT.md" \
  "docs/AUTO_DEPLOY_IMPLEMENTATION.md"; do
  if [ -f "$doc_file" ]; then
    cp "$doc_file" "$BACKUP_ROOT/docs/" 2>/dev/null || true
    log "  ✅ $(basename $doc_file)"
  fi
done

# ============================================================
# 9. ИНФОРМАЦИЯ О ВЕРСИИ
# ============================================================

log "Создание информации о версии..."

cat > "$BACKUP_ROOT/BACKUP_INFO.txt" << EOF
MONSTER 8.0 - Полный бэкап
==========================

Дата создания: $(date '+%Y-%m-%d %H:%M:%S')
Версия: MONSTER 8.0

Компоненты:
- Оркестратор: monster8_orchestrator.sh
- Dashboard: monster-8.0/dashboard/
- Планировщик партий: scripts/batch_scheduler.js
- Автодеплой: scripts/auto_deploy_page.sh
- Генерация сайтмапа: scripts/generate_semantic_pages_sitemap.js

Статистика:
- EN страниц: $(find public/semantic-pages/en -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
- ES страниц: $(find public/semantic-pages/es -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
- Всего страниц: $(find public/semantic-pages -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')

Git информация:
$(git log -1 --pretty=format:"Commit: %H%nAuthor: %an%nDate: %ad%nMessage: %s" 2>/dev/null || echo "Git информация недоступна")

EOF

# ============================================================
# 10. СОЗДАНИЕ АРХИВА (ОПЦИОНАЛЬНО)
# ============================================================

log "Создание архива..."

cd "$PROJECT_ROOT"
if command -v tar >/dev/null 2>&1; then
  ARCHIVE_NAME="monster8-full-${TIMESTAMP}.tar.gz"
  tar -czf "backups/${ARCHIVE_NAME}" -C backups "monster8-full-${TIMESTAMP}" 2>/dev/null || {
    log "  ⚠️  Не удалось создать архив (возможно, файлы слишком большие)"
  }
  if [ -f "backups/${ARCHIVE_NAME}" ]; then
    ARCHIVE_SIZE=$(du -h "backups/${ARCHIVE_NAME}" | cut -f1)
    log "  ✅ Архив создан: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"
  fi
else
  log "  ⚠️  tar не найден, архив не создан"
fi

# ============================================================
# 11. СТАТИСТИКА БЭКАПА
# ============================================================

log "Подсчет статистики..."

BACKUP_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1 || echo "неизвестно")
FILE_COUNT=$(find "$BACKUP_ROOT" -type f 2>/dev/null | wc -l | tr -d ' ')

cat >> "$BACKUP_ROOT/BACKUP_INFO.txt" << EOF

Статистика бэкапа:
- Размер: ${BACKUP_SIZE}
- Файлов: ${FILE_COUNT}
- Директория: ${BACKUP_DIR}

EOF

log ""
log "✅ Бэкап завершен!"
log "  Директория: ${BACKUP_DIR}"
log "  Размер: ${BACKUP_SIZE}"
log "  Файлов: ${FILE_COUNT}"
if [ -f "backups/${ARCHIVE_NAME}" ]; then
  log "  Архив: ${ARCHIVE_NAME}"
fi
log ""
log "Для восстановления скопируйте файлы из ${BACKUP_DIR}"

