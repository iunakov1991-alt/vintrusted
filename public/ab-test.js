/**
 * A/B Test System for Hero Section
 * Splits traffic 50/50 between light and dark versions
 * Tracks variant in cookie and sends to GTM/GA4
 */

(function() {
  'use strict';

  // Initialize dataLayer if not exists
  window.dataLayer = window.dataLayer || [];

  /**
   * Get cookie value by name
   */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Set cookie with expiration
   */
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * Get A/B test variant (already set by inline script)
   */
  function getABVariant() {
    // Variant already determined by inline script in <head>
    let variant = window._abVariant || getCookie('ab_variant');
    
    if (!variant) {
      console.error('[AB TEST] ERROR: No variant found! Inline script may have failed.');
      variant = 'light'; // Fallback
    }
    
    console.log('[AB TEST] Variant:', variant);
    return variant;
  }

  /**
   * Apply variant styles to page (already done by inline script)
   */
  function applyVariant(variant) {
    // Variant class already applied to <html> by inline script
    // This is just for logging and fallback
    if (!document.documentElement.classList.contains(`variant-${variant}`)) {
      document.documentElement.classList.add(`variant-${variant}`);
      document.body.classList.add(`variant-${variant}`);
      console.warn('[AB TEST] Fallback: Applied variant class to body');
    } else {
      console.log('[AB TEST] Variant class already applied:', `variant-${variant}`);
    }
  }

  /**
   * Send variant to GTM/GA4
   */
  function trackVariant(variant) {
    // Push to dataLayer for GTM
    window.dataLayer.push({
      'event': 'ab_test_view',
      'ab_variant': variant,
      'timestamp': new Date().toISOString()
    });
    
    console.log('[AB TEST] Sent to dataLayer:', {
      event: 'ab_test_view',
      ab_variant: variant
    });
  }

  /**
   * Track form click with variant
   */
  function trackFormClick() {
    const variant = getCookie('ab_variant');
    
    window.dataLayer.push({
      'event': 'ab_test_click',
      'ab_variant': variant,
      'element': 'hero_form_submit'
    });
    
    console.log('[AB TEST] Form click tracked:', variant);
  }

  /**
   * Initialize A/B test
   */
  function initABTest() {
    // Get or assign variant
    const variant = getABVariant();
    
    // Apply variant styles
    applyVariant(variant);
    
    // Track variant view
    trackVariant(variant);
    
    // Track form clicks
    setTimeout(() => {
      const formButton = document.querySelector('.search-btn, .hero .search-btn');
      if (formButton) {
        formButton.addEventListener('click', trackFormClick);
        console.log('[AB TEST] Form click tracking installed');
      }
    }, 500);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initABTest);
  } else {
    initABTest();
  }

  // Expose variant getter for other scripts
  window.getABVariant = getABVariant;

})();

