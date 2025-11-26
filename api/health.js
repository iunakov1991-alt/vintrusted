module.exports = async (req, res) => {
  const vinauditStatus = process.env.VINAUDIT_API_KEY?.trim() ? 'live' : 'mock';
  
  return res.status(200).json({
    vinaudit: vinauditStatus,
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
    app_url: process.env.APP_URL || 'not set'
  });
};

