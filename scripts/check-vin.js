import Stripe from 'stripe';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const vin = '3KPFU4DE7SE041733';

console.log('🔍 Searching for VIN:', vin);

async function checkVin() {
  try {
    // Search in customers metadata
    const customers = await stripe.customers.search({
      query: `metadata['vin']:'${vin}'`,
      limit: 10
    });
    
    if (customers.data.length > 0) {
      console.log('✅ Found', customers.data.length, 'customer(s) with this VIN:');
      customers.data.forEach(c => {
        console.log('  - Customer:', c.id);
        console.log('    Email:', c.email || 'N/A');
        console.log('    Created:', new Date(c.created * 1000).toISOString());
      });
    } else {
      console.log('❌ No customers found with this VIN in Stripe');
      console.log('');
      console.log('💡 Это значит:');
      console.log('   - Никто не покупал отчет по этому VIN');
      console.log('   - Или VIN был введен в другом формате');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVin();
