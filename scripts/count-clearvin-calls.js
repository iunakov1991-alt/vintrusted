import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Date when live ClearVin API was added
const CLEARVIN_START_DATE = new Date('2025-12-22T08:39:16-08:00');

async function countClearVinCalls() {
  console.log('🔍 Counting ClearVin API calls associated with Stripe payments...');
  console.log('📅 Start date:', CLEARVIN_START_DATE.toISOString());
  console.log('');
  
  let successfulPayments = 0;
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = {
      limit: 100,
      created: {
        gte: Math.floor(CLEARVIN_START_DATE.getTime() / 1000)
      }
    };
    
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const paymentIntents = await stripe.paymentIntents.list(params);

    for (const pi of paymentIntents.data) {
      // Count only succeeded $2.99 payments (initial payment)
      if (pi.status === 'succeeded' && pi.amount === 100) {
        successfulPayments++;
        const date = new Date(pi.created * 1000).toISOString();
        console.log(`✅ Payment ${successfulPayments}: ${pi.id} - ${date}`);
        
        // Log VIN if available in metadata
        if (pi.metadata && pi.metadata.vin) {
          console.log(`   VIN: ${pi.metadata.vin}`);
        }
      }
      
      startingAfter = pi.id;
    }

    hasMore = paymentIntents.has_more;
  }

  console.log('');
  console.log('============================================================');
  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log('============================================================');
  console.log(`✅ Всего успешных $1 платежей: ${successfulPayments}`);
  console.log(`📄 Предполагаемых вызовов ClearVin API: ${successfulPayments}`);
  console.log('');
  console.log('⚠️  ЗАМЕТКА: Каждый успешный платёж триггерит загрузку');
  console.log('   ClearVin отчёта на странице success.html');
  console.log('============================================================');
}

countClearVinCalls().catch(console.error);
