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

  // Load Stripe.js dynamically
  let stripeLoadingPromise = null;
  
  async function loadStripeScript() {
    // If already loading or loaded, return existing promise
    if (stripeLoadingPromise) return stripeLoadingPromise;
    
    // If Stripe is already available, resolve immediately
    if (typeof Stripe !== 'undefined') {
      return Promise.resolve(window.Stripe);
    }
    
    console.log('🔄 Loading Stripe.js dynamically...');
    
    stripeLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Stripe.js loaded successfully!');
        resolve(window.Stripe);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Stripe.js');
        stripeLoadingPromise = null; // Reset so we can try again
        reject(new Error('Failed to load Stripe.js'));
      };
      
      document.head.appendChild(script);
    });
    
    return stripeLoadingPromise;
  }

  // Initialize Stripe
  async function initStripe() {
    if (isInitialized && stripe) return;

    try {
      // Load Stripe.js first
      await loadStripeScript();
      
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
        throw new Error('Stripe.js not loaded properly');
      }

      stripe = Stripe(publishableKey);
      
      isInitialized = true;
      console.log('✅ Stripe initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Stripe:', error);
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

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 1: Валидация формы (elements.submit)                    │
      // │ ОБЯЗАТЕЛЬНО ВЫЗВАТЬ ПЕРЕД confirmSetup!                     │
      // └─────────────────────────────────────────────────────────────┘
      console.log('[PAY] 🔄 Starting payment process for VIN:', vin);
      console.log('[PAY] 🔄 Before elements.submit()');
      
      const submitResult = await elements.submit();
      console.log('[PAY] ✅ After elements.submit()', submitResult);
      
      if (submitResult.error) {
        console.error('[PAY] ❌ elements.submit() error:', submitResult.error);
        throw submitResult.error;
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 2: Подтвердить SetupIntent (токенизация карты)          │
      // │ КРИТИЧНО: return_url должен быть purchase-confirmation.html │
      // │ Иначе Link/3DS не завершат confirm и payment_method = null  │
      // └─────────────────────────────────────────────────────────────┘
      console.log('[PAY] 🔄 Before stripe.confirmSetup()');
      console.log('[PAY] 📋 clientSecret:', paymentElement._clientSecret?.substring(0, 20) + '...');
      console.log('[PAY] 📋 setupIntentId:', paymentElement._setupIntentId);
      
      const confirmResult = await stripe.confirmSetup({
        elements,
        clientSecret: paymentElement._clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/purchase-confirmation.html?vin=' + encodeURIComponent(vin) + '&setup_intent=' + paymentElement._setupIntentId,
        },
        redirect: 'if_required'  // Не редиректить если не нужна 3DS
      });
      
      console.log('[PAY] ✅ After stripe.confirmSetup()', {
        error: confirmResult.error,
        setupIntent: confirmResult.setupIntent ? {
          id: confirmResult.setupIntent.id,
          status: confirmResult.setupIntent.status,
          payment_method: confirmResult.setupIntent.payment_method
        } : null
      });

      if (confirmResult.error) {
        console.error('[PAY] ❌ confirmSetup error:', confirmResult.error);
        throw confirmResult.error;
      }
      
      const { error: confirmError, setupIntent } = confirmResult;

      if (confirmError) {
        throw confirmError;
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ПРОВЕРКА: SetupIntent должен быть succeeded или processing   │
      // └─────────────────────────────────────────────────────────────┘
      if (setupIntent) {
        console.log('[PAY] 📊 SetupIntent status:', setupIntent.status);
        console.log('[PAY] 💳 payment_method:', setupIntent.payment_method || 'NULL - ERROR!');
        
        if (!setupIntent.payment_method) {
          console.error('[PAY] ❌ CRITICAL: payment_method is NULL after confirmSetup!');
          throw new Error('Card confirmation failed. Please try again.');
        }
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 3: Обработать 3D Secure если требуется                  │
      // └─────────────────────────────────────────────────────────────┘
      if (setupIntent && setupIntent.status === 'requires_action') {
        console.log('[PAY] ⚠️  SetupIntent requires_action - starting 3DS...');
        const { error: actionError } = await stripe.confirmCardSetup(paymentElement._clientSecret);
        if (actionError) {
          console.error('[PAY] ❌ 3DS error:', actionError);
          throw actionError;
        }
        console.log('[PAY] ✅ 3DS completed');
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 4: Отправить на backend для списания $3 и подписки      │
      // └─────────────────────────────────────────────────────────────┘
      console.log('[PAY] 🔄 Calling backend checkout API...');
      console.log('[PAY] 📤 Payload:', {
        setup_intent_id: paymentElement._setupIntentId,
        vin: vin
      });
      
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

      console.log('[PAY] 📥 Backend response status:', checkoutResponse.status);

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        console.error('[PAY] ❌ Backend checkout failed:', error);
        throw new Error(error.error || 'Checkout failed');
      }

      const result = await checkoutResponse.json();
      console.log('[PAY] ✅ Backend checkout success:', result);

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 5: Обработать 3DS для PaymentIntent ($3) если нужно     │
      // └─────────────────────────────────────────────────────────────┘
      if (result.next_action && result.client_secret) {
        console.log('[PAY] ⚠️  PaymentIntent requires 3DS...');
        const { error: paymentError } = await stripe.confirmCardPayment(result.client_secret);
        if (paymentError) {
          console.error('[PAY] ❌ PaymentIntent 3DS error:', paymentError);
          throw paymentError;
        }
        console.log('[PAY] ✅ PaymentIntent 3DS completed');
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 6: Редирект на страницу подтверждения                   │
      // │ ОБЯЗАТЕЛЬНО: /purchase-confirmation.html (для GA4 tracking) │
      // └─────────────────────────────────────────────────────────────┘
      console.log('[PAY] 🎉 Payment completed successfully!');
      console.log('[PAY] 🔄 Redirecting to confirmation page...');
      
      if (result.success_url) {
        console.log('[PAY] 📍 Redirect URL from backend:', result.success_url);
        window.location.href = result.success_url;
      } else {
        // Fallback (не должно происходить, но на всякий случай)
        const fallbackUrl = '/purchase-confirmation.html?vin=' + encodeURIComponent(vin) + 
          '&setup_intent=' + paymentElement._setupIntentId;
        console.log('[PAY] 📍 Fallback redirect URL:', fallbackUrl);
        window.location.href = fallbackUrl;
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      // Show error to user
      const errorContainer = form.querySelector('.error-message') || document.createElement('div');
      errorContainer.className = 'error-message';
      errorContainer.style.cssText = 'color: #ef4444; padding: 10px; margin-top: 10px; background: #fee; border-radius: 20px;';
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
      // Show loading indicator
      const loadingHTML = `
        <div id="stripe-loading" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          min-height: 200px;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4A90E2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          "></div>
          <div style="
            font-size: 16px;
            color: #666;
            font-weight: 500;
          ">Preparing payment...</div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </div>
      `;
      container.innerHTML = loadingHTML;
      
      console.log('💳 Initializing payment system...');
      
      // Initialize Stripe (will load Stripe.js if not loaded)
      await initStripe();

      // Remove loading indicator
      const loadingEl = container.querySelector('#stripe-loading');
      if (loadingEl) {
        loadingEl.remove();
      }

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
        tempContainer.style.cssText = 'padding: 15px; background: white; border-radius: 20px; border: 1px solid #e5e7eb; min-height: 200px;';
        paymentContainer = tempContainer;
      } else {
        // Create new container
        paymentContainer = document.createElement('div');
        paymentContainer.id = 'vin-payment-element';
        paymentContainer.style.cssText = 'padding: 15px; background: white; border-radius: 20px; border: 1px solid #e5e7eb; min-height: 200px;';
        
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
      submitButton.style.cssText = `
        padding: 12px 24px;
        background: #9ca3af !important;
        color: white !important;
        border: none !important;
        border-radius: 999px;
        font-size: 16px;
        font-weight: 600;
        cursor: not-allowed !important;
        transition: all 0.3s;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
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
        <div style="padding: 20px; background: #fee; border-radius: 20px; color: #ef4444;">
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
      border-radius: 20px;
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
      width: 32px;
      height: 32px;
      min-width: 32px;
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
      I agree to the <a href="/legal/terms-and-conditions.html" target="_blank" style="color: #2563eb; text-decoration: underline;">Terms &amp; Conditions</a>, including:
      <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px; line-height: 1.5;">
        <li>ClearVin report limitations (personal use only, no redistribution)</li>
        <li>Waiver of all claims against ClearVin</li>
        <li>ClearVin's intellectual property and trademark rights</li>
        <li>Agreement to indemnify and hold ClearVin harmless</li>
        <li>NMVTIS disclaimer and data limitations</li>
      </ul>
    `;

    // Features list with icons
    const featuresList = document.createElement('div');
    featuresList.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1cm;
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
      line-height: 1.6;
      color: rgba(107, 114, 128, 0.5);
      margin-top: 15px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    `;
    planDetails.innerHTML = `
      <strong style="color: #111827;">Membership Details:</strong> The trial costs $3 and activates temporary access to the service. After 10 days, a charge of $49 will be applied for the next access period. The $49 charge then repeats every 10 days, for a maximum of three billing cycles, after which the subscription is automatically canceled.<br><br>
      Payment is for service access with a limit of up to 2 reports per day; charges are applied once every 10 days, not daily.
    `;

    termsContainer.appendChild(checkboxRow);
    termsContainer.appendChild(disclaimerText);
    termsContainer.appendChild(featuresList);
    termsContainer.appendChild(planDetails);

    // Handle checkbox change
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        submitButton.disabled = false;
        submitButton.textContent = 'Pay $3.00';
        submitButton.style.setProperty('background', '#fbbf24', 'important');
        submitButton.style.setProperty('color', '#111827', 'important');
        submitButton.style.setProperty('cursor', 'pointer', 'important');
        submitButton.onmouseover = () => submitButton.style.setProperty('background', '#f59e0b', 'important');
        submitButton.onmouseout = () => submitButton.style.setProperty('background', '#fbbf24', 'important');
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
        submitButton.textContent = 'Pay $3.00';
        submitButton.style.setProperty('background', '#9ca3af', 'important');
        submitButton.style.setProperty('color', 'white', 'important');
        submitButton.style.setProperty('cursor', 'not-allowed', 'important');
        submitButton.onmouseover = null;
        submitButton.onmouseout = null;
      }
    });

    return termsContainer;
  }

  console.log('VIN Stripe widget script loaded');
})();

