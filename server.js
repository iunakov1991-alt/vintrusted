const express = require('express');
const stripe = require('stripe')('sk_live_YOUR_SECRET_KEY_HERE'); // Замените на ваш secret key
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Stripe Configuration
const STRIPE_CONFIG = {
    PRICE_TRIAL: 'price_1SLgSWIyzEAMYCDXa8g7uV6W', // $3 за 10 дней триал
    PRICE_MONTHLY: 'price_1SLJ2AIyzEAMYCDX2OkNtk20', // $49 месячная подписка
    CURRENCY: 'usd',
    TRIAL_DAYS: 10
};

// Create Checkout Session endpoint
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { priceId, successUrl, cancelUrl, vin } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId || STRIPE_CONFIG.PRICE_TRIAL,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl || `${req.protocol}://${req.get('host')}/success`,
            cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/cancel`,
            subscription_data: {
                trial_period_days: STRIPE_CONFIG.TRIAL_DAYS,
                metadata: {
                    vin: vin || 'unknown'
                }
            },
            metadata: {
                vin: vin || 'unknown'
            }
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create subscription endpoint (alternative method)
app.post('/create-subscription', async (req, res) => {
    const { token } = req.body;

    try {
        // Создаём клиента
        const customer = await stripe.customers.create({
            source: token,
            metadata: { trial_start: Date.now() },
        });

        // 1. Сначала списываем $3 (setup fee)
        const setupFee = await stripe.charges.create({
            amount: 300, // $3
            currency: 'usd',
            customer: customer.id,
            description: 'Trial setup fee',
        });

        // Проверяем, прошёл ли платёж
        if (setupFee.status !== 'succeeded') {
            throw new Error('Не удалось списать $3 setup fee');
        }

        // 2. После успешного $3 создаём подписку на $49/мес с 10-дневным триалом
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price: STRIPE_CONFIG.PRICE_MONTHLY,
                },
            ],
            trial_period_days: STRIPE_CONFIG.TRIAL_DAYS,
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        res.json({
            success: true,
            sub_id: subscription.id,
            setup_fee: setupFee.id,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// Success page
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful - VIN TRUST</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                .info { color: #666; margin-bottom: 30px; }
                .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="success">✅ Payment Successful!</div>
            <div class="info">Your VIN report subscription is now active.</div>
            <a href="/" class="btn">Return to VIN TRUST</a>
        </body>
        </html>
    `);
});

// Cancel page
app.get('/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled - VIN TRUST</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .cancel { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
                .info { color: #666; margin-bottom: 30px; }
                .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="cancel">❌ Payment Cancelled</div>
            <div class="info">Your payment was cancelled. You can try again anytime.</div>
            <a href="/" class="btn">Return to VIN TRUST</a>
        </body>
        </html>
    `);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 VIN TRUST Server running on port ${PORT}`);
    console.log(`📱 Access your site at: http://localhost:${PORT}`);
    console.log(`💳 Stripe integration ready with Price ID: ${STRIPE_CONFIG.PRICE_TRIAL}`);
});

module.exports = app;
