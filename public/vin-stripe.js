// VIN Stripe Payment Widget
// Embeds Stripe Payment Element for VIN report payment

(function() {
  'use strict';

  let stripe = null;
  let elements = null;
  let paymentElement = null;
  let isInitialized = false;

  // Get VIN from URL or page
  function getVIN() {
    const urlParams = new URLSearchParams(window.location.search);
    let vin = urlParams.get('vin');
    
    if (!vin) {
      // Try to get from page content
      const vinDisplay = document.getElementById('vinDisplay') || document.querySelector('.vin-display');
      if (vinDisplay) {
        vin = vinDisplay.textContent.trim();
      }
    }
    
    return vin ? vin.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  }

  // Initialize Stripe
  async function initStripe() {
    if (isInitialized && stripe) return;

    try {
      // Get publishable key from API
      const configResponse = await fetch('/api/stripe-config');
      if (!configResponse.ok) {
        throw new Error('Failed to get Stripe config');
      }
      
      const config = await configResponse.json();
      const publishableKey = config.publishableKey;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      // Initialize Stripe
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js not loaded. Make sure https://js.stripe.com/v3/ is included before this script.');
      }

      stripe = Stripe(publishableKey);
      
      isInitialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw error;
    }
  }

  // Create and mount Payment Element
  async function createPaymentElement(container) {
    if (!stripe) {
      await initStripe();
    }

    try {
      // Get VIN
      const vin = getVIN();
      
      // Create SetupIntent
      const setupIntentResponse = await fetch('/api/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin: vin })
      });

      if (!setupIntentResponse.ok) {
        const error = await setupIntentResponse.json();
        throw new Error(error.error || 'Failed to create setup intent');
      }

      const { client_secret, id } = await setupIntentResponse.json();

      // Initialize Elements with clientSecret
      elements = stripe.elements({
        clientSecret: client_secret,
        appearance: {
          theme: 'stripe',
        }
      });

      // Create Payment Element
      paymentElement = elements.create('payment', {
        layout: 'tabs',
        paymentMethodTypes: ['card']
      });

      // Mount to a temporary container first (will be moved to form later)
      const tempContainer = document.createElement('div');
      tempContainer.id = 'vin-payment-element-temp';
      tempContainer.style.cssText = 'min-height: 200px;';
      container.appendChild(tempContainer);
      
      paymentElement.mount('#vin-payment-element-temp');
      console.log('Payment Element mounted');

      // Store setup intent ID for later use
      paymentElement._setupIntentId = id;
      paymentElement._clientSecret = client_secret;

      return { setupIntentId: id, clientSecret: client_secret };
    } catch (error) {
      console.error('Error creating payment element:', error);
      throw error;
    }
  }

  // Handle form submission
  async function handleSubmit(event, form) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Pay';
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
    }

    try {
      if (!paymentElement || !stripe || !elements) {
        throw new Error('Payment element not initialized');
      }

      const vin = getVIN();
      // Email removed - will be collected on report page after payment

      // IMPORTANT: Call elements.submit() first to validate the form
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        throw submitError;
      }

      // Now confirm setup intent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: paymentElement._clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/success.html?vin=' + encodeURIComponent(vin) + '&setup_intent=' + paymentElement._setupIntentId,
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        throw confirmError;
      }

      // If setup intent requires action, handle it
      if (setupIntent && setupIntent.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardSetup(paymentElement._clientSecret);
        if (actionError) {
          throw actionError;
        }
      }

      // Proceed with checkout
      const checkoutResponse = await fetch('/api/checkout-trial-then-two-charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setup_intent_id: paymentElement._setupIntentId,
          vin: vin
        })
      });

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const result = await checkoutResponse.json();

      if (result.next_action && result.client_secret) {
        // Handle 3D Secure if needed
        const { error: paymentError } = await stripe.confirmCardPayment(result.client_secret);
        if (paymentError) {
          throw paymentError;
        }
      }

      // Redirect to success page (no email - collected later on report page)
      if (result.success_url) {
        window.location.href = result.success_url;
      } else {
        window.location.href = '/success.html?vin=' + encodeURIComponent(vin) + 
          '&setup_intent=' + paymentElement._setupIntentId;
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      // Show error to user
      const errorContainer = form.querySelector('.error-message') || document.createElement('div');
      errorContainer.className = 'error-message';
      errorContainer.style.cssText = 'color: #ef4444; padding: 10px; margin-top: 10px; background: #fee; border-radius: 4px;';
      errorContainer.textContent = error.message || 'Payment failed. Please try again.';
      
      if (!form.querySelector('.error-message')) {
        form.appendChild(errorContainer);
      }

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  }

  // Mount function - public API
  window.VIN = window.VIN || {};
  window.VIN.mount = async function(selector, options = {}) {
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    
    if (!container) {
      console.error('Container not found:', selector);
      return;
    }

    try {
      // Initialize Stripe
      await initStripe();

      // Create payment element
      await createPaymentElement(container);

      // Create form
      const form = document.createElement('form');
      form.id = 'vin-payment-form';
      form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';

      // Payment element container (reuse existing temp container or create new)
      const tempContainer = document.getElementById('vin-payment-element-temp');
      let paymentContainer;
      
      if (tempContainer) {
        tempContainer.id = 'vin-payment-element';
        tempContainer.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; min-height: 200px;';
        paymentContainer = tempContainer;
      } else {
        // Create new container
        paymentContainer = document.createElement('div');
        paymentContainer.id = 'vin-payment-element';
        paymentContainer.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb; min-height: 200px;';
        
        // Remount payment element to new container
        if (paymentElement) {
          try {
            paymentElement.unmount();
          } catch (e) {
            console.warn('Could not unmount payment element:', e);
          }
          paymentElement.mount(paymentContainer);
        }
      }
      
      form.appendChild(paymentContainer);

      // Email removed - will be collected on report page after payment

      // Submit button
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.id = 'vin-submit';
      submitButton.textContent = 'Pay $3.00';
      submitButton.style.cssText = 'padding: 12px 24px; background: #111827; color: white; border: none; border-radius: 999px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; text-align: center; display: flex; align-items: center; justify-content: center;';
      submitButton.onmouseover = () => submitButton.style.background = '#374151';
      submitButton.onmouseout = () => submitButton.style.background = '#111827';
      form.appendChild(submitButton);

      // Handle form submission
      form.addEventListener('submit', (e) => handleSubmit(e, form));

      // Clear container and add form
      container.innerHTML = '';
      container.appendChild(form);

      // ⚡ Add Terms Overlay AFTER form is mounted
      setTimeout(() => createTermsOverlay(container), 100);

      console.log('VIN Stripe widget mounted successfully');
    } catch (error) {
      console.error('Error mounting VIN Stripe widget:', error);
      container.innerHTML = `
        <div style="padding: 20px; background: #fee; border-radius: 8px; color: #ef4444;">
          <strong>Error loading payment form:</strong><br>
          ${error.message || 'Unknown error'}<br>
          <small>Please refresh the page and try again.</small>
        </div>
      `;
    }
  };

  // Create Terms & Conditions overlay
  function createTermsOverlay(container) {
    const overlay = document.createElement('div');
    overlay.id = 'terms-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 215, 0, 0.5);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 15px;
      padding: 20px;
      z-index: 100;
      pointer-events: all;
      transition: opacity 0.3s;
    `;

    // White box container
    const whiteBox = document.createElement('div');
    whiteBox.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: white;
      padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    // Label with checkbox
    const label = document.createElement('label');
    label.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'terms-checkbox-overlay';
    checkbox.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';

    const span = document.createElement('span');
    span.textContent = 'I agree to the Terms & Conditions, including ClearVin usage limitations, waiver of liability, IP rights, and the NMVTIS disclaimer.';
    span.style.cssText = 'font-size: 11px; font-weight: 400; color: #374151; line-height: 1.4;';

    label.appendChild(checkbox);
    label.appendChild(span);

    // Link
    const link = document.createElement('a');
    link.href = '/terms.html';
    link.target = '_blank';
    link.textContent = 'View full terms';
    link.style.cssText = 'color: #2563eb; font-size: 12px; text-decoration: underline; padding-left: 32px;';

    whiteBox.appendChild(label);
    whiteBox.appendChild(link);
    overlay.appendChild(whiteBox);
    container.appendChild(overlay);

    // Handle checkbox
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          container.style.opacity = '1';
        }, 300);
        console.log('[Terms] Accepted');
        
        // Log consent
        const urlParams = new URLSearchParams(window.location.search);
        const vin = urlParams.get('vin') || 'unknown';
        
        fetch('/api/log-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            vin: vin,
            terms_version: 'v1.0_20251211',
            consent_given: true,
            page: 'report.html'
          })
        }).catch(err => console.log('[Terms] Log failed (non-critical):', err));
      }
    });
  }

  console.log('VIN Stripe widget script loaded');
})();

