#!/bin/bash
# Скрипт для проверки работоспособности после деплоя

set -e

BASE_URL="${1:-https://vintrusted.com}"

echo "🔍 Checking deployment health..."
echo "Base URL: $BASE_URL"
echo ""

# Проверка health endpoint
echo "1. Checking /api/health..."
HEALTH=$(curl -s "$BASE_URL/api/health" || echo "ERROR")
if echo "$HEALTH" | grep -q "vinaudit\|stripe"; then
  echo "   ✓ Health endpoint OK"
  echo "   Response: $HEALTH"
else
  echo "   ✗ Health endpoint failed"
  echo "   Response: $HEALTH"
fi
echo ""

# Проверка stripe-config
echo "2. Checking /api/stripe-config..."
STRIPE_CONFIG=$(curl -s "$BASE_URL/api/stripe-config" || echo "ERROR")
if echo "$STRIPE_CONFIG" | grep -q "publishableKey"; then
  echo "   ✓ Stripe config OK"
else
  echo "   ✗ Stripe config failed"
  echo "   Response: $STRIPE_CONFIG"
fi
echo ""

# Проверка главной страницы
echo "3. Checking main page..."
INDEX=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || echo "000")
if [ "$INDEX" = "200" ]; then
  echo "   ✓ Main page OK (HTTP $INDEX)"
else
  echo "   ✗ Main page failed (HTTP $INDEX)"
fi
echo ""

# Проверка report page
echo "4. Checking report page..."
REPORT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/report.html" || echo "000")
if [ "$REPORT" = "200" ]; then
  echo "   ✓ Report page OK (HTTP $REPORT)"
else
  echo "   ✗ Report page failed (HTTP $REPORT)"
fi
echo ""

# Проверка success page
echo "5. Checking success page..."
SUCCESS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/success.html" || echo "000")
if [ "$SUCCESS" = "200" ]; then
  echo "   ✓ Success page OK (HTTP $SUCCESS)"
else
  echo "   ✗ Success page failed (HTTP $SUCCESS)"
fi
echo ""

echo "✅ Deployment check complete!"
echo ""
echo "If any checks failed:"
echo "  1. Check Vercel deployment logs"
echo "  2. Verify environment variables are set"
echo "  3. Check API endpoint responses in browser"
echo "  4. Review Vercel function logs"

