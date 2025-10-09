// Server Configuration and API Routes
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'report.html'));
});

// VIN Check API
app.post('/api/vin-check', async (req, res) => {
    try {
        const { vin } = req.body;
        
        if (!vin || vin.length !== 17) {
            return res.status(400).json({
                success: false,
                error: 'Неверный формат VIN-номера'
            });
        }

        // Валидация VIN
        if (!validateVIN(vin)) {
            return res.status(400).json({
                success: false,
                error: 'Недопустимый VIN-номер'
            });
        }

        // Получение данных об автомобиле (замените на реальный API)
        const vehicleData = await getVehicleData(vin);
        
        res.json({
            success: true,
            data: vehicleData
        });

    } catch (error) {
        console.error('VIN Check Error:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// Создание Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { vin, amount = 100 } = req.body; // $1.00 в центах

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            metadata: {
                vin: vin,
                type: 'vin_check'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Payment Intent Error:', error);
        res.status(500).json({
            error: 'Ошибка создания платежа'
        });
    }
});

// Создание подписки
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { customerId, priceId } = req.body;

        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });

        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret
        });

    } catch (error) {
        console.error('Subscription Error:', error);
        res.status(500).json({
            error: 'Ошибка создания подписки'
        });
    }
});

// Webhook для обработки событий Stripe
app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Обработка событий
    switch (event.type) {
        case 'payment_intent.succeeded':
            handlePaymentSuccess(event.data.object);
            break;
        case 'invoice.payment_succeeded':
            handleSubscriptionPayment(event.data.object);
            break;
        case 'customer.subscription.deleted':
            handleSubscriptionCancelled(event.data.object);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
});

// Обработчики событий Stripe
function handlePaymentSuccess(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    const vin = paymentIntent.metadata.vin;
    
    if (vin) {
        // Здесь можно добавить логику для отправки отчета
        console.log(`Sending report for VIN: ${vin}`);
    }
}

function handleSubscriptionPayment(invoice) {
    console.log('Subscription payment succeeded:', invoice.id);
    // Логика для активации подписки
}

function handleSubscriptionCancelled(subscription) {
    console.log('Subscription cancelled:', subscription.id);
    // Логика для деактивации подписки
}

// Валидация VIN
function validateVIN(vin) {
    if (!vin || vin.length !== 17) return false;
    
    // Проверка на недопустимые символы
    const invalidChars = /[IOQ]/;
    if (invalidChars.test(vin)) return false;
    
    // Проверка контрольной суммы
    return validateVINChecksum(vin);
}

function validateVINChecksum(vin) {
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    };
    
    let sum = 0;
    
    for (let i = 0; i < 17; i++) {
        let value;
        const char = vin[i];
        
        if (char >= '0' && char <= '9') {
            value = parseInt(char);
        } else if (transliteration[char]) {
            value = transliteration[char];
        } else {
            return false;
        }
        
        sum += value * weights[i];
    }
    
    const checkDigit = sum % 11;
    const expectedCheckDigit = vin[8];
    
    if (checkDigit === 10) {
        return expectedCheckDigit === 'X';
    } else {
        return expectedCheckDigit === checkDigit.toString();
    }
}

// Получение данных об автомобиле (замените на реальный API)
async function getVehicleData(vin) {
    // Симуляция задержки API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Мок данные (замените на реальный API запрос)
    const mockData = {
        vin: vin,
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        engine: '1.5L 4-Cylinder',
        transmission: 'CVT',
        accidents: 0,
        owners: 1,
        mileage: 45000,
        liens: false,
        recalls: 1,
        marketValue: 25000,
        ownershipType: 'Personal',
        regularService: true,
        warrantyWork: false,
        insuranceClaims: 0,
        serviceHistory: [
            {
                date: '2023-06-15',
                type: 'Regular Maintenance',
                description: 'Замена масла, проверка систем'
            }
        ],
        recalls: [
            {
                title: 'Отзыв по тормозной системе',
                date: '2023-03-15',
                description: 'Возможная неисправность тормозных колодок',
                status: 'pending'
            }
        ]
    };
    
    return mockData;
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the application`);
});

module.exports = app;
