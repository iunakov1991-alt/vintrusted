/**
 * UTM Tracker
 * Saves UTM parameters from URL to sessionStorage for later use
 */

(function() {
  'use strict';

  /**
   * Save UTM parameters from URL to sessionStorage
   */
  function saveUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const utmParams = {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };
    
    // Save each parameter if it exists
    let saved = false;
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        sessionStorage.setItem(key, value);
        saved = true;
      }
    });
    
    if (saved) {
      console.log('[UTM TRACKER] ✅ UTM parameters saved:', utmParams);
    }
  }
  
  // Save UTM parameters on page load
  saveUTMParameters();
  
})();

