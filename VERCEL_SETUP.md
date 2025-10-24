# Vercel Environment Variables Setup

## Required Environment Variables for Vercel Dashboard:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add the following variables:

```
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY  
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
PRICE_49_RECURRING=price_live_YOUR_RECURRING_PRICE_ID
RETURN_URL=https://vintrusted.com/success.html
CANCEL_URL=https://vintrusted.com/success.html
```

## After adding variables:
1. Redeploy the project
2. Test API endpoints:
   - https://vintrusted.com/api/stripe-config
   - https://vintrusted.com/api/create-payment-intent

## Features included:
- ✅ Stripe Payment Element with Apple Pay and Google Pay
- ✅ $3.00 trial payment
- ✅ Automatic subscription scheduling
- ✅ Full report page with payment form
- ✅ Success page redirect
