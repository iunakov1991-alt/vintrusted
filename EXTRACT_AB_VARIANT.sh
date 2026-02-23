#!/bin/bash
#
# Extract A/B Test Variants from Stripe
# 
# This script uses Stripe CLI to fetch charges and extract ab_variant from metadata
#

echo "🔍 Extracting A/B Test data from Stripe..."
echo ""
echo "📅 Period: Jan 1 - Feb 23, 2026"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not installed!"
    echo ""
    echo "Install it:"
    echo "  macOS: brew install stripe/stripe-cli/stripe"
    echo "  Other: https://stripe.com/docs/stripe-cli"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI found!"
echo ""

# Authenticate if needed
echo "🔐 Checking authentication..."
stripe --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Not authenticated. Run: stripe login"
    exit 1
fi

echo "✅ Authenticated!"
echo ""

# Fetch charges and extract ab_variant
echo "📡 Fetching charges from Stripe..."
echo ""

# Get all charges in the period
CHARGES=$(stripe charges list \
  --created "gte=1767225600" \
  --created "lte=1771919999" \
  --limit 100 \
  2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch charges from Stripe"
    echo "Run 'stripe login' first"
    exit 1
fi

echo "✅ Charges fetched!"
echo ""

# Extract ab_variant from metadata
echo "═══════════════════════════════════════════════════"
echo "🎯 A/B TEST RESULTS"
echo "═══════════════════════════════════════════════════"
echo ""

# Count variants using grep
LIGHT_COUNT=$(echo "$CHARGES" | grep -o '"ab_variant": "light"' | wc -l | xargs)
DARK_COUNT=$(echo "$CHARGES" | grep -o '"ab_variant": "dark"' | wc -l | xargs)
UNKNOWN_COUNT=$(echo "$CHARGES" | grep -o '"ab_variant": "unknown"' | wc -l | xargs)

# Also try variant_a and variant_b
VARIANT_A_COUNT=$(echo "$CHARGES" | grep -o '"ab_variant": "variant_a"' | wc -l | xargs)
VARIANT_B_COUNT=$(echo "$CHARGES" | grep -o '"ab_variant": "variant_b"' | wc -l | xargs)

# Combine counts
LIGHT_TOTAL=$((LIGHT_COUNT + VARIANT_A_COUNT))
DARK_TOTAL=$((DARK_COUNT + VARIANT_B_COUNT))

TOTAL=$((LIGHT_TOTAL + DARK_TOTAL + UNKNOWN_COUNT))

echo "📊 TOTAL CONVERSIONS: $TOTAL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "☀️  VARIANT LIGHT: $LIGHT_TOTAL"
if [ $TOTAL -gt 0 ]; then
    LIGHT_PCT=$((LIGHT_TOTAL * 100 / TOTAL))
    echo "   Percentage: $LIGHT_PCT%"
fi
echo ""
echo "🌙 VARIANT DARK: $DARK_TOTAL"
if [ $TOTAL -gt 0 ]; then
    DARK_PCT=$((DARK_TOTAL * 100 / TOTAL))
    echo "   Percentage: $DARK_PCT%"
fi
echo ""

if [ $UNKNOWN_COUNT -gt 0 ]; then
    echo "❓ UNKNOWN: $UNKNOWN_COUNT"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine winner
if [ $LIGHT_TOTAL -gt $DARK_TOTAL ]; then
    DIFF=$((LIGHT_TOTAL - DARK_TOTAL))
    if [ $DARK_TOTAL -gt 0 ]; then
        IMPROVEMENT=$((DIFF * 100 / DARK_TOTAL))
        echo "🏆 WINNER: ☀️  LIGHT"
        echo "   Better by: $DIFF conversions (+$IMPROVEMENT%)"
    fi
elif [ $DARK_TOTAL -gt $LIGHT_TOTAL ]; then
    DIFF=$((DARK_TOTAL - LIGHT_TOTAL))
    if [ $LIGHT_TOTAL -gt 0 ]; then
        IMPROVEMENT=$((DIFF * 100 / LIGHT_TOTAL))
        echo "🏆 WINNER: 🌙 DARK"
        echo "   Better by: $DIFF conversions (+$IMPROVEMENT%)"
    fi
else
    echo "🤝 TIE: Both variants equal"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo "💡 RECOMMENDATION:"
echo ""

if [ $LIGHT_TOTAL -gt $DARK_TOTAL ]; then
    echo "   ✅ Use LIGHT variant for 100% traffic"
elif [ $DARK_TOTAL -gt $LIGHT_TOTAL ]; then
    echo "   ✅ Use DARK variant for 100% traffic"
else
    echo "   ⚠️  Need more data - variants performing equally"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo "✅ Analysis complete!"
echo ""

# Save detailed results
echo "$CHARGES" | grep -E '"ab_variant"|"created"|"amount"' > /tmp/stripe_ab_charges.txt
echo "💾 Detailed data saved to: /tmp/stripe_ab_charges.txt"
echo ""
