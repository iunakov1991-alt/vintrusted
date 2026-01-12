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

    // Function to update VIN input and progress
    function updateVinInput(value) {
      const cleanValue = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').substring(0, 17);
      input.value = cleanValue;
      
      // Update visual progress (0-17 characters)
      const progress = (cleanValue.length / 17) * 100;
      input.style.background = `linear-gradient(to right, #27ae60 ${progress}%, #fff ${progress}%)`;
      
      // Auto-submit when 17 characters are entered
      if (cleanValue.length === 17) {
        console.log('[MOBILE FIRST SCREEN] Auto-submitting VIN:', cleanValue);
        
        // Show "VIN FOUND ✓" message
        input.value = 'VIN FOUND ✓';
        input.style.color = '#27ae60';
        input.style.fontWeight = '700';
        
        setTimeout(() => {
          window.location.href = '/?vin=' + encodeURIComponent(cleanValue);
        }, 800);
      }
    }

    // Format VIN input and update progress bar
    input.addEventListener('input', function(e) {
      updateVinInput(this.value);
    });

    // Handle paste event
    input.addEventListener('paste', function(e) {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      updateVinInput(pastedText);
    });

    // Try to auto-fill from clipboard if available
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(text => {
          const cleanText = text.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
          if (cleanText.length === 17 && input.value === '') {
            console.log('[MOBILE FIRST SCREEN] Auto-filling VIN from clipboard');
            updateVinInput(cleanText);
          }
        })
        .catch(err => {
          // Clipboard access denied or not available, that's OK
          console.log('[MOBILE FIRST SCREEN] Clipboard access not available');
        });
    }

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
