# VIN Trust - Stripe Payment Integration (Vercel)

## 🚀 Quick Deploy to Vercel

### 1️⃣ Install Vercel CLI
```bash
npm i -g vercel
```

### 2️⃣ Deploy
```bash
vercel
```

### 3️⃣ Set Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables:
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRICE_49_RECURRING=price_live_...
RETURN_URL=https://vintrusted.com/payment-success
CANCEL_URL=https://vintrusted.com/payment-cancel
```

### 4️⃣ Configure Stripe Webhook
Point webhook to: `https://your-project.vercel.app/api/webhook`

### 5️⃣ Integration
Add to your report page:
```html
<script src="https://js.stripe.com/v3/"></script>
<script src="https://your-project.vercel.app/vin-stripe.js"></script>
<div id="vin-pay"></div>
<script>VIN.mount('#vin-pay');</script>
```

## 📁 Project Structure
```
├── api/
│   ├── stripe-config.js
│   ├── create-setup-intent.js
│   ├── checkout-trial-then-two-charges.js
│   └── webhook.js
├── public/
│   └── vin-stripe.js
├── vercel.json
└── package.json
```

## ✅ Features
- $3 trial payment
- $49 subscription schedule (day 10 & 30)
- Automatic cancellation after 2nd payment
- 3DS authentication support
- Webhook handling
