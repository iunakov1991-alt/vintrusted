#!/bin/bash

# Скрипт для получения логов Dashboard

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ЛОГИ MONSTER 7.0 DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Статус системы:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3000/api/status | python3 -m json.tool 2>/dev/null || echo "API недоступен"
echo ""

echo "2. Задачи:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3000/api/tasks | python3 -m json.tool 2>/dev/null || echo "API недоступен"
echo ""

echo "3. Последние логи (API):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3000/api/logs?limit=30" | python3 -m json.tool 2>/dev/null || echo "API недоступен"
echo ""

echo "4. Файловые логи:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ls data/logs/monster_*.log 1> /dev/null 2>&1; then
    tail -30 $(ls -t data/logs/monster_*.log | head -1)
else
    echo "Логи еще не созданы"
fi
echo ""

echo "5. Метрики:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3000/api/metrics?limit=10" | python3 -m json.tool 2>/dev/null || echo "API недоступен"
echo ""

