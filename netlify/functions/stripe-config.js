exports.handler = async (event, context) => {
  try {
    // Используем переменные окружения
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const returnUrl = process.env.RETURN_URL || 'https://vintrusted.com/payment-success';
    
    if (!publishableKey) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'STRIPE_PUBLISHABLE_KEY not configured' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ 
        publishableKey: publishableKey, 
        returnUrl: returnUrl 
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: e.message })
    };
  }
};