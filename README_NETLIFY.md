# VIN Trusted - Netlify Setup

## 🚀 Deployment Status
✅ **Successfully migrated from Vercel to Netlify**

## 🔧 Environment Variables Required

Set these in Netlify Dashboard → Site Settings → Environment Variables:

```
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RETURN_URL=https://vintrusted.com/payment-success
CANCEL_URL=https://vintrusted.com/payment-cancel
PRICE_49_EVERY_20D=price_xxx
```

## 📁 File Structure

```
├── netlify/
│   └── functions/
│       ├── stripe-config.js
│       ├── create-setup-intent.js
│       └── checkout-trial-then-two-charges.js
├── netlify.toml
├── package.json
└── [all website files]
```

## 🔧 API Endpoints

- `/api/stripe-config` → `/.netlify/functions/stripe-config`
- `/api/create-setup-intent` → `/.netlify/functions/create-setup-intent`
- `/api/checkout-trial-then-two-charges` → `/.netlify/functions/checkout-trial-then-two-charges`

## ✅ What's Working

- ✅ Website loads on Netlify
- ✅ API functions converted to Netlify format
- ✅ CORS headers added
- ✅ Stripe integration ready
- ✅ No deployment limits

## 🎯 Next Steps

1. Set environment variables in Netlify Dashboard
2. Test Stripe payment flow
3. Configure webhooks if needed
