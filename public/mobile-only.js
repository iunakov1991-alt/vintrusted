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
    
    // Add any mobile-specific initialization here
    // Example: setupMobileNavigation();
    // Example: initMobileForm();
    // Example: setupMobileTouchHandlers();
  }
  
  /**
   * Setup mobile form submission
   */
  function initMobileForm() {
    var mobileForm = document.querySelector('.mobile-device .mobile-only form');
    if (!mobileForm) {
      console.log('[MOBILE-ONLY] Mobile form not found');
      return;
    }
    
    mobileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('[MOBILE-ONLY] Mobile form submitted');
      // Handle mobile form submission
    });
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

