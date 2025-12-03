#!/bin/bash

# Мониторинг логов Monster 7.0 в реальном времени

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 МОНИТОРИНГ ЛОГОВ MONSTER 7.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

last_timestamp=""

while true; do
    # Получение логов
    logs=$(curl -s "http://localhost:3000/api/logs?limit=20" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$logs" ]; then
        # Парсинг JSON и вывод новых логов
        echo "$logs" | python3 -c "
import sys, json
from datetime import datetime

try:
    data = json.load(sys.stdin)
    logs = data.get('logs', [])
    
    for log in logs:
        timestamp = log.get('timestamp', '')
        level = log.get('level', 'INFO')
        module = log.get('module', 'UNKNOWN')
        message = log.get('message', '')
        
        # Цвета для уровней
        if level == 'ERROR':
            color = '\033[31m'  # Красный
        elif level == 'WARN':
            color = '\033[33m'  # Желтый
        elif level == 'INFO':
            color = '\033[32m'  # Зеленый
        else:
            color = '\033[36m'  # Голубой
        
        reset = '\033[0m'
        
        # Форматирование времени
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            time_str = dt.strftime('%H:%M:%S')
        except:
            time_str = timestamp
        
        print(f\"{color}[{level}]{reset} {time_str} [{module}] {message}\")
        
except Exception as e:
    print(f'Error parsing logs: {e}')
" 2>/dev/null
        
        # Статус системы
        status=$(curl -s http://localhost:3000/api/status 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$status" ]; then
            echo ""
            echo "$status" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    mem = d.get('memory', {})
    tasks = d.get('tasks', {})
    perf = d.get('performance', {})
    
    print(f\"📊 Память: {mem.get('used', 0)} MB ({mem.get('percent', 0)}%) | Задач: {tasks.get('running', 0)} running, {tasks.get('completed', 0)} completed, {tasks.get('failed', 0)} failed\")
except:
    pass
" 2>/dev/null
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo "⚠️  Не удалось получить логи (сервер не запущен?)"
        sleep 5
    fi
    
    sleep 3
done

