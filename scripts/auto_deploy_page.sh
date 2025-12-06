#!/usr/bin/env bash
# Автоматический деплой одной страницы или партии страниц

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Параметры
DEPLOY_MODE="${1:-single}"  # single или batch
PAGE_PATH="${2:-}"           # Путь к странице (для single mode)
DRY_RUN="${DRY_RUN:-0}"     # 1 = только показать что будет сделано

log() {
  echo "[DEPLOY] $(date '+%H:%M:%S') $*"
}

# Проверка наличия git
if ! command -v git >/dev/null 2>&1; then
  log "ERROR: git not found"
  exit 1
fi

# Проверка что мы в git репозитории
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  log "ERROR: Not a git repository"
  exit 1
fi

# Функция деплоя одной страницы
deploy_single_page() {
  local page_path="$1"
  
  # Если путь относительный, делаем абсолютным
  if [[ "$page_path" != /* ]]; then
    page_path="$PROJECT_ROOT/$page_path"
  fi
  
  if [ ! -f "$page_path" ]; then
    log "ERROR: Page not found: $page_path"
    return 1
  fi
  
  # Получаем относительный путь от корня проекта для git
  local git_path="${page_path#$PROJECT_ROOT/}"
  
  log "Deploying single page: $git_path"
  
  # Получаем имя директории для коммита
  local dir_path="$(dirname "$git_path")"
  local page_name="$(basename "$dir_path")"
  
  # Добавляем в git
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY RUN: Would add: $git_path"
    log "DRY RUN: Would commit: Deploy $page_name page"
    log "DRY RUN: Would push to origin"
  else
    git add "$git_path"
    git commit -m "Deploy $page_name page (MONSTER 8.0)" || {
      log "WARNING: Nothing to commit (page already deployed?)"
      return 0
    }
    git push origin "$(git branch --show-current)" || {
      log "ERROR: Failed to push"
      return 1
    }
    log "✅ Page deployed successfully"
  fi
  
  return 0
}

# Функция деплоя всех новых страниц
deploy_batch() {
  log "Deploying batch of new pages..."
  
  # Находим все новые страницы в semantic-pages
  local new_pages=()
  
  # Проверяем статус git для semantic-pages
  while IFS= read -r file; do
    if [[ "$file" == public/semantic-pages/*/index.html ]]; then
      new_pages+=("$file")
    fi
  done < <(git status --porcelain | grep -E '^\?\?|^ M|^A ' | awk '{print $NF}' | grep 'semantic-pages.*index.html$' || true)
  
  if [ ${#new_pages[@]} -eq 0 ]; then
    log "No new pages to deploy"
    return 0
  fi
  
  log "Found ${#new_pages[@]} new pages to deploy"
  
  if [ "$DRY_RUN" = "1" ]; then
    for page in "${new_pages[@]}"; do
      log "DRY RUN: Would deploy: $page"
    done
    return 0
  fi
  
  # Добавляем все новые страницы
  git add "${new_pages[@]}"
  
  # Коммитим
  local commit_msg="Deploy ${#new_pages[@]} semantic pages (MONSTER 8.0)"
  git commit -m "$commit_msg" || {
    log "WARNING: Nothing to commit"
    return 0
  }
  
  # Пушим
  git push origin "$(git branch --show-current)" || {
    log "ERROR: Failed to push"
    return 1
  }
  
  log "✅ Deployed ${#new_pages[@]} pages successfully"
  
  # Планируем следующую партию после успешного деплоя
  if command -v node >/dev/null 2>&1; then
    log "Scheduling next batch..."
    node -e "
      const batchScheduler = require('./scripts/batch_scheduler');
      const history = batchScheduler.loadHistory();
      const lastBatch = history.batches[history.batches.length - 1] || null;
      
      if (lastBatch || ${#new_pages[@]} > 0) {
        const nextBatch = batchScheduler.scheduleNextBatch({
          batchNumber: lastBatch ? lastBatch.batchNumber + 1 : 1,
          language: lastBatch && lastBatch.language === 'en' ? 'es' : 'en',
          pagesGenerated: ${#new_pages[@]},
          pagesDeployed: ${#new_pages[@]}
        });
        console.log('Next batch scheduled:', nextBatch.batchId, 'at', nextBatch.scheduledAt);
      }
    " 2>/dev/null || log "WARNING: Failed to schedule next batch (non-critical)"
  fi
  
  return 0
}

# Основная логика
main() {
  log "Starting auto-deploy (mode: $DEPLOY_MODE)"
  
  if [ "$DEPLOY_MODE" = "single" ]; then
    if [ -z "$PAGE_PATH" ]; then
      log "ERROR: PAGE_PATH required for single mode"
      exit 1
    fi
    deploy_single_page "$PAGE_PATH"
  elif [ "$DEPLOY_MODE" = "batch" ]; then
    deploy_batch
  else
    log "ERROR: Unknown mode: $DEPLOY_MODE (use 'single' or 'batch')"
    exit 1
  fi
}

main "$@"

