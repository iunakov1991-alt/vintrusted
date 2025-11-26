#!/bin/bash

# Single deployment script - deploys everything in one go
# This combines Batch 1 + Batch 2 into one deployment

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     ЕДИНЫЙ ДЕПЛОЙ: ВСЕ ИЗМЕНЕНИЯ ОДНИМ ДЕПЛОЕМ        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if backup exists
if [ ! -f "vercel.json.backup" ]; then
    echo "❌ vercel.json.backup not found!"
    echo "   Creating backup from current vercel.json..."
    cp vercel.json vercel.json.backup
    echo "✅ Backup created"
fi

# Restore full version
echo "📋 Restoring full vercel.json with all routes..."
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

# Check route count and distribution
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
console.log('  Batch 1 (articles/):', batch1.length);
console.log('  Batch 2 (articles2/):', batch2.length);
console.log('  Pagination:', pagination.length);
console.log('  Other routes:', other.length);
console.log('');

if (batch1.length === 0 || batch2.length === 0) {
    console.log('  ⚠️  Warning: Missing routes!');
    console.log('     Batch 1:', batch1.length > 0 ? '✅' : '❌');
    console.log('     Batch 2:', batch2.length > 0 ? '✅' : '❌');
    process.exit(1);
} else {
    console.log('  ✅ Full configuration - all routes included');
}
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Route validation failed!"
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

# Check files
echo ""
echo "📁 Checking files:"
BATCH1_COUNT=$(find articles -type f -name "index.html" 2>/dev/null | wc -l | tr -d ' ')
BATCH2_COUNT=$(find articles2 -type f -name "index.html" 2>/dev/null | wc -l | tr -d ' ')
PAGINATION_COUNT=$(find articles2/page -type f -name "index.html" 2>/dev/null | wc -l | tr -d ' ')

echo "  Batch 1 articles: $BATCH1_COUNT"
echo "  Batch 2 articles: $BATCH2_COUNT"
echo "  Pagination pages: $PAGINATION_COUNT"

if [ "$BATCH1_COUNT" -lt 1000 ] || [ "$BATCH2_COUNT" -lt 1000 ]; then
    echo "  ⚠️  Warning: Some articles may be missing"
else
    echo "  ✅ All files present"
fi

echo ""
echo "✅ Everything is ready for single deployment!"
echo ""
echo "📋 Summary:"
echo "   - Total routes: $(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('vercel.json','utf8')); console.log(d.routes.length);")"
echo "   - Batch 1 articles: $BATCH1_COUNT"
echo "   - Batch 2 articles: $BATCH2_COUNT"
echo "   - Pagination: $PAGINATION_COUNT"
echo ""
echo "🚀 Next steps:"
echo "   1. Review: git status"
echo "   2. Commit: git add . && git commit -m 'Deploy all: 24,000 articles + pagination (41,161 routes)'"
echo "   3. Push: git push"
echo "   4. Deploy: vercel --prod (or wait for automatic deployment)"
echo ""
echo "💡 Tip: Use [skip vercel] in commit message to deploy manually:"
echo "   git commit -m 'Deploy all [skip vercel]'"
echo "   vercel --prod"


