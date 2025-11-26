#!/bin/bash

# Deploy Batch 1: articles (14,000 routes)
# This script prepares and validates Batch 1 deployment

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     ДЕПЛОЙ BATCH 1: ARTICLES (14,000 маршрутов)       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if backup exists
if [ ! -f "vercel.json.backup" ]; then
    echo "❌ vercel.json.backup not found! Creating backup..."
    cp vercel.json vercel.json.backup
    echo "✅ Backup created"
fi

# Check if batch1 version exists
if [ ! -f "vercel-batch1.json" ]; then
    echo "❌ vercel-batch1.json not found! Creating it..."
    node split-vercel-batches.js
fi

# Apply Batch 1 version
echo "📋 Applying Batch 1 configuration..."
cp vercel-batch1.json vercel.json
echo "✅ vercel.json updated for Batch 1"

# Validate JSON
echo ""
echo "🔍 Validating vercel.json..."
if python3 -m json.tool vercel.json > /dev/null 2>&1; then
    echo "✅ vercel.json is valid"
else
    echo "❌ vercel.json validation failed!"
    exit 1
fi

# Check route count
echo ""
echo "📊 Route statistics:"
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const routes = data.routes || [];
const batch1 = routes.filter(r => r.src && r.src.startsWith('/articles/'));
const batch2 = routes.filter(r => r.src && r.src.startsWith('/articles2/'));

console.log('  Total routes:', routes.length);
console.log('  Batch 1 routes:', batch1.length);
console.log('  Batch 2 routes:', batch2.length);

if (batch2.length > 0) {
    console.log('  ⚠️  Warning: Batch 2 routes still present!');
    process.exit(1);
} else {
    console.log('  ✅ Batch 1 only - ready for deployment');
}
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Validation failed! Please check the configuration."
    exit 1
fi

echo ""
echo "✅ Batch 1 is ready for deployment!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit: git add vercel.json && git commit -m 'Deploy batch 1: articles (14,000 routes)'"
echo "  3. Push and deploy to Vercel"
echo ""
echo "⚠️  Note: After successful deployment of Batch 1, run deploy-batch2.sh"


