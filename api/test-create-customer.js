import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scenario } = req.method === 'GET' ? req.query : req.body;
    
    // Сценарий 1: Customer с активной подпиской и квотой
    if (scenario === 'active_with_quota') {
      const email = 'active@test.com';
      const customerData = {
        customer_id: 'cus_test_active_001',
        email: email,
        created_at: new Date().toISOString(),
        subscription: {
          subscription_schedule_id: 'sub_sched_test_001',
          subscription_id: 'sub_test_001',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 2,
          used: 0,
          remaining: 2
        },
        reports: []
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      return res.json({ success: true, scenario: 'active_with_quota', email });
    }
    
    // Сценарий 2: Customer с активной подпиской, 1 отчет куплен, 1 квота осталась
    if (scenario === 'active_one_report') {
      const email = 'onereport@test.com'; // lowercase!
      const customerData = {
        customer_id: 'cus_test_active_002',
        email: email,
        created_at: new Date().toISOString(),
        subscription: {
          subscription_schedule_id: 'sub_sched_test_002',
          subscription_id: 'sub_test_002',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 2,
          used: 1,
          remaining: 1
        },
        reports: [{
          vin: '1HGBH41JXMN109186',
          purchased_at: new Date().toISOString(),
          vehicle_name: '1991 HONDA ACCORD',
          period: 'trial'
        }]
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      
      // Кешируем отчет
      await kv.set('report:cache:1HGBH41JXMN109186', {
        vin: '1HGBH41JXMN109186',
        cached_at: new Date().toISOString(),
        report_data: { sample: 'data' },
        vehicle: { year: 1991, make: 'HONDA', model: 'ACCORD' }
      }, { ex: 60 * 60 * 24 * 90 });
      
      return res.json({ success: true, scenario: 'active_one_report', email });
    }
    
    // Сценарий 3: Customer с израсходованной квотой (2/2 использовано)
    if (scenario === 'quota_exhausted') {
      const email = 'noquota@test.com';
      const customerData = {
        customer_id: 'cus_test_active_003',
        email: email,
        created_at: new Date().toISOString(),
        subscription: {
          subscription_schedule_id: 'sub_sched_test_003',
          subscription_id: 'sub_test_003',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 2,
          used: 2,
          remaining: 0
        },
        reports: [
          {
            vin: '1HGBH41JXMN109186',
            purchased_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            vehicle_name: '1991 HONDA ACCORD',
            period: 'subscription'
          },
          {
            vin: '5YJSA1E14HF123456',
            purchased_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            vehicle_name: '2017 TESLA MODEL S',
            period: 'subscription'
          }
        ]
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      return res.json({ success: true, scenario: 'quota_exhausted', email });
    }
    
    // Сценарий 4: Customer с отмененной подпиской
    if (scenario === 'canceled_subscription') {
      const email = 'canceled@test.com';
      const customerData = {
        customer_id: 'cus_test_canceled_001',
        email: email,
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        subscription: {
          subscription_schedule_id: 'sub_sched_test_004',
          subscription_id: 'sub_test_004',
          status: 'canceled',
          start_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          canceled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 0,
          used: 1,
          remaining: 0
        },
        reports: [{
          vin: 'WBADT43452G123456',
          purchased_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          vehicle_name: '2002 BMW 330CI',
          period: 'trial'
        }]
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      return res.json({ success: true, scenario: 'canceled_subscription', email });
    }
    
    // Очистка всех тестовых данных
    if (scenario === 'cleanup') {
      await kv.del('customer:email:active@test.com');
      await kv.del('customer:email:onereport@test.com');
      await kv.del('customer:email:noquota@test.com');
      await kv.del('customer:email:canceled@test.com');
      await kv.del('report:cache:1HGBH41JXMN109186');
      return res.json({ success: true, scenario: 'cleanup' });
    }
    
    // Сценарий 6: Customer с dispute (chargeback)
    if (scenario === 'disputed') {
      const email = 'disputed@test.com';
      const customerData = {
        customer_id: 'cus_test_disputed_001',
        email: email,
        created_at: new Date().toISOString(),
        disputed: true,
        dispute_id: 'dp_test_001',
        dispute_created_at: new Date().toISOString(),
        subscription: {
          subscription_schedule_id: null,
          subscription_id: 'sub_test_005',
          status: 'disputed',
          start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 0,
          used: 1,
          remaining: 0
        },
        reports: [{
          vin: 'JM1BL1S55A1234567',
          purchased_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          vehicle_name: '2010 MAZDA MAZDA3',
          period: 'trial'
        }]
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      return res.json({ success: true, scenario: 'disputed', email });
    }

    // Сценарий 7: Customer в trialing периоде (первые 3 дня после $2.99)
    if (scenario === 'trialing') {
      const email = 'trialing@test.com';
      const customerData = {
        customer_id: 'cus_test_trialing_001',
        email: email,
        created_at: new Date().toISOString(),
        subscription: {
          subscription_schedule_id: 'sub_sched_test_005',
          subscription_id: null,
          status: 'trialing',
          start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Start in 3 days
          end_date: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toISOString()
        },
        quota: {
          total: 2,
          used: 1,
          remaining: 1
        },
        reports: [{
          vin: '5UXWX7C5XBA123456',
          purchased_at: new Date().toISOString(),
          vehicle_name: '2011 BMW X3',
          period: 'trial'
        }]
      };
      
      await kv.set(`customer:email:${email}`, customerData);
      
      // Кешируем отчет
      await kv.set('report:cache:5UXWX7C5XBA123456', {
        vin: '5UXWX7C5XBA123456',
        cached_at: new Date().toISOString(),
        report_data: { sample: 'data' },
        vehicle: { year: 2011, make: 'BMW', model: 'X3' }
      }, { ex: 60 * 60 * 24 * 90 });
      
      return res.json({ success: true, scenario: 'trialing', email });
    }

    return res.status(400).json({
      error: 'Unknown scenario',
      available: ['active_with_quota', 'active_one_report', 'quota_exhausted', 'canceled_subscription', 'disputed', 'trialing', 'cleanup']
    });

  } catch (error) {
    console.error('[TEST-CREATE-CUSTOMER] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
