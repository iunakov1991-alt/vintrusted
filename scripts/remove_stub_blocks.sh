#!/bin/bash
# Удаляет STUB блоки из EN страниц

for file in public/semantic-pages/en/dmv-titles/*/title-types/checklist/index.html; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Удаляем STUB блоки но оставляем заголовки секций
    sed -i '' '/<p>STUB BLOCK/d' "$file"
    sed -i '' '/This placeholder keeps the pipeline/d' "$file"
    sed -i '' '/Provide DEEPSEEK_API_KEY/d' "$file"
    echo "✅ Cleaned: $file"
  fi
done

echo "🎉 All STUB blocks removed!"
