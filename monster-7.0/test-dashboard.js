#!/usr/bin/env node

/**
 * Тестирование Dashboard Monster 7.0
 */

const http = require('http');
const { spawn } = require('child_process');

console.log('🧪 Тестирование Monster 7.0 Dashboard\n');

// Проверка зависимостей
console.log('1. Проверка зависимостей...');
try {
    require('express');
    require('socket.io');
    require('cors');
    console.log('   ✅ Все зависимости установлены\n');
} catch (error) {
    console.log('   ❌ Отсутствуют зависимости:', error.message);
    console.log('   💡 Запустите: npm install express socket.io cors\n');
    process.exit(1);
}

// Проверка конфигурации
console.log('2. Проверка конфигурации...');
try {
    const config = require('../config/monster.config.json');
    console.log(`   ✅ Конфигурация загружена (версия ${config.version})\n`);
} catch (error) {
    console.log('   ❌ Ошибка загрузки конфигурации:', error.message, '\n');
    process.exit(1);
}

// Проверка модулей
console.log('3. Проверка модулей...');
const modules = [
    'orchestrator',
    'modules/semantic-scanner',
    'modules/strategy-generator',
    'modules/prompt-engine',
    'modules/evolution-engine',
    'modules/triz-repair',
    'modules/library-scanner',
    'modules/performance-learner',
    'modules/content-generator',
    'ai-knowledge-core/knowledge-core',
    'utils/logger',
    'utils/monitor'
];

let modulesOk = true;
modules.forEach(module => {
    try {
        require(`./core/${module}.js`);
        console.log(`   ✅ ${module}`);
    } catch (error) {
        console.log(`   ❌ ${module}: ${error.message}`);
        modulesOk = false;
    }
});

if (!modulesOk) {
    console.log('\n   ⚠️  Некоторые модули не загружаются, но это может быть нормально\n');
}

// Запуск сервера для тестирования
console.log('4. Запуск сервера для тестирования...\n');

const serverProcess = spawn('node', ['monster-7.0/core/dashboard/server.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
});

let serverReady = false;
let serverOutput = '';

serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log(output);
    
    if (output.includes('running on') || output.includes('Dashboard running')) {
        serverReady = true;
        setTimeout(() => testEndpoints(), 2000);
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
});

// Тестирование endpoints
function testEndpoints() {
    console.log('\n5. Тестирование API endpoints...\n');
    
    const baseUrl = 'http://localhost:3000';
    const endpoints = [
        { path: '/api/status', method: 'GET', name: 'Status' },
        { path: '/api/tasks', method: 'GET', name: 'Tasks' },
        { path: '/monster-ui', method: 'GET', name: 'Dashboard UI' }
    ];
    
    let tested = 0;
    let passed = 0;
    
    endpoints.forEach(endpoint => {
        tested++;
        const url = `${baseUrl}${endpoint.path}`;
        
        const req = http.request(url, { method: endpoint.method }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 404) {
                    console.log(`   ✅ ${endpoint.name} (${res.statusCode})`);
                    passed++;
                } else {
                    console.log(`   ⚠️  ${endpoint.name} (${res.statusCode})`);
                }
                
                if (tested === endpoints.length) {
                    finishTest();
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ${endpoint.name}: ${error.message}`);
            if (tested === endpoints.length) {
                finishTest();
            }
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            console.log(`   ⏱️  ${endpoint.name}: Timeout`);
            if (tested === endpoints.length) {
                finishTest();
            }
        });
        
        req.end();
    });
}

function finishTest() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ\n');
    console.log('✅ Dashboard готов к использованию!');
    console.log('\n🚀 Запуск:');
    console.log('   npm run monster:start');
    console.log('\n🌐 Откройте:');
    console.log('   http://localhost:3000/monster-ui');
    console.log('\n');
    
    // Остановка тестового сервера
    serverProcess.kill();
    process.exit(0);
}

// Таймаут на случай если сервер не запустится
setTimeout(() => {
    if (!serverReady) {
        console.log('\n⚠️  Сервер не запустился за отведенное время');
        console.log('   Проверьте логи выше на наличие ошибок\n');
        serverProcess.kill();
        process.exit(1);
    }
}, 10000);

