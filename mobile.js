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
  
  // Store initial window width to detect desktop even when console is open
  const INITIAL_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const IS_DESKTOP_DEVICE = INITIAL_WIDTH >= 1024 && !('ontouchstart' in window);
  
  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  function isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0 || (navigator.msMaxTouchPoints || 0) > 0);
  }

  function isMobile() {
    // Never run mobile logic on desktop devices (even if console makes window narrow)
    if (IS_DESKTOP_DEVICE) return false;
    
    // Run mobile logic ONLY on touch-capable devices AND small viewports
    return isTouchDevice() && window.innerWidth < MOBILE_BREAKPOINT;
  }

  function isIOS() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // iPhone/iPad/iPod (including iPadOS which reports as Mac with touch)
    const iOSUA = /iPad|iPhone|iPod/.test(ua);
    const iPadOS13plus = /Macintosh/.test(ua) && 'ontouchend' in document;
    return iOSUA || iPadOS13plus;
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
  // FAKE INPUT (contenteditable) HANDLING
  // =============================================================================
  
  function initFakeInputs() {
    if (!isMobile()) return;
    
    const fakeInputs = document.querySelectorAll('.fake-input[contenteditable="true"]');
    
    fakeInputs.forEach(input => {
      const maxLength = parseInt(input.getAttribute('data-maxlength')) || 17;
      
      // SINGLE TAP TO FOCUS - AGGRESSIVE VERSION
      let tapTimeout;
      let touchStartTime = 0;
      
      // Track touchstart
      input.addEventListener('touchstart', function(e) {
        touchStartTime = Date.now();
      }, { passive: true });
      
      input.addEventListener('touchend', function(e) {
        const touchDuration = Date.now() - touchStartTime;
        
        // Only handle quick taps (< 300ms)
        if (touchDuration > 300) return;
        
        // Clear any previous timeout
        clearTimeout(tapTimeout);
        
        // ALWAYS try to focus on tap
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Focus immediately
        tapTimeout = setTimeout(() => {
          this.focus();
          
          // Move cursor to end if has content
          if (this.textContent.length > 0) {
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(this);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (err) {
              console.log('[Mobile] Cursor positioning failed:', err);
            }
          }
          
          console.log('[Mobile] Fake input focused on tap');
        }, 10);
        
        return false;
      }, { passive: false, capture: true });
      
      // Handle input
      input.addEventListener('input', function(e) {
        let text = this.textContent;
        
        // Auto-uppercase
        text = text.toUpperCase().replace(/\s+/g, '');
        
        // Limit length
        if (text.length > maxLength) {
          text = text.substring(0, maxLength);
        }
        
        // Update content if changed
        if (this.textContent !== text) {
          this.textContent = text;
          // Move cursor to end
          const range = document.createRange();
          const sel = window.getSelection();
          if (this.childNodes.length > 0) {
            range.setStart(this.childNodes[0], text.length);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });
      
      // Prevent paste formatting
      input.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = text.toUpperCase().replace(/\s+/g, '').substring(0, maxLength);
        document.execCommand('insertText', false, cleaned);
      });
      
      // Block line breaks
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
    });
    
    console.log('[Mobile] Fake inputs initialized:', fakeInputs.length);
  }

  // =============================================================================
  // VIN INPUT HANDLING
  // =============================================================================
  
  function initVinInputFormatting() {
    if (!isMobile()) return;

    const vinInputs = document.querySelectorAll('[data-vin-input], .vin-input:not(.fake-input), .code-input-v17:not(.fake-input)');
    
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

    function focusAndPlaceCaret(element) {
      if (!element) return;
      try {
        // Force focus to trigger keyboard
        element.focus({ preventScroll: true });
        
        // Double focus for iOS reliability
        setTimeout(() => {
          element.focus({ preventScroll: true });
        }, 10);
        
        // contenteditable support
        if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {
          setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }, 20);
        } else if (typeof element.setSelectionRange === 'function') {
          setTimeout(() => {
            const len = (element.value || '').length;
            element.setSelectionRange(len, len);
          }, 20);
        }
      } catch (_) {
        // no-op
      }
    }

    function focusVinField() {
      clearAllFields();
      vinBtn.classList.add('active');
      plateBtn.classList.remove('active');
      vinMode.classList.add('active');
      plateMode.classList.remove('active');
      
      const vinInput = document.querySelector('.vin-input, [data-vin-input], .code-input-v17, #retryVin');
      if (vinInput) setTimeout(() => focusAndPlaceCaret(vinInput), 60);
      
      console.log('[Mobile] Switched to VIN mode');
    }

    vinBtn.addEventListener('click', focusVinField);
    vinBtn.addEventListener('touchend', (e) => { e.preventDefault(); focusVinField(); }, { passive: false });

    function focusPlateField() {
      clearAllFields();
      plateBtn.classList.add('active');
      vinBtn.classList.remove('active');
      plateMode.classList.add('active');
      vinMode.classList.remove('active');
      
      const plateInput = document.querySelector('.plate-input, .code-input-plate, #retryPlate');
      if (plateInput) setTimeout(() => focusAndPlaceCaret(plateInput), 60);
      
      console.log('[Mobile] Switched to Plate mode');
    }

    plateBtn.addEventListener('click', focusPlateField);
    plateBtn.addEventListener('touchend', (e) => { e.preventDefault(); focusPlateField(); }, { passive: false });

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
    // Only for iOS mobile to avoid desktop regressions
    if (!isMobile() || !isIOS()) return;

    // Inject minimal iOS-only CSS to suppress callout without breaking inputs
    const styleId = 'ios-contextmenu-fixes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @media (pointer: coarse) {
          /* Buttons: no selection/callout, keep clicks working */
          button, .btn, .mode-btn, .m-tab-btn, .search-btn {
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
          }
          /* Inputs: suppress callout, keep caret/typing */
          input[type="text"], input[type="search"], input[type="tel"], input[type="email"],
          .vin-input, .code-input-v17, .plate-input, .code-input-plate {
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Event-level: block only the contextmenu on iOS for buttons/inputs
    const interactiveSelectors = 'button, .btn, .mode-btn, .m-tab-btn, .search-btn, input, .vin-input, .code-input-v17, .plate-input, .code-input-plate';
    const elements = document.querySelectorAll(interactiveSelectors);

    elements.forEach(el => {
      el.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false, capture: true });

      // For buttons only, block text selection start to avoid popups on quick tap
      if (el.matches('button, .btn, .mode-btn, .m-tab-btn, .search-btn')) {
        el.addEventListener('selectstart', function(e) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }, { passive: false, capture: true });
      }

      // Gentle long-press suppression on buttons only
      if (el.matches('button, .btn, .mode-btn, .m-tab-btn, .search-btn')) {
        let longPressTimer;
        el.addEventListener('touchstart', function() {
          longPressTimer = setTimeout(() => {
            // do nothing; CSS suppresses callout. Timer exists to cancel menu tendency
          }, 350);
        }, { passive: true });
        ['touchend','touchmove','touchcancel'].forEach(ev =>
          el.addEventListener(ev, function() { clearTimeout(longPressTimer); }, { passive: true })
        );
      }
    });

    console.log('[Mobile][iOS] Context menu suppressed on', elements.length, 'elements');
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
    // Only for iOS mobile to avoid interfering with desktop
    if (!isMobile() || !isIOS()) return;
    
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
        
        // Softer: do NOT block default immediately; just track timings
        btn.addEventListener('touchstart', function(e) {
          touchStart = Date.now();
          isLongPress = false;
          // Set long-press flag after 300ms
          pressTimer = setTimeout(() => {
            isLongPress = true;
            console.log('[Mobile] Long-press detected, blocking');
          }, 300);
        }, { passive: true });
        
        btn.addEventListener('touchend', function(e) {
          const duration = Date.now() - touchStart;
          clearTimeout(pressTimer);
          // If it was a QUICK tap (< 250ms), let the click happen, also trigger manually to be safe
          if (!isLongPress && duration < 250) {
            const mode = btn.getAttribute('data-mode');
            console.log('[Mobile] Quick tap detected on', mode, 'button');
            
            // Manually trigger switchMode
            if (typeof switchMode === 'function') {
              switchMode(mode);
            } else if (window.switchMode) {
              window.switchMode(mode);
            }
          }
        }, { passive: true });
        
        btn.addEventListener('touchcancel', function(e) {
          clearTimeout(pressTimer);
        }, { passive: true });
        
        btn.addEventListener('touchmove', function(e) {
          clearTimeout(pressTimer);
          // Don't prevent default on move - allow scrolling
        }, { passive: true });
      });
      
      console.log('[Mobile][iOS] Gentle touch handling enabled on', modeButtons.length, 'mode buttons');
    }, 100);
  }

  // =============================================================================
  // FIX: Prevent iOS menu on first tap of input fields
  // =============================================================================
  
  function fixInputFirstTap() {
    if (!isMobile()) return;
    
    setTimeout(() => {
      // Only apply to real inputs, not fake contenteditable ones
      const inputs = document.querySelectorAll('.vin-input:not(.fake-input), .code-input-v17:not(.fake-input), .plate-input:not(.fake-input), .code-input-plate:not(.fake-input)');
      
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
    // Do NOT create fake inputs after rollback; keep native inputs intact
    // initFakeInputs();
    initVinInputFormatting();
    initPlateInputFormatting();
    initMobileFormSwitching();
    initStickyCTABar();
    initAutoScrollBehavior();
    initTouchImprovements();
    blockLongPressOnButtons();
    // fixInputFirstTap(); // DISABLED - not needed for contenteditable fake inputs

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

