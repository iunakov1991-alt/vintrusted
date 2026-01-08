/**
 * Mobile Hero V3 Form Handler - New Design
 */

(function() {
  'use strict';

  function initMobileHeroV3Form() {
    const form = document.getElementById('mobile-hero-vin-form');
    const input = document.getElementById('mobile-hero-vin-input');
    const button = document.getElementById('mobile-hero-vin-button');
    
    if (!form || !input || !button) {
      console.log('[MOBILE-HERO-V3] Form elements not found');
      return;
    }
    
    // VIN validation regex (excludes I, O, Q)
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    
    // Auto-uppercase and filter invalid characters
    input.addEventListener('input', function() {
      let value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
      this.value = value;
      
      // Update button state
      updateButtonState(value.length === 17);
    });
    
    // Update button state on load
    updateButtonState(input.value.length === 17);
    
    function updateButtonState(isValid) {
      button.disabled = !isValid;
    }
    
    // Form submission
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const vin = input.value.trim();
      
      if (!vin) {
        alert('Please enter VIN');
        input.focus();
        return;
      }
      
      if (vin.length !== 17) {
        alert('VIN must be exactly 17 characters');
        input.focus();
        return;
      }
      
      if (!vinRegex.test(vin)) {
        alert('Invalid VIN format. VIN cannot contain I, O, or Q.');
        input.focus();
        return;
      }
      
      console.log('[MOBILE-HERO-V3] VIN submitted:', vin);
      
      // Show loading state
      const originalText = button.textContent;
      button.textContent = 'CHECKING...';
      button.disabled = true;
      
      // Redirect to report page (or handle API call)
      setTimeout(() => {
        window.location.href = `/report.html?vin=${encodeURIComponent(vin)}`;
      }, 500);
    });
    
    // Allow Enter key to submit
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && input.value.length === 17) {
        form.dispatchEvent(new Event('submit'));
      }
    });
    
    console.log('[MOBILE-HERO-V3] Form initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileHeroV3Form);
  } else {
    initMobileHeroV3Form();
  }
  
})();

