// Mobile First Screen - Form Handler
(function() {
  'use strict';

  console.log('[MOBILE FIRST SCREEN] Initializing...');

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const input = document.getElementById('mobileVinInput');
    const button = document.getElementById('mobileVinButton');

    if (!input || !button) {
      console.log('[MOBILE FIRST SCREEN] Form elements not found');
      return;
    }

    console.log('[MOBILE FIRST SCREEN] Form found, attaching handlers');

    // Format VIN input
    input.addEventListener('input', function(e) {
      this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    });

    // Handle button click
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const vin = input.value.trim();
      
      if (vin.length !== 17) {
        alert('Please enter a valid 17-character VIN');
        return;
      }

      console.log('[MOBILE FIRST SCREEN] Submitting VIN:', vin);
      
      // Redirect to results page
      window.location.href = '/?vin=' + encodeURIComponent(vin);
    });

    // Handle Enter key in input
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        button.click();
      }
    });
  }
})();
