#!/bin/bash

# Deploy Batch 2: articles2 (20,400 routes + pagination)
# This script restores full vercel.json with Batch 2 routes

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   ДЕПЛОЙ BATCH 2: ARTICLES2 (20,400 маршрутов)        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if backup exists
if [ ! -f "vercel.json.backup" ]; then
    echo "❌ vercel.json.backup not found!"
    echo "   Please ensure you have the full backup before deploying Batch 2"
    exit 1
fi

# Restore full version
echo "📋 Restoring full vercel.json with Batch 2..."
cp vercel.json.backup vercel.json
echo "✅ vercel.json restored with all routes"

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
const batch1 = routes.filter(r => r.src && r.src.startsWith('/articles/') && !r.src.startsWith('/articles2/'));
const batch2 = routes.filter(r => r.src && r.src.startsWith('/articles2/'));
const pagination = routes.filter(r => r.src && r.src.includes('/articles2/page/'));
const other = routes.filter(r => !r.src || (!r.src.startsWith('/articles/') && !r.src.startsWith('/articles2/')));

console.log('  Total routes:', routes.length);
console.log('  Batch 1 routes:', batch1.length);
console.log('  Batch 2 routes:', batch2.length);
console.log('  Pagination routes:', pagination.length);
console.log('  Other routes:', other.length);

if (batch2.length === 0) {
    console.log('  ⚠️  Warning: Batch 2 routes not found!');
    process.exit(1);
} else {
    console.log('  ✅ Full configuration - ready for deployment');
}
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Validation failed! Please check the configuration."
    exit 1
fi

# Check for duplicates
echo ""
echo "🔍 Checking for duplicates..."
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const routes = data.routes || [];
const srcs = routes.map(r => r.src);
const duplicates = srcs.filter((item, index) => srcs.indexOf(item) !== index);

if (duplicates.length > 0) {
    console.log('  ⚠️  Found', duplicates.length, 'duplicates');
    process.exit(1);
} else {
    console.log('  ✅ No duplicates found');
}
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Duplicate check failed!"
    exit 1
fi

echo ""
echo "✅ Batch 2 is ready for deployment!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit: git add vercel.json && git commit -m 'Deploy batch 2: articles2 (20,400 routes + pagination)'"
echo "  3. Push and deploy to Vercel"
echo ""
echo "🎉 Full deployment complete after this step!"


