/**
 * MOBILE.JS - VinTrusted Mobile-Specific Functionality
 * 
 * Features:
 * - VIN input auto-uppercase and validation
 * - Clipboard paste support for VIN
 * - Sticky CTA bar behavior
 * - Safe area handling for iOS
 * - Form auto-scroll
 * - Mobile-specific enhancements
 */

(function() {
  'use strict';

  // =============================================================================
  // CONSTANTS & CONFIG
  // =============================================================================
  
  const MOBILE_BREAKPOINT = 1024;
  const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
  const VIN_LENGTH = 17;
  
  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // =============================================================================
  // SAFE AREA HANDLING (iOS Dynamic Island & Notches)
  // =============================================================================
  
  function updateSafeAreaVars() {
    if (!isMobile()) return;

    const root = document.documentElement;
    const safeTop = getComputedStyle(root).getPropertyValue('--safe-top') || '0px';
    const safeBottom = getComputedStyle(root).getPropertyValue('--safe-bottom') || '0px';
    
    console.log('[Mobile] Safe area insets:', { top: safeTop, bottom: safeBottom });
  }

  // =============================================================================
  // VIN INPUT HANDLING
  // =============================================================================
  
  function initVinInputFormatting() {
    if (!isMobile()) return;

    const vinInputs = document.querySelectorAll('[data-vin-input], .vin-input, .code-input-v17');
    
    vinInputs.forEach(input => {
      // Auto-uppercase
      input.addEventListener('input', function(e) {
        const cursorPos = e.target.selectionStart;
        const oldValue = e.target.value;
        const newValue = oldValue.toUpperCase().replace(/\s+/g, '').slice(0, VIN_LENGTH);
        
        if (oldValue !== newValue) {
          e.target.value = newValue;
          // Restore cursor position
          e.target.setSelectionRange(cursorPos, cursorPos);
        }

        // Validate and color
        validateVinInput(e.target);
      });

      // Prevent spaces
      input.addEventListener('keydown', function(e) {
        if (e.key === ' ') {
          e.preventDefault();
        }
      });

      // Handle paste
      input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = pastedText.toUpperCase().replace(/\s+/g, '').slice(0, VIN_LENGTH);
        e.target.value = cleaned;
        validateVinInput(e.target);
        
        console.log('[Mobile] VIN pasted:', cleaned.length, 'characters');
      });

      console.log('[Mobile] VIN input initialized:', input);
    });
  }

  function validateVinInput(input) {
    const value = input.value;
    
    if (value.length === 0) {
      input.classList.remove('valid', 'invalid');
      input.style.color = '';
      return;
    }

    if (value.length === VIN_LENGTH) {
      if (VIN_PATTERN.test(value)) {
        input.classList.add('valid');
        input.classList.remove('invalid');
        input.style.color = '#51cf66';
        console.log('[Mobile] VIN valid:', value);
      } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
        input.style.color = '#ff6b6b';
        console.log('[Mobile] VIN invalid:', value);
      }
    } else {
      input.classList.remove('valid', 'invalid');
      input.style.color = '#ffffff';
    }
  }

  // =============================================================================
  // CLIPBOARD AUTO-PASTE VIN
  // =============================================================================
  
  async function tryAutoFillVinFromClipboard() {
    if (!isMobile()) return;
    
    // Only try if clipboard API is available and we have permission
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      console.log('[Mobile] Clipboard API not available');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.toUpperCase().replace(/\s+/g, '');
      
      // Check if it looks like a VIN (11-17 alphanumeric characters)
      if (/^[A-HJ-NPR-Z0-9]{11,17}$/.test(cleaned)) {
        const vinInput = document.querySelector('[data-vin-input], .vin-input, .code-input-v17');
        
        if (vinInput && !vinInput.value) {
          vinInput.value = cleaned.slice(0, VIN_LENGTH);
          validateVinInput(vinInput);
          console.log('[Mobile] Auto-filled VIN from clipboard:', cleaned);
          
          // Show a subtle notification
          showNotification('VIN pasted from clipboard', 'success');
        }
      }
    } catch (err) {
      // User denied clipboard access or other error - silently ignore
      console.log('[Mobile] Clipboard read denied or failed');
    }
  }

  // =============================================================================
  // PLATE INPUT HANDLING
  // =============================================================================
  
  function initPlateInputFormatting() {
    if (!isMobile()) return;

    const plateInputs = document.querySelectorAll('.plate-input');
    
    plateInputs.forEach(input => {
      input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });

      console.log('[Mobile] Plate input initialized:', input);
    });
  }

  // =============================================================================
  // STICKY CTA BAR
  // =============================================================================
  
  function initStickyCTABar() {
    if (!isMobile()) return;

    // Create sticky CTA bar if it doesn't exist
    let ctaBar = document.querySelector('.m-cta-bar, [data-sticky-cta]');
    
    if (!ctaBar) {
      ctaBar = createStickyCTABar();
    }

    if (!ctaBar) return;

    const formContainer = document.querySelector('.search-form-container, [data-scroll-target]');
    
    if (!formContainer) return;

    const handleScroll = debounce(() => {
      const formRect = formContainer.getBoundingClientRect();
      const isFormVisible = formRect.top < window.innerHeight && formRect.bottom > 0;
      
      if (!isFormVisible) {
        ctaBar.classList.add('visible');
      } else {
        ctaBar.classList.remove('visible');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();
    
    console.log('[Mobile] Sticky CTA bar initialized');
  }

  function createStickyCTABar() {
    const bar = document.createElement('div');
    bar.className = 'm-cta-bar';
    bar.setAttribute('data-sticky-cta', 'true');
    
    const button = document.createElement('button');
    button.className = 'm-cta-btn';
    button.textContent = 'Get Your VIN Report - $3';
    button.onclick = () => {
      const formContainer = document.querySelector('.search-form-container');
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus on VIN input
        setTimeout(() => {
          const vinInput = document.querySelector('[data-vin-input], .vin-input, .code-input-v17');
          if (vinInput) vinInput.focus();
        }, 500);
      }
    };
    
    bar.appendChild(button);
    document.body.appendChild(bar);
    
    console.log('[Mobile] Created sticky CTA bar');
    return bar;
  }

  // =============================================================================
  // AUTO-SCROLL TO RESULTS/FORM
  // =============================================================================
  
  function initAutoScrollBehavior() {
    if (!isMobile()) return;

    const submitButtons = document.querySelectorAll('[data-vin-submit], .search-btn');
    
    submitButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        // After form submission, scroll to results or pricing
        setTimeout(() => {
          const resultsSection = document.querySelector('[data-results], .results-section, .pricing-section');
          if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('[Mobile] Auto-scrolled to results');
          }
        }, 300);
      });
    });
  }

  // =============================================================================
  // FORM MODE SWITCHING (VIN / PLATE)
  // =============================================================================
  
  function initMobileFormSwitching() {
    if (!isMobile()) return;

    const vinBtn = document.querySelector('[data-mode="vin"], .m-tab-btn[data-mode="vin"]');
    const plateBtn = document.querySelector('[data-mode="plate"], .m-tab-btn[data-mode="plate"]');
    const vinMode = document.getElementById('vin-mode');
    const plateMode = document.getElementById('plate-mode');

    if (!vinBtn || !plateBtn || !vinMode || !plateMode) {
      console.log('[Mobile] Form switching elements not found');
      return;
    }

    function clearAllFields() {
      const vinInput = document.querySelector('.vin-input, [data-vin-input]');
      const plateInput = document.querySelector('.plate-input');
      const stateSelect = document.querySelector('.state-select');
      
      if (vinInput) vinInput.value = '';
      if (plateInput) plateInput.value = '';
      if (stateSelect) stateSelect.value = '';
    }

    vinBtn.addEventListener('click', () => {
      clearAllFields();
      vinBtn.classList.add('active');
      plateBtn.classList.remove('active');
      vinMode.classList.add('active');
      plateMode.classList.remove('active');
      
      const vinInput = document.querySelector('.vin-input, [data-vin-input]');
      if (vinInput) {
        setTimeout(() => vinInput.focus(), 100);
      }
      
      console.log('[Mobile] Switched to VIN mode');
    });

    plateBtn.addEventListener('click', () => {
      clearAllFields();
      plateBtn.classList.add('active');
      vinBtn.classList.remove('active');
      plateMode.classList.add('active');
      vinMode.classList.remove('active');
      
      const plateInput = document.querySelector('.plate-input');
      if (plateInput) {
        setTimeout(() => plateInput.focus(), 100);
      }
      
      console.log('[Mobile] Switched to Plate mode');
    });

    console.log('[Mobile] Form switching initialized');
  }

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================
  
  function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.m-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `m-notification m-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: calc(80px + var(--safe-top, 0px));
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      animation: slideInDown 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutUp 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // =============================================================================
  // ULTRA AGGRESSIVE: DISABLE ALL SELECTION/CONTEXT MENUS
  // =============================================================================
  
  function disableContextMenu() {
    if (!isMobile()) return;

    // Nuclear option: disable on ALL interactive elements
    const elements = document.querySelectorAll('button, .mode-btn, .search-btn, input, select, .vin-input, .plate-input, .state-select');
    
    elements.forEach(el => {
      // Block ALL selection-related events
      el.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { passive: false, capture: true });
      
      el.addEventListener('selectstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { passive: false, capture: true });
      
      el.addEventListener('select', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false });
      
      el.addEventListener('copy', function(e) {
        // Allow copy but prevent menu
        e.stopPropagation();
      }, { passive: false });
      
      // Block long press completely
      let longPressTimer;
      el.addEventListener('touchstart', function(e) {
        longPressTimer = setTimeout(() => {
          // Cancel after 400ms
          e.preventDefault();
          e.stopPropagation();
        }, 400);
      }, { passive: false });
      
      el.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
      }, { passive: true });
      
      el.addEventListener('touchmove', function() {
        clearTimeout(longPressTimer);
      }, { passive: true });
      
      el.addEventListener('touchcancel', function() {
        clearTimeout(longPressTimer);
      }, { passive: true });
    });

    // Global nuclear blocker
    ['contextmenu', 'selectstart', 'select'].forEach(eventType => {
      document.addEventListener(eventType, function(e) {
        const target = e.target;
        if (target.matches('button, .mode-btn, input, select, .vin-input, .plate-input, .state-select')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, { passive: false, capture: true });
    });

    console.log('[Mobile] ULTRA AGGRESSIVE context menu blocking enabled on', elements.length, 'elements');
  }

  // =============================================================================
  // TOUCH IMPROVEMENTS
  // =============================================================================
  
  function initTouchImprovements() {
    if (!isMobile()) return;

    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button, .btn, .m-tab-btn, .mode-btn');
    
    buttons.forEach(button => {
      button.style.touchAction = 'manipulation';
    });

    // Add active state feedback for touch
    document.addEventListener('touchstart', function(e) {
      if (e.target.matches('button, .btn, a, .m-tab-btn, .mode-btn')) {
        e.target.style.opacity = '0.7';
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (e.target.matches('button, .btn, a, .m-tab-btn, .mode-btn')) {
        setTimeout(() => {
          e.target.style.opacity = '';
        }, 100);
      }
    }, { passive: true });

    console.log('[Mobile] Touch improvements applied');
  }

  // =============================================================================
  // VIEWPORT HEIGHT FIX (for mobile browsers)
  // =============================================================================
  
  function updateViewportHeight() {
    if (!isMobile()) return;

    // Fix for mobile viewport height (address bar issue)
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // =============================================================================
  // ORIENTATION CHANGE HANDLER
  // =============================================================================
  
  function handleOrientationChange() {
    if (!isMobile()) return;

    updateViewportHeight();
    updateSafeAreaVars();
    
    console.log('[Mobile] Orientation changed:', 
      screen.orientation ? screen.orientation.type : 'unknown');
  }

  // =============================================================================
  // SWITCH MODE FUNCTION (for mobile buttons)
  // =============================================================================
  
  function switchMode(mode) {
    // Map v17 back to vin for compatibility
    const actualMode = mode === 'v17' ? 'vin' : mode;
    
    // Get mode elements
    const vinMode = document.getElementById('vin-mode');
    const plateMode = document.getElementById('plate-mode');
    const buttons = document.querySelectorAll('.mode-btn');
    
    if (!vinMode || !plateMode) {
      console.log('[Mobile] Mode elements not found');
      return;
    }
    
    // Update active states
    if (actualMode === 'vin') {
      vinMode.classList.add('active');
      plateMode.classList.remove('active');
    } else {
      vinMode.classList.remove('active');
      plateMode.classList.add('active');
    }
    
    // Update button states
    buttons.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    console.log('[Mobile] Switched to mode:', actualMode);
  }
  
  // Make switchMode available globally
  if (typeof window !== 'undefined') {
    window.switchMode = switchMode;
  }

  // =============================================================================
  // BLOCK LONG-PRESS MENU ON BUTTONS
  // =============================================================================
  
  function blockLongPressOnButtons() {
    if (!isMobile()) return;
    
    // Wait for mode buttons to exist
    setTimeout(() => {
      const modeButtons = document.querySelectorAll('.mode-btn');
      
      if (modeButtons.length === 0) {
        console.log('[Mobile] No mode buttons found, skipping long-press blocker');
        return;
      }
      
      modeButtons.forEach(btn => {
        let pressTimer = null;
        let touchStart = 0;
        let isLongPress = false;
        
        // NUCLEAR: Block ALL default behavior on buttons
        btn.addEventListener('touchstart', function(e) {
          touchStart = Date.now();
          isLongPress = false;
          
          // Immediately prevent default
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Set long-press flag after 150ms
          pressTimer = setTimeout(() => {
            isLongPress = true;
            console.log('[Mobile] Long-press detected, blocking');
          }, 150);
        }, { passive: false, capture: true });
        
        btn.addEventListener('touchend', function(e) {
          const duration = Date.now() - touchStart;
          clearTimeout(pressTimer);
          
          // Always prevent default
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // If it was a QUICK tap (< 150ms), trigger the action manually
          if (!isLongPress && duration < 150) {
            const mode = btn.getAttribute('data-mode');
            console.log('[Mobile] Quick tap detected on', mode, 'button');
            
            // Manually trigger switchMode
            if (typeof switchMode === 'function') {
              switchMode(mode);
            } else if (window.switchMode) {
              window.switchMode(mode);
            }
          }
          
          return false;
        }, { passive: false, capture: true });
        
        btn.addEventListener('touchcancel', function(e) {
          clearTimeout(pressTimer);
          e.preventDefault();
        }, { passive: false });
        
        btn.addEventListener('touchmove', function(e) {
          clearTimeout(pressTimer);
          // Don't prevent default on move - allow scrolling
        }, { passive: true });
        
        // Block click events entirely (just in case)
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }, { passive: false, capture: true });
      });
      
      console.log('[Mobile] NUCLEAR touch handling enabled on', modeButtons.length, 'mode buttons');
    }, 100);
  }

  // =============================================================================
  // FIX: Prevent iOS menu on first tap of input fields
  // =============================================================================
  
  function fixInputFirstTap() {
    if (!isMobile()) return;
    
    setTimeout(() => {
      const inputs = document.querySelectorAll('.vin-input, .code-input-v17, .plate-input, .code-input-plate');
      
      inputs.forEach(input => {
        // Create transparent overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10;
          background: transparent;
          cursor: text;
        `;
        
        // Make parent position relative
        const parent = input.parentElement;
        if (parent && getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }
        
        // Insert overlay
        parent.appendChild(overlay);
        
        // Overlay intercepts ALL touches
        overlay.addEventListener('touchstart', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }, { passive: false, capture: true });
        
        overlay.addEventListener('touchend', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Hide overlay
          overlay.style.display = 'none';
          
          // Focus input programmatically
          setTimeout(() => {
            input.focus();
            input.click();
            console.log('[Mobile] Input focused via overlay');
          }, 10);
          
          return false;
        }, { passive: false, capture: true });
        
        // Once input is focused, keep overlay hidden
        input.addEventListener('focus', function() {
          overlay.style.display = 'none';
        });
        
        input.addEventListener('blur', function() {
          // Show overlay again when input loses focus
          setTimeout(() => {
            overlay.style.display = 'block';
          }, 100);
        });
      });
      
      console.log('[Mobile] Input overlay fix enabled on', inputs.length, 'inputs');
    }, 200);
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  function init() {
    // Only run on mobile/tablet
    if (!isMobile()) {
      console.log('[Mobile] Desktop detected, mobile.js skipped');
      return;
    }

    console.log('[Mobile] Initializing mobile features...');

    // Initialize all mobile features
    updateSafeAreaVars();
    updateViewportHeight();
    disableContextMenu();
    initVinInputFormatting();
    initPlateInputFormatting();
    initMobileFormSwitching();
    initStickyCTABar();
    initAutoScrollBehavior();
    initTouchImprovements();
    blockLongPressOnButtons();
    fixInputFirstTap();

    // Try to auto-fill VIN from clipboard (after a small delay)
    setTimeout(() => {
      tryAutoFillVinFromClipboard();
    }, 1000);

    // Handle window resize and orientation change
    window.addEventListener('resize', debounce(() => {
      handleOrientationChange();
    }, 250));

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    console.log('[Mobile] Mobile features initialized successfully');
  }

  // =============================================================================
  // START
  // =============================================================================
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already loaded
    init();
  }

  // Also try after a delay as fallback
  setTimeout(init, 500);

  // Add CSS animation keyframes dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInDown {
      from {
        transform: translate(-50%, -100%);
        opacity: 0;
      }
      to {
        transform: translate(-50%, 0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutUp {
      from {
        transform: translate(-50%, 0);
        opacity: 1;
      }
      to {
        transform: translate(-50%, -100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

})();

