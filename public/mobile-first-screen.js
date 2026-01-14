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

    let vinFoundState = false;
    let savedVin = '';

    // Function to update VIN input and progress
    function updateVinInput(value) {
      const cleanValue = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').substring(0, 17);
      input.value = cleanValue;
      
      // Update visual progress (0-17 characters)
      const progress = (cleanValue.length / 17) * 100;
      input.style.background = `linear-gradient(to right, #27ae60 ${progress}%, #fff ${progress}%)`;
      
      // Reset state if user deleted characters
      if (vinFoundState && cleanValue.length < 17) {
        vinFoundState = false;
        input.style.setProperty('color', '#1a1a1a', 'important');
        input.style.setProperty('font-weight', '600', 'important');
      }
      
      // Auto-submit when 17 characters are entered
      if (cleanValue.length === 17 && !vinFoundState) {
        console.log('[MOBILE FIRST SCREEN] Auto-submitting VIN:', cleanValue);
        
        vinFoundState = true;
        savedVin = cleanValue;
        
        // Show "VIN FOUND ✓" message
        input.value = 'VIN FOUND ✓';
        input.style.setProperty('color', '#fff', 'important');
        input.style.setProperty('font-weight', '700', 'important');
        
        setTimeout(() => {
          window.location.href = '/report.html?vin=' + encodeURIComponent(savedVin);
        }, 800);
      }
    }

    // Block new input when VIN FOUND is shown (allow only deletion)
    input.addEventListener('keydown', function(e) {
      if (vinFoundState) {
        // Allow: backspace, delete, arrow keys, tab
        if (e.key === 'Backspace' || e.key === 'Delete' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
            e.key === 'Tab') {
          // Clear the "VIN FOUND ✓" message and restore VIN for editing
          if (e.key === 'Backspace' || e.key === 'Delete') {
            vinFoundState = false;
            input.value = savedVin;
            input.style.setProperty('color', '#1a1a1a', 'important');
            input.style.setProperty('font-weight', '600', 'important');
            // Let the backspace/delete work normally
          }
          return;
        }
        // Block all other keys when VIN FOUND is shown
        e.preventDefault();
      }
    });

    // Format VIN input and update progress bar
    input.addEventListener('input', function(e) {
      if (!vinFoundState) {
        updateVinInput(this.value);
      }
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
      window.location.href = '/report.html?vin=' + encodeURIComponent(vin);
    });

    // Handle Enter key in input
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        button.click();
      }
    });
  }
})();
