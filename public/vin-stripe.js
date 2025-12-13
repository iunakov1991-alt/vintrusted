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
      submitButton.disabled = true; // Disabled until terms accepted
      submitButton.style.cssText = 'padding: 12px 24px; background: #9ca3af; color: white; border: none; border-radius: 999px; font-size: 16px; font-weight: 600; cursor: not-allowed; transition: background 0.2s; text-align: center; display: flex; align-items: center; justify-content: center;';
      form.appendChild(submitButton);

      // 🆕 Terms & Conditions section (below button)
      const termsSection = createTermsSection(submitButton);
      form.appendChild(termsSection);

      // Handle form submission
      form.addEventListener('submit', (e) => handleSubmit(e, form));

      // 🔧 FIX: Avoid layout shift - clear and append atomically
      if (container.replaceChildren) {
        container.replaceChildren(form);
      } else {
        container.innerHTML = '';
        container.appendChild(form);
      }

      // 🔧 FIX: Show container smoothly after mounting
      requestAnimationFrame(() => {
        container.classList.add('stripe-loaded');
      });

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

  // 🆕 Create Terms & Conditions section (below button)
  function createTermsSection(submitButton) {
    const termsContainer = document.createElement('div');
    termsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 15px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    `;

    // Checkbox row (checkbox + instruction text)
    const checkboxRow = document.createElement('div');
    checkboxRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'terms-checkbox';
    checkbox.style.cssText = `
      width: 24px;
      height: 24px;
      min-width: 24px;
      cursor: pointer;
      accent-color: #2563eb;
    `;

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'terms-checkbox';
    checkboxLabel.textContent = 'Check this box to proceed with payment';
    checkboxLabel.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      cursor: pointer;
    `;

    checkboxRow.appendChild(checkbox);
    checkboxRow.appendChild(checkboxLabel);

    // Disclaimer text
    const disclaimerText = document.createElement('div');
    disclaimerText.style.cssText = `
      font-size: 11px;
      line-height: 1.5;
      color: #6b7280;
      padding-left: 36px;
      margin-bottom: 15px;
    `;
    disclaimerText.innerHTML = `
      I agree to the <a href="/terms.html" target="_blank" style="color: #2563eb; text-decoration: underline;">Terms &amp; Conditions</a>, including ClearVin usage limitations, waiver of liability, IP rights, and the NMVTIS disclaimer.
    `;

    // Features list with icons
    const featuresList = document.createElement('div');
    featuresList.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    `;

    const features = [
      { icon: '📊', title: 'Market Values & Pricing', text: 'Check real-time vehicle valuations and historical pricing trends' },
      { icon: '🔍', title: 'Flexible Search', text: 'Search by VIN number or license plate' },
      { icon: '📋', title: 'Complete History', text: 'Access accident, theft, and salvage records' },
      { icon: '🔔', title: 'Vehicle Monitoring', text: 'Get alerts when new data becomes available' },
      { icon: '💬', title: '24/7 Support', text: 'Live customer service via phone or email' },
      { icon: '📄', title: 'Detailed Data', text: 'Specifications, title checks, and trim details' }
    ];

    features.forEach(feature => {
      const featureItem = document.createElement('div');
      featureItem.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: flex-start;
      `;

      const icon = document.createElement('div');
      icon.textContent = feature.icon;
      icon.style.cssText = `
        font-size: 28px;
        line-height: 1;
        flex-shrink: 0;
      `;

      const content = document.createElement('div');
      content.style.cssText = 'flex: 1;';

      const title = document.createElement('div');
      title.textContent = feature.title;
      title.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 4px;
      `;

      const text = document.createElement('div');
      text.textContent = feature.text;
      text.style.cssText = `
        font-size: 11px;
        line-height: 1.4;
        color: rgba(107, 114, 128, 0.5);
      `;

      content.appendChild(title);
      content.appendChild(text);
      featureItem.appendChild(icon);
      featureItem.appendChild(content);
      featuresList.appendChild(featureItem);
    });

    // Plan details
    const planDetails = document.createElement('div');
    planDetails.style.cssText = `
      font-size: 10px;
      line-height: 1.5;
      color: rgba(107, 114, 128, 0.5);
      margin-top: 15px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    `;
    planDetails.innerHTML = `
      <strong style="color: #111827;">Membership Details:</strong> 7-day trial (50 reports/month), then $30/month. Cancel anytime via dashboard, email <a href="mailto:contact@vinhistoryus.com" style="color: #2563eb;">contact@vinhistoryus.com</a>, or call <a href="tel:+18776768162" style="color: #2563eb;">+1-877-676-8162</a>.
    `;

    termsContainer.appendChild(checkboxRow);
    termsContainer.appendChild(disclaimerText);
    termsContainer.appendChild(featuresList);
    termsContainer.appendChild(planDetails);

    // Handle checkbox change
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        submitButton.disabled = false;
        submitButton.style.background = '#111827';
        submitButton.style.cursor = 'pointer';
        submitButton.onmouseover = () => submitButton.style.background = '#374151';
        submitButton.onmouseout = () => submitButton.style.background = '#111827';
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
        }).catch(err => console.log('Consent logging failed (non-critical):', err));
      } else {
        submitButton.disabled = true;
        submitButton.style.background = '#9ca3af';
        submitButton.style.cursor = 'not-allowed';
        submitButton.onmouseover = null;
        submitButton.onmouseout = null;
      }
    });

    return termsContainer;
  }

  console.log('VIN Stripe widget script loaded');
})();

