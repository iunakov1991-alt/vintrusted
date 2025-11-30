# VIN TRUST - Stripe Payment Integration

## 🚀 Production Deployment Guide

### Environment Setup
1. Copy `.env.example` to `.env` and fill in your Stripe keys
2. Set production URLs in RETURN_URL and CANCEL_URL
3. Ensure Stripe webhook is configured to point to your domain

### Server Features
- ✅ API-only architecture (no root page serving)
- ✅ Embeddable payment widget (`vin-stripe.js`)
- ✅ Full Stripe integration with 3DS support
- ✅ Subscription schedule management
- ✅ Webhook handling for automatic cancellation
- ✅ CORS enabled for cross-domain integration

### Payment Flow
1. **Trial**: $3 immediate payment
2. **Schedule**: Starts after 10 days
   - Phase 1: $49 after ~30 days from schedule start
   - Phase 2: $49 immediately after Phase 1 ends
3. **Auto-cancel**: After 2nd payment via webhook

### Integration
Add to any report page:
```html
<script src="https://js.stripe.com/v3/"></script>
<script src="https://YOURDOMAIN.com/pay-assets/vin-stripe.js"></script>
<div id="vin-pay"></div>
<script>VIN.mount('#vin-pay', { apiBase: '/api' });</script>
```

### API Endpoints
- `GET /api/stripe-config` - Frontend configuration
- `POST /api/create-setup-intent` - SetupIntent creation
- `POST /api/checkout-trial-then-two-charges` - Main checkout
- `POST /webhook` - Stripe webhook handler
- `GET /pay-assets/vin-stripe.js` - Embeddable widget

### Production Checklist
- [ ] Update .env with live Stripe keys
- [ ] Set correct RETURN_URL and CANCEL_URL
- [ ] Configure Stripe webhook endpoint
- [ ] Test payment flow end-to-end
- [ ] Monitor webhook events in Stripe Dashboard
