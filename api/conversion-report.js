import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, variant, device, source } = req.query;

    // Default to today if no dates provided
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;

    // Generate date range
    const dates = [];
    let currentDate = new Date(start);
    const finalDate = new Date(end);

    while (currentDate <= finalDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Collect all conversion IDs for the date range
    let allConversionIds = [];

    for (const date of dates) {
      const dailyKey = `conversions:daily:${date}`;
      const ids = await kv.smembers(dailyKey);
      if (ids && ids.length > 0) {
        allConversionIds = [...allConversionIds, ...ids];
      }
    }

    // Fetch all conversions
    const conversions = [];
    for (const id of allConversionIds) {
      const conv = await kv.get(`conversion:${id}`);
      if (conv) {
        conversions.push(conv);
      }
    }

    // Apply filters
    let filteredConversions = conversions;

    if (variant) {
      filteredConversions = filteredConversions.filter(c => c.abVariant === variant);
    }

    if (device) {
      filteredConversions = filteredConversions.filter(c => c.device === device);
    }

    if (source) {
      filteredConversions = filteredConversions.filter(c => c.source === source);
    }

    // Calculate statistics
    const stats = {
      total: filteredConversions.length,
      byVariant: {},
      byDevice: {},
      bySource: {},
      byCampaign: {},
      byDate: {}
    };

    filteredConversions.forEach(conv => {
      // By variant
      stats.byVariant[conv.abVariant] = (stats.byVariant[conv.abVariant] || 0) + 1;

      // By device
      stats.byDevice[conv.device] = (stats.byDevice[conv.device] || 0) + 1;

      // By source
      stats.bySource[conv.source] = (stats.bySource[conv.source] || 0) + 1;

      // By campaign
      if (conv.campaign && conv.campaign !== 'none') {
        stats.byCampaign[conv.campaign] = (stats.byCampaign[conv.campaign] || 0) + 1;
      }

      // By date
      stats.byDate[conv.date] = (stats.byDate[conv.date] || 0) + 1;
    });

    // Sort conversions by timestamp (newest first)
    filteredConversions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      dateRange: {
        start,
        end
      },
      filters: {
        variant: variant || null,
        device: device || null,
        source: source || null
      },
      stats,
      conversions: filteredConversions
    });

  } catch (error) {
    console.error('❌ Error generating conversion report:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

