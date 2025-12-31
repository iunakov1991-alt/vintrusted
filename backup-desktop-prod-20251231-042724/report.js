const { store } = require('./_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract report ID from query parameter
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Report ID required' });
  }

  const entry = store.get(id);
  
  if (!entry) {
    return res.status(200).json({ status: 'processing' });
  }

  return res.status(200).json(entry);
};

