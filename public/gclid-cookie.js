/**
 * GCLID Cookie Saver
 * 
 * Сохраняет gclid из URL в cookie при клике из Google Ads.
 * Cookie живёт 90 дней (как рекомендует Google).
 * 
 * Это критически важно для серверного отслеживания конверсий.
 */

(function() {
  try {
    // Check if gclid exists in URL
    var params = new URLSearchParams(window.location.search);
    var gclid = params.get('gclid');
    
    if (!gclid) {
      console.log('[GCLID] No gclid in URL');
      return;
    }
    
    // Save to cookie for 90 days (Google's recommendation)
    var maxAge = 90 * 24 * 60 * 60; // 90 days in seconds
    var cookieValue = 'gclid=' + encodeURIComponent(gclid) + 
                     '; Max-Age=' + maxAge + 
                     '; Path=/' + 
                     '; SameSite=Lax' +
                     '; Secure';
    
    document.cookie = cookieValue;
    
    console.log('[GCLID] ✅ Saved to cookie:', gclid.substring(0, 10) + '...');
  } catch (e) {
    console.error('[GCLID] ❌ Error:', e);
  }
})();

