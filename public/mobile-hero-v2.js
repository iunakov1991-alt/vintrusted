/**
 * Mobile Hero V2 Form Handler
 */

(function() {
  'use strict';

  function initMobileHeroV2Form() {
    const form = document.getElementById('mobile-vin-form-v2');
    const input = document.getElementById('mobile-vin-input-v2');
    
    if (!form || !input) {
      console.log('[MOBILE-HERO-V2] Form not found');
      return;
    }
    
    // Auto-uppercase input
    input.addEventListener('input', function() {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const vin = input.value.trim();
      
      if (!vin) {
        alert('Please enter VIN');
        return;
      }
      
      if (vin.length !== 17) {
        alert('VIN must be exactly 17 characters');
        return;
      }
      
      console.log('[MOBILE-HERO-V2] VIN submitted:', vin);
      
      // Redirect to report page
      window.location.href = `/report.html?vin=${encodeURIComponent(vin)}`;
    });
    
    console.log('[MOBILE-HERO-V2] Form initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileHeroV2Form);
  } else {
    initMobileHeroV2Form();
  }
  
})();

