import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[TEST-KV] Testing KV connection...');
    
    // Simple test: set and get
    const testKey = 'test:simple';
    const testValue = { message: 'Hello from KV', timestamp: Date.now() };
    
    console.log('[TEST-KV] Setting test key...');
    await kv.set(testKey, testValue);
    
    console.log('[TEST-KV] Getting test key...');
    const result = await kv.get(testKey);
    
    console.log('[TEST-KV] ✅ KV works!', result);
    
    return res.status(200).json({
      success: true,
      kv_works: true,
      test_data: result
    });

  } catch (error) {
    console.error('[TEST-KV] ❌ Error:', error.message);
    console.error('[TEST-KV] Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
  }
}
