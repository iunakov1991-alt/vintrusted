export default async function handler(req, res) {
  try {
    // Временное решение для тестирования
    res.status(200).json({ 
      publishableKey: 'pk_test_placeholder', 
      returnUrl: 'https://vintrusted.com/payment-success' 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}