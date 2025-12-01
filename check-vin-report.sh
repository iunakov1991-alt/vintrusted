#!/bin/bash
echo "🔍 Проверка наличия VIN отчета..."
if [ -f "VIN-Report-5TDYK3DC8DS290235.pdf" ]; then
    echo "✅ PDF файл найден!"
    echo "📊 Размер: $(ls -lh VIN-Report-5TDYK3DC8DS290235.pdf | awk '{print $5}')"
    echo ""
    echo "🚀 Запуск обучения..."
    node scripts/train-from-vin-report.js
else
    echo "⚠️  PDF файл не найден в корне проекта"
    echo ""
    echo "📝 Пожалуйста, загрузите файл:"
    echo "   VIN-Report-5TDYK3DC8DS290235.pdf"
    echo "   в директорию: $(pwd)"
fi
