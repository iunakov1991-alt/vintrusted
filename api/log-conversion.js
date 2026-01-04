import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      vin,
      abVariant,
      device,
      source,
      medium,
      campaign,
      sessionId
    } = req.body;

    // Validation
    if (!vin) {
      return res.status(400).json({ error: 'VIN is required' });
    }

    // Get IP and User Agent
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Create conversion record
    const conversion = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vin,
      abVariant: abVariant || 'unknown',
      device: device || (userAgent.includes('Mobile') ? 'mobile' : 'desktop'),
      source: source || 'direct',
      medium: medium || 'none',
      campaign: campaign || 'none',
      sessionId: sessionId || 'unknown',
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };

    // Store conversion in KV
    // Key format: conversion:{id}
    await kv.set(`conversion:${conversion.id}`, conversion);

    // Add to daily index
    // Key format: conversions:daily:{YYYY-MM-DD}
    const dailyKey = `conversions:daily:${conversion.date}`;
    await kv.sadd(dailyKey, conversion.id);
    await kv.expire(dailyKey, 90 * 24 * 60 * 60); // Expire after 90 days

    // Add to AB variant index
    // Key format: conversions:variant:{variant}:{YYYY-MM-DD}
    const variantKey = `conversions:variant:${conversion.abVariant}:${conversion.date}`;
    await kv.sadd(variantKey, conversion.id);
    await kv.expire(variantKey, 90 * 24 * 60 * 60);

    // Add to device index
    // Key format: conversions:device:{device}:{YYYY-MM-DD}
    const deviceKey = `conversions:device:${conversion.device}:${conversion.date}`;
    await kv.sadd(deviceKey, conversion.id);
    await kv.expire(deviceKey, 90 * 24 * 60 * 60);

    // Add to source index
    // Key format: conversions:source:{source}:{YYYY-MM-DD}
    const sourceKey = `conversions:source:${conversion.source}:${conversion.date}`;
    await kv.sadd(sourceKey, conversion.id);
    await kv.expire(sourceKey, 90 * 24 * 60 * 60);

    console.log('✅ Conversion logged:', conversion.id);

    return res.status(200).json({
      success: true,
      conversionId: conversion.id
    });

  } catch (error) {
    console.error('❌ Error logging conversion:', error);
    return res.status(500).json({
      error: 'Failed to log conversion',
      message: error.message
    });
  }
}

