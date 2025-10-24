# VIN TRUST - Stripe Integration Setup

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Stripe keys:**
   - Open `server.js`
   - Replace `sk_live_YOUR_SECRET_KEY_HERE` with your actual Stripe secret key
   - Open `index.html`
   - Replace `pk_live_YOUR_PUBLISHABLE_KEY_HERE` with your actual Stripe publishable key

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access your site:**
   - Open http://localhost:3000

## 💳 Stripe Configuration

### Price IDs Used:
- **Trial Price:** `price_1SLgSWIyzEAMYCDXa8g7uV6W` ($3 for 10 days trial)
- **Monthly Price:** `price_1SLJ2AIyzEAMYCDX2OkNtk20` ($49 monthly subscription)

### Payment Flow:
1. User enters VIN and clicks payment button
2. Creates Stripe Checkout Session with trial price
3. User completes payment on Stripe's secure page
4. Redirects to success page
5. Subscription starts with 10-day trial period

## 🔧 API Endpoints

### POST `/create-checkout-session`
Creates a Stripe Checkout Session for subscription payment.

**Request Body:**
```json
{
  "priceId": "price_1SLgSWIyzEAMYCDXa8g7uV6W",
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel",
  "vin": "1GCUYDED8JZ123456"
}
```

**Response:**
```json
{
  "id": "cs_test_..."
}
```

### POST `/create-subscription`
Alternative method using token-based payments.

**Request Body:**
```json
{
  "token": "tok_..."
}
```

**Response:**
```json
{
  "success": true,
  "sub_id": "sub_...",
  "setup_fee": "ch_..."
}
```

## 🛡️ Security Notes

- Never commit real Stripe keys to Git
- Use environment variables in production
- Implement webhook handlers for subscription events
- Add proper error handling and logging

## 📱 Frontend Integration

The frontend automatically:
- Loads Stripe.js
- Creates checkout sessions
- Handles redirects
- Shows success/error messages

## 🔄 Development vs Production

### Development:
- Use test keys (`sk_test_...`, `pk_test_...`)
- Test with Stripe test cards
- Use localhost URLs

### Production:
- Use live keys (`sk_live_...`, `pk_live_...`)
- Update success/cancel URLs
- Implement webhook handlers
- Add proper logging

## 🚨 Important

Replace placeholder keys before deploying to production!
