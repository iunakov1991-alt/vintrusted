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
   * Get or assign A/B test variant
   */
  function getABVariant() {
    // Check if variant already exists in cookie
    let variant = getCookie('ab_variant');
    
    if (!variant) {
      // Randomly assign variant (50/50 split)
      variant = Math.random() < 0.5 ? 'light' : 'dark';
      
      // Save to cookie for 30 days
      setCookie('ab_variant', variant, 30);
      
      console.log('[AB TEST] New visitor - assigned variant:', variant);
    } else {
      console.log('[AB TEST] Returning visitor - variant:', variant);
    }
    
    return variant;
  }

  /**
   * Apply variant styles to page
   */
  function applyVariant(variant) {
    // Add variant class to body for CSS targeting
    document.body.classList.add(`variant-${variant}`);
    document.body.setAttribute('data-ab-variant', variant);
    
    console.log('[AB TEST] Applied variant class:', `variant-${variant}`);
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

