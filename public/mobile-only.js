/**
 * MOBILE-ONLY JAVASCRIPT
 * ======================
 * This file is ONLY for mobile version functionality
 * ALL code here MUST check for .mobile-device class
 * 
 * CRITICAL RULES:
 * 1. ALWAYS check if device is mobile before executing
 * 2. NEVER modify desktop-only elements
 * 3. NEVER attach events to desktop elements
 * 4. Use mobile- prefix for all IDs and classes
 * 
 * Example:
 * ✅ GOOD: if (isMobile) { ... }
 * ❌ BAD:  Direct execution without check
 */

(function() {
  'use strict';
  
  // ==================== MOBILE DEVICE CHECK ====================
  var isMobile = document.documentElement.classList.contains('mobile-device');
  
  // Exit immediately if not mobile - DO NOT execute anything
  if (!isMobile) {
    console.log('[MOBILE-ONLY] Not a mobile device, skipping mobile initialization');
    return;
  }
  
  console.log('[MOBILE-ONLY] Mobile device detected, initializing mobile-only features');
  
  // ==================== MOBILE-ONLY INITIALIZATION ====================
  
  /**
   * Initialize mobile version when DOM is ready
   */
  function initMobile() {
    console.log('[MOBILE-ONLY] Initializing mobile version');
    
    initMobileForms();
    initMobileDecoder();
    preventZoomOnInput();
    setupMobileTouchHandlers();
  }
  
  /**
   * Setup mobile form submissions
   */
  function initMobileForms() {
    // Get all mobile VIN forms
    var forms = document.querySelectorAll('.mobile-device .mobile-only .mobile-vin-form');
    
    forms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var input = form.querySelector('.mobile-vin-input');
        if (!input) return;
        
        var vin = input.value.trim().toUpperCase();
        
        // Validate VIN
        if (vin.length !== 17 || !vin.match(/^[A-HJ-NPR-Z0-9]{17}$/)) {
          alert('Please enter a valid 17-character VIN. The VIN must contain only letters (A-H, J-N, P-R, T-Z) and numbers (0-9).');
          return;
        }
        
        // Redirect to report page
        window.location.href = '/report.html?vin=' + encodeURIComponent(vin);
      });
      
      // Auto-uppercase and format VIN input
      var input = form.querySelector('.mobile-vin-input');
      if (input) {
        input.addEventListener('input', function(e) {
          this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
        });
      }
    });
    
    console.log('[MOBILE-ONLY] Mobile forms initialized:', forms.length);
  }
  
  /**
   * Setup mobile VIN decoder
   */
  function initMobileDecoder() {
    var decoderInput = document.getElementById('mobile-decoder-input');
    var bubblesContainer = document.getElementById('mobile-decoder-bubbles');
    
    if (!decoderInput || !bubblesContainer) {
      console.log('[MOBILE-ONLY] Decoder elements not found');
      return;
    }
    
    // Create bubbles for each VIN character
    var positions = [
      { label: 'Country', index: 0 },
      { label: 'Manufacturer', index: 1 },
      { label: 'Vehicle Type', index: 2 },
      { label: 'Engine', index: 3 },
      { label: 'Body Style', index: 4 },
      { label: 'Model', index: 5 },
      { label: 'Restraint', index: 6 },
      { label: 'Check Digit', index: 7 },
      { label: 'Year', index: 8 },
      { label: 'Plant', index: 9 },
      { label: 'Serial', index: 10, span: 6 }
    ];
    
    var html = '';
    positions.forEach(function(pos) {
      var span = pos.span || 1;
      html += '<div class="vin-bubble" data-index="' + pos.index + '" data-span="' + span + '">';
      html += '<div class="bubble-label">' + pos.label + '</div>';
      html += '<div class="bubble-chars">';
      for (var i = 0; i < span; i++) {
        html += '<div class="bubble-char">-</div>';
      }
      html += '</div>';
      html += '</div>';
    });
    
    bubblesContainer.innerHTML = html;
    
    // Update bubbles as user types
    decoderInput.addEventListener('input', function(e) {
      this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
      var vin = this.value;
      
      document.querySelectorAll('.mobile-decoder-wrapper .bubble-char').forEach(function(char, index) {
        char.textContent = vin[index] || '-';
        if (vin[index]) {
          char.classList.add('filled');
        } else {
          char.classList.remove('filled');
        }
      });
    });
    
    console.log('[MOBILE-ONLY] Decoder initialized');
  }
  
  /**
   * Setup mobile touch handlers
   */
  function setupMobileTouchHandlers() {
    // Only attach touch events to mobile-only elements
    var mobileButtons = document.querySelectorAll('.mobile-device .mobile-only .mobile-btn');
    
    mobileButtons.forEach(function(btn) {
      btn.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      });
      
      btn.addEventListener('touchend', function() {
        this.style.transform = 'scale(1)';
      });
    });
  }
  
  /**
   * Prevent zoom on input focus (iOS)
   */
  function preventZoomOnInput() {
    var mobileInputs = document.querySelectorAll('.mobile-device .mobile-only input, .mobile-device .mobile-only select, .mobile-device .mobile-only textarea');
    
    mobileInputs.forEach(function(input) {
      // Ensure font-size is at least 16px to prevent zoom
      var fontSize = window.getComputedStyle(input).fontSize;
      if (parseInt(fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
  }
  
  /**
   * Mobile-safe console log
   */
  function mobileLog(message) {
    if (console && console.log) {
      console.log('[MOBILE-ONLY] ' + message);
    }
  }
  
  // ==================== AUTO-INIT ON DOM READY ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }
  
  // ==================== EXPOSE PUBLIC API ====================
  window.MobileApp = {
    init: initMobile,
    log: mobileLog,
    isMobile: isMobile
  };
  
  console.log('[MOBILE-ONLY] Mobile script loaded successfully');
})();

