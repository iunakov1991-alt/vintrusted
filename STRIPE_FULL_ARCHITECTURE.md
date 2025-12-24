# 🏗️ ПОЛНАЯ АРХИТЕКТУРА STRIPE НА VINTRUSTED.COM

## 📌 ОБЩАЯ СХЕМА ПОТОКА ПЛАТЕЖА

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. ПОЛЬЗОВАТЕЛЬ ВВОДИТ VIN → ПОПАДАЕТ НА report.html                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2. ФРОНТЕНД (report.html) → Загружает Stripe.js + vin-stripe.js        │
│     window.VIN.mount('#vin-pay') → Монтирует платежную форму            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3. ПОЛУЧЕНИЕ КОНФИГА (vin-stripe.js)                                    │
│     → GET /api/stripe-config                                             │
│     → Получает publishableKey (pk_live_xxx)                              │
│     → Инициализирует Stripe(publishableKey)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4. СОЗДАНИЕ SETUPINTENT (vin-stripe.js)                                 │
│     → POST /api/create-setup-intent { vin: "1HGBH41JXMN109186" }         │
│     → Stripe создает SetupIntent для сохранения карты                    │
│     → Возвращает { client_secret: "seti_xxx", id: "seti_yyy" }           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  5. МОНТИРОВАНИЕ PAYMENT ELEMENT (vin-stripe.js)                         │
│     → elements = stripe.elements({ clientSecret })                       │
│     → paymentElement = elements.create('payment', { layout: 'tabs' })    │
│     → paymentElement.mount('#vin-payment-element')                       │
│     → Пользователь видит форму ввода карты                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  6. ПОЛЬЗОВАТЕЛЬ ВВОДИТ КАРТУ → НАЖИМАЕТ "Pay $3.00"                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  7. ПОДТВЕРЖДЕНИЕ КАРТЫ (vin-stripe.js → handleSubmit)                   │
│     → elements.submit() // Валидация формы                               │
│     → stripe.confirmSetup({ elements, clientSecret })                    │
│     → Stripe сохраняет payment_method (карту)                            │
│     → Возвращает setupIntent.payment_method = "pm_xxx"                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  8. CHECKOUT (vin-stripe.js → fetch)                                     │
│     → POST /api/checkout-trial-then-two-charges                          │
│       {                                                                   │
│         setup_intent_id: "seti_yyy",                                     │
│         vin: "1HGBH41JXMN109186"                                         │
│       }                                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  9. BACKEND (checkout-trial-then-two-charges.js)                         │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.1. Получить SetupIntent из Stripe                       │       │
│     │      → stripe.setupIntents.retrieve(setup_intent_id)       │       │
│     │      → Получить payment_method = "pm_xxx"                  │       │
│     └───────────────────────────────────────────────────────────┘       │
│                             ↓                                             │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.2. Создать Customer с привязанной картой                │       │
│     │      → stripe.customers.create({                           │       │
│     │           email: email,                                    │       │
│     │           payment_method: "pm_xxx",                        │       │
│     │           invoice_settings: {                              │       │
│     │             default_payment_method: "pm_xxx"               │       │
│     │           }                                                 │       │
│     │        })                                                   │       │
│     │      → Возвращает customer.id = "cus_xxx"                  │       │
│     └───────────────────────────────────────────────────────────┘       │
│                             ↓                                             │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.3. Списать $3 НЕМЕДЛЕННО (PaymentIntent)                │       │
│     │      → stripe.paymentIntents.create({                      │       │
│     │           amount: 300,  // $3.00                           │       │
│     │           currency: 'usd',                                 │       │
│     │           customer: "cus_xxx",                             │       │
│     │           payment_method: "pm_xxx",                        │       │
│     │           confirm: true,  // Списать сразу!                │       │
│     │           off_session: true  // Без участия клиента        │       │
│     │        })                                                   │       │
│     │      → $3 списаны СЕЙЧАС ✅                                │       │
│     └───────────────────────────────────────────────────────────┘       │
│                             ↓                                             │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.4. Создать SubscriptionSchedule для $49 × 3             │       │
│     │      const startAt = now + 10 дней                         │       │
│     │      → stripe.subscriptionSchedules.create({               │       │
│     │           customer: "cus_xxx",                             │       │
│     │           start_date: startAt,  // Через 10 дней           │       │
│     │           end_behavior: 'cancel',  // Отменить после       │       │
│     │           phases: [{                                        │       │
│     │             iterations: 3,  // 3 раза                      │       │
│     │             default_payment_method: "pm_xxx",              │       │
│     │             items: [{                                       │       │
│     │               price: PRICE_49_EVERY_10D  // $49/10дней    │       │
│     │             }]                                              │       │
│     │           }]                                                │       │
│     │        })                                                   │       │
│     │      → График: День 10, 20, 30 → $49 каждый раз           │       │
│     │      → После 3-го → АВТООТМЕНА ✅                          │       │
│     └───────────────────────────────────────────────────────────┘       │
│                             ↓                                             │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.5. Отправить ClearVin отчет на email                    │       │
│     │      → fetch('/api/send-clearvin-report', {                │       │
│     │           email: email,                                    │       │
│     │           vin: vin                                         │       │
│     │        })                                                   │       │
│     └───────────────────────────────────────────────────────────┘       │
│                             ↓                                             │
│     ┌───────────────────────────────────────────────────────────┐       │
│     │ 9.6. Вернуть success_url                                   │       │
│     │      → return {                                            │       │
│     │           success: true,                                   │       │
│     │           success_url: "/purchase-confirmation.html?..."   │       │
│     │        }                                                    │       │
│     └───────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  10. РЕДИРЕКТ НА СТРАНИЦУ ПОДТВЕРЖДЕНИЯ                                  │
│      → window.location.href = success_url                                │
│      → /purchase-confirmation.html?vin=xxx&setup_intent=yyy              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  11. ВАЛИДАЦИЯ ОПЛАТЫ ПЕРЕД GA4 (purchase-confirmation.html)             │
│      → GET /api/verify-payment?setup_intent=yyy                          │
│      → Проверка в Stripe:                                                │
│        ✅ SetupIntent.status = 'succeeded'                               │
│        ✅ SetupIntent.payment_method != null                             │
│        ✅ PaymentIntent.status = 'succeeded' ($3)                        │
│      → ТОЛЬКО ЕСЛИ paid=true → Отстукать GA4:                            │
│        • gtag('event', 'conversion', ...) - Google Ads                   │
│        • gtag('event', 'purchase', ...) - GA4 purchase                   │
│        • gtag('event', 'POKUPKA', ...) - GA4 custom event                │
│      → Анимация 10 сек → Редирект на /success.html (отчет)              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 ФАЙЛЫ И ИХ РОЛИ

### 1️⃣ **ФРОНТЕНД**

#### `report.html` (строки 13-14, 1319-1336)
```html
<!-- Подключение Stripe.js и виджета -->
<script src="https://js.stripe.com/v3/"></script>
<script src="/public/vin-stripe.js?v=24"></script>

<!-- JavaScript для монтирования виджета -->
<script>
    function initPaymentWidget() {
        const vinPayContainer = document.getElementById('vin-pay');
        if (!vinPayContainer) {
            console.error('Payment container #vin-pay not found');
            return;
        }
        
        // Монтирование виджета Stripe
        if (window.VIN && window.VIN.mount) {
            try {
                VIN.mount('#vin-pay');  // ← ГЛАВНАЯ ТОЧКА ВХОДА
                console.log('Payment widget mounted successfully');
            } catch (error) {
                console.error('Error mounting payment widget:', error);
            }
        } else {
            console.error('VIN widget not loaded, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                if (window.VIN && window.VIN.mount) {
                    VIN.mount('#vin-pay');
                } else {
                    console.error('VIN widget still not available');
                }
            }, 1000);
        }
    }
    
    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPaymentWidget);
    } else {
        initPaymentWidget();
    }
</script>
```

**ЧТО ДЕЛАЕТ:**
- Подключает Stripe.js (библиотека для работы с картами)
- Подключает `vin-stripe.js` (наш виджет)
- При загрузке страницы вызывает `VIN.mount('#vin-pay')`
- Монтирует платежную форму в контейнер `#vin-pay`

---

#### `public/vin-stripe.js` (525 строк) - **ГЛАВНЫЙ ФРОНТЕНД ФАЙЛ**

**АРХИТЕКТУРА:**

```javascript
// ═══════════════════════════════════════════════════════════════════════
// ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ STRIPE (строки 1-59)
// ═══════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Глобальные переменные для хранения экземпляров Stripe
  let stripe = null;          // Экземпляр Stripe
  let elements = null;        // Экземпляр Elements (контейнер для форм)
  let paymentElement = null;  // Экземпляр Payment Element (форма карты)
  let isInitialized = false;  // Флаг инициализации

  // ───────────────────────────────────────────────────────────────────
  // ФУНКЦИЯ: Получить VIN из URL или со страницы
  // ───────────────────────────────────────────────────────────────────
  function getVIN() {
    const urlParams = new URLSearchParams(window.location.search);
    let vin = urlParams.get('vin');  // Пробуем из URL
    
    if (!vin) {
      // Пробуем найти на странице
      const vinDisplay = document.getElementById('vinDisplay') || 
                        document.querySelector('.vin-display');
      if (vinDisplay) {
        vin = vinDisplay.textContent.trim();
      }
    }
    
    // Очищаем VIN: только буквы и цифры, uppercase
    return vin ? vin.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  }

  // ───────────────────────────────────────────────────────────────────
  // ФУНКЦИЯ: Инициализировать Stripe
  // ───────────────────────────────────────────────────────────────────
  async function initStripe() {
    if (isInitialized && stripe) return;  // Уже инициализирован

    try {
      // ШАГ 1: Получить publishable key с бэкенда
      const configResponse = await fetch('/api/stripe-config');
      if (!configResponse.ok) {
        throw new Error('Failed to get Stripe config');
      }
      
      const config = await configResponse.json();
      const publishableKey = config.publishableKey;  // pk_live_xxx
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      // ШАГ 2: Инициализировать Stripe
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js not loaded');
      }

      stripe = Stripe(publishableKey);  // ← СОЗДАНИЕ ЭКЗЕМПЛЯРА STRIPE
      
      isInitialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw error;
    }
  }


// ═══════════════════════════════════════════════════════════════════════
// ЧАСТЬ 2: СОЗДАНИЕ PAYMENT ELEMENT (строки 61-119)
// ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────
  // ФУНКЦИЯ: Создать и примонтировать Payment Element (форму карты)
  // ───────────────────────────────────────────────────────────────────
  async function createPaymentElement(container) {
    if (!stripe) {
      await initStripe();  // Инициализируем Stripe, если еще не
    }

    try {
      // ШАГ 1: Получить VIN
      const vin = getVIN();
      
      // ШАГ 2: Создать SetupIntent на бэкенде
      // SetupIntent = "намерение сохранить карту" (без списания)
      const setupIntentResponse = await fetch('/api/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: vin })
      });

      if (!setupIntentResponse.ok) {
        const error = await setupIntentResponse.json();
        throw new Error(error.error || 'Failed to create setup intent');
      }

      const { client_secret, id } = await setupIntentResponse.json();
      // client_secret = "seti_xxx_secret_yyy" - для подтверждения карты
      // id = "seti_xxx" - ID SetupIntent

      // ШАГ 3: Создать Elements с clientSecret
      // Elements = контейнер для форм Stripe
      elements = stripe.elements({
        clientSecret: client_secret,
        appearance: { theme: 'stripe' }  // Тема оформления
      });

      // ШАГ 4: Создать Payment Element (форму для ввода карты)
      paymentElement = elements.create('payment', {
        layout: 'tabs',              // Вкладки: Карта / Apple Pay / Google Pay
        paymentMethodTypes: ['card'] // Только карты (можно добавить wallets)
      });

      // ШАГ 5: Примонтировать во временный контейнер
      const tempContainer = document.createElement('div');
      tempContainer.id = 'vin-payment-element-temp';
      tempContainer.style.cssText = 'min-height: 200px;';
      container.appendChild(tempContainer);
      
      paymentElement.mount('#vin-payment-element-temp');
      console.log('Payment Element mounted');

      // ШАГ 6: Сохранить ID SetupIntent для последующего использования
      paymentElement._setupIntentId = id;
      paymentElement._clientSecret = client_secret;

      return { setupIntentId: id, clientSecret: client_secret };
    } catch (error) {
      console.error('Error creating payment element:', error);
      throw error;
    }
  }


// ═══════════════════════════════════════════════════════════════════════
// ЧАСТЬ 3: ОБРАБОТКА ОТПРАВКИ ФОРМЫ (строки 121-223)
// ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────
  // ФУНКЦИЯ: Обработать отправку формы (нажатие "Pay $3.00")
  // ───────────────────────────────────────────────────────────────────
  async function handleSubmit(event, form) {
    event.preventDefault();  // Предотвратить стандартную отправку

    // Блокируем кнопку
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

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 1: Валидация формы (elements.submit())                  │
      // │ ВАЖНО: Нужно вызвать ПЕРЕД confirmSetup!                    │
      // └─────────────────────────────────────────────────────────────┘
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        throw submitError;
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 2: Подтвердить Setup Intent (сохранить карту)           │
      // │ Stripe токенизирует карту и создает payment_method          │
      // └─────────────────────────────────────────────────────────────┘
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: paymentElement._clientSecret,
        confirmParams: {
          return_url: window.location.origin + 
                     '/success.html?vin=' + encodeURIComponent(vin) + 
                     '&setup_intent=' + paymentElement._setupIntentId,
        },
        redirect: 'if_required'  // Не редиректить, если не нужна 3DS
      });

      if (confirmError) {
        throw confirmError;
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 3: Обработать 3D Secure, если требуется                 │
      // │ (редко, только для некоторых карт)                          │
      // └─────────────────────────────────────────────────────────────┘
      if (setupIntent && setupIntent.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardSetup(
          paymentElement._clientSecret
        );
        if (actionError) {
          throw actionError;
        }
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 4: Отправить на бэкенд для checkout                     │
      // │ Теперь у нас есть setupIntent с payment_method (картой)     │
      // │ Отправляем на бэкенд для списания $3 и создания подписки    │
      // └─────────────────────────────────────────────────────────────┘
      const checkoutResponse = await fetch('/api/checkout-trial-then-two-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_intent_id: paymentElement._setupIntentId,  // ID SetupIntent
          vin: vin                                        // VIN для отчета
        })
      });

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const result = await checkoutResponse.json();

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 5: Обработать 3DS для PaymentIntent (если нужно)        │
      // │ (редко, только если $3 требуют доп. подтверждения)          │
      // └─────────────────────────────────────────────────────────────┘
      if (result.next_action && result.client_secret) {
        const { error: paymentError } = await stripe.confirmCardPayment(
          result.client_secret
        );
        if (paymentError) {
          throw paymentError;
        }
      }

      // ┌─────────────────────────────────────────────────────────────┐
      // │ ШАГ 6: Редирект на страницу подтверждения                   │
      // │ Оплата прошла! → /purchase-confirmation.html                │
      // └─────────────────────────────────────────────────────────────┘
      if (result.success_url) {
        window.location.href = result.success_url;
      } else {
        window.location.href = '/success.html?vin=' + encodeURIComponent(vin) + 
          '&setup_intent=' + paymentElement._setupIntentId;
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      // Показать ошибку пользователю
      const errorContainer = form.querySelector('.error-message') || 
                            document.createElement('div');
      errorContainer.className = 'error-message';
      errorContainer.style.cssText = 'color: #ef4444; padding: 10px; ' +
                                     'margin-top: 10px; background: #fee; ' +
                                     'border-radius: 20px;';
      errorContainer.textContent = error.message || 'Payment failed. Please try again.';
      
      if (!form.querySelector('.error-message')) {
        form.appendChild(errorContainer);
      }

      // Разблокировать кнопку
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  }


// ═══════════════════════════════════════════════════════════════════════
// ЧАСТЬ 4: ПУБЛИЧНЫЙ API - VIN.mount() (строки 225-331)
// ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────
  // ПУБЛИЧНАЯ ФУНКЦИЯ: VIN.mount(selector, options)
  // Монтирует виджет оплаты в указанный контейнер
  // ───────────────────────────────────────────────────────────────────
  window.VIN = window.VIN || {};
  window.VIN.mount = async function(selector, options = {}) {
    const container = typeof selector === 'string' ? 
                     document.querySelector(selector) : selector;
    
    if (!container) {
      console.error('Container not found:', selector);
      return;
    }

    try {
      // ШАГ 1: Инициализировать Stripe
      await initStripe();

      // ШАГ 2: Создать Payment Element
      await createPaymentElement(container);

      // ШАГ 3: Создать форму
      const form = document.createElement('form');
      form.id = 'vin-payment-form';
      form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';

      // ШАГ 4: Перенести Payment Element в форму
      const tempContainer = document.getElementById('vin-payment-element-temp');
      let paymentContainer;
      
      if (tempContainer) {
        tempContainer.id = 'vin-payment-element';
        tempContainer.style.cssText = 'padding: 15px; background: white; ' +
                                      'border-radius: 20px; border: 1px solid #e5e7eb; ' +
                                      'min-height: 200px;';
        paymentContainer = tempContainer;
      } else {
        paymentContainer = document.createElement('div');
        paymentContainer.id = 'vin-payment-element';
        paymentContainer.style.cssText = 'padding: 15px; background: white; ' +
                                         'border-radius: 20px; border: 1px solid #e5e7eb; ' +
                                         'min-height: 200px;';
        
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

      // ШАГ 5: Создать кнопку "Pay $3.00"
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.id = 'vin-submit';
      submitButton.textContent = 'Pay $3.00';
      submitButton.disabled = true;  // Заблокирована до принятия условий
      submitButton.style.cssText = `
        padding: 12px 24px;
        background: #9ca3af !important;  /* Серая (заблокирована) */
        color: white !important;
        border: none !important;
        border-radius: 999px;
        font-size: 16px;
        font-weight: 600;
        cursor: not-allowed !important;
        transition: all 0.3s;
      `;
      
      form.appendChild(submitButton);

      // ШАГ 6: Создать секцию Terms & Conditions с чекбоксом
      const termsSection = createTermsSection(submitButton);
      form.appendChild(termsSection);

      // ШАГ 7: Привязать обработчик отправки
      form.addEventListener('submit', (e) => handleSubmit(e, form));

      // ШАГ 8: Заменить содержимое контейнера на форму
      if (container.replaceChildren) {
        container.replaceChildren(form);
      } else {
        container.innerHTML = '';
        container.appendChild(form);
      }

      // ШАГ 9: Плавно показать контейнер
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


// ═══════════════════════════════════════════════════════════════════════
// ЧАСТЬ 5: СЕКЦИЯ TERMS & CONDITIONS (строки 333-521)
// ═══════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────
  // ФУНКЦИЯ: Создать секцию с условиями и чекбоксом
  // ───────────────────────────────────────────────────────────────────
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

    // ┌─────────────────────────────────────────────────────────────┐
    // │ 1. Чекбокс "Check this box to proceed with payment"         │
    // └─────────────────────────────────────────────────────────────┘
    const checkboxRow = document.createElement('div');
    checkboxRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'terms-checkbox';
    checkbox.style.cssText = `
      width: 32px; height: 32px; min-width: 32px;
      cursor: pointer; accent-color: #2563eb;
    `;

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'terms-checkbox';
    checkboxLabel.textContent = 'Check this box to proceed with payment';
    checkboxLabel.style.cssText = `
      font-size: 14px; font-weight: 600;
      color: #111827; cursor: pointer;
    `;

    checkboxRow.appendChild(checkbox);
    checkboxRow.appendChild(checkboxLabel);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ 2. Дисклеймер (условия, на что пользователь соглашается)    │
    // └─────────────────────────────────────────────────────────────┘
    const disclaimerText = document.createElement('div');
    disclaimerText.style.cssText = `
      font-size: 11px; line-height: 1.5; color: #6b7280;
      padding-left: 36px; margin-bottom: 15px;
    `;
    disclaimerText.innerHTML = `
      I agree to the <a href="/legal/terms-and-conditions.html" target="_blank" 
        style="color: #2563eb; text-decoration: underline;">Terms &amp; Conditions</a>, including:
      <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px; line-height: 1.5;">
        <li>ClearVin report limitations (personal use only, no redistribution)</li>
        <li>Waiver of all claims against ClearVin</li>
        <li>ClearVin's intellectual property and trademark rights</li>
        <li>Agreement to indemnify and hold ClearVin harmless</li>
        <li>NMVTIS disclaimer and data limitations</li>
      </ul>
    `;

    // ┌─────────────────────────────────────────────────────────────┐
    // │ 3. Список фич (что получает пользователь)                   │
    // └─────────────────────────────────────────────────────────────┘
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
      { icon: '📊', title: 'Market Values & Pricing', 
        text: 'Check real-time vehicle valuations and historical pricing trends' },
      { icon: '🔍', title: 'Flexible Search', 
        text: 'Search by VIN number or license plate' },
      { icon: '📋', title: 'Complete History', 
        text: 'Access accident, theft, and salvage records' },
      { icon: '🔔', title: 'Vehicle Monitoring', 
        text: 'Get alerts when new data becomes available' },
      { icon: '💬', title: '24/7 Support', 
        text: 'Live customer service via phone or email' },
      { icon: '📄', title: 'Detailed Data', 
        text: 'Specifications, title checks, and trim details' }
    ];

    features.forEach(feature => {
      const featureItem = document.createElement('div');
      featureItem.style.cssText = 'display: flex; gap: 10px; align-items: flex-start;';

      const icon = document.createElement('div');
      icon.textContent = feature.icon;
      icon.style.cssText = 'font-size: 28px; line-height: 1; flex-shrink: 0;';

      const content = document.createElement('div');
      content.style.cssText = 'flex: 1;';

      const title = document.createElement('div');
      title.textContent = feature.title;
      title.style.cssText = 'font-size: 13px; font-weight: 600; ' +
                           'color: #111827; margin-bottom: 4px;';

      const text = document.createElement('div');
      text.textContent = feature.text;
      text.style.cssText = 'font-size: 11px; line-height: 1.4; ' +
                          'color: rgba(107, 114, 128, 0.5);';

      content.appendChild(title);
      content.appendChild(text);
      featureItem.appendChild(icon);
      featureItem.appendChild(content);
      featuresList.appendChild(featureItem);
    });

    // ┌─────────────────────────────────────────────────────────────┐
    // │ 4. Детали подписки (план платежей)                          │
    // └─────────────────────────────────────────────────────────────┘
    const planDetails = document.createElement('div');
    planDetails.style.cssText = `
      font-size: 10px; line-height: 1.6;
      color: rgba(107, 114, 128, 0.5);
      margin-top: 15px; padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    `;
    planDetails.innerHTML = `
      <strong style="color: #111827;">Membership Details:</strong> 
      The trial costs $3 and activates temporary access to the service. 
      After 10 days, a charge of $49 will be applied for the next access period. 
      The $49 charge then repeats every 10 days, for a maximum of three billing cycles, 
      after which the subscription is automatically canceled.<br><br>
      Payment is for service access with a limit of up to 2 reports per day; 
      charges are applied once every 10 days, not daily.
    `;

    // Собираем все вместе
    termsContainer.appendChild(checkboxRow);
    termsContainer.appendChild(disclaimerText);
    termsContainer.appendChild(featuresList);
    termsContainer.appendChild(planDetails);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ 5. Обработчик чекбокса (разблокировка кнопки)               │
    // └─────────────────────────────────────────────────────────────┘
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        // ✅ ЧЕКБОКС ОТМЕЧЕН → Разблокировать кнопку
        submitButton.disabled = false;
        submitButton.textContent = 'Pay $3.00';
        submitButton.style.setProperty('background', '#fbbf24', 'important');  // Желтая
        submitButton.style.setProperty('color', '#111827', 'important');
        submitButton.style.setProperty('cursor', 'pointer', 'important');
        submitButton.onmouseover = () => 
          submitButton.style.setProperty('background', '#f59e0b', 'important');
        submitButton.onmouseout = () => 
          submitButton.style.setProperty('background', '#fbbf24', 'important');
        console.log('[Terms] Accepted');
        
        // Логируем согласие с условиями (для аудита)
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
        // ❌ ЧЕКБОКС СНЯТ → Заблокировать кнопку
        submitButton.disabled = true;
        submitButton.textContent = 'Pay $3.00';
        submitButton.style.setProperty('background', '#9ca3af', 'important');  // Серая
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
```

---

### 2️⃣ **БЭКЕНД API**

#### `api/stripe-config.js` (42 строки)

```javascript
// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINT: GET /api/stripe-config
// ЦЕЛЬ: Вернуть publishable key для инициализации Stripe на фронтенде
// ═══════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS заголовки (разрешить запросы с любых доменов)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработать preflight запрос (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получить publishable key из переменных окружения
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('STRIPE_PUBLISHABLE_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe not configured. Please contact support.' 
      });
    }

    // Вернуть ключ клиенту
    res.status(200).json({ 
      publishableKey,  // pk_live_xxx или pk_test_xxx
      returnUrl: process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/payment-success.html`
        : 'https://vintrusted.com/payment-success.html'
    });
  } catch (error) {
    console.error('Error in stripe-config:', error);
    res.status(500).json({ 
      error: 'Failed to get Stripe configuration' 
    });
  }
}
```

**ЧТО ДЕЛАЕТ:**
- Возвращает `publishableKey` (публичный ключ Stripe)
- Фронтенд использует его для инициализации `Stripe(publishableKey)`
- Также возвращает `returnUrl` (куда редиректить после оплаты)

---

#### `api/create-setup-intent.js` (18 строк)

```javascript
// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINT: POST /api/create-setup-intent
// ЦЕЛЬ: Создать SetupIntent для сохранения карты (без списания денег)
// ═══════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vin } = req.body || {};
    
    // ┌─────────────────────────────────────────────────────────────┐
    // │ Создаем SetupIntent                                          │
    // │                                                              │
    // │ SetupIntent = "намерение сохранить карту"                    │
    // │ - НЕ списывает деньги                                        │
    // │ - Токенизирует карту и создает payment_method               │
    // │ - Можно использовать для будущих платежей                   │
    // │                                                              │
    // │ usage: 'off_session' = разрешить списания без участия клиента│
    // │ metadata: { vin: "..." } = сохранить VIN для отчета         │
    // └─────────────────────────────────────────────────────────────┘
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',  // Разрешить off_session платежи (автосписания)
      metadata: vin ? { 
        vin: vin.toUpperCase().replace(/[^A-Z0-9]/g, '')  // Очистить VIN
      } : {}
    });

    // Вернуть client_secret и id
    res.status(200).json({ 
      client_secret: setupIntent.client_secret,  // seti_xxx_secret_yyy
      id: setupIntent.id                         // seti_xxx
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
```

**ЧТО ДЕЛАЕТ:**
- Создает `SetupIntent` в Stripe
- `SetupIntent` = намерение сохранить карту (без списания)
- Возвращает `client_secret` для подтверждения карты на фронтенде
- Сохраняет VIN в metadata для последующего использования

---

#### `api/checkout-trial-then-two-charges.js` (135 строк) - **ГЛАВНЫЙ БЭКЕНД ФАЙЛ**

```javascript
// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINT: POST /api/checkout-trial-then-two-charges
// ЦЕЛЬ: Обработать оплату $3 + создать подписку $49×3
// ═══════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ВАЖНО: Этот эндпоинт предполагает, что в Vercel есть переменная
//        PRICE_49_EVERY_10D с Price ID для $49 каждые 10 дней

export default async function handler(req, res) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('Checkout request:', req.body);
  
  try {
    const { setup_intent_id, email, vin } = req.body || {};
    if (!setup_intent_id) {
      throw new Error('setup_intent_id is required');
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 1: Получить SetupIntent из Stripe                       │
    // │ Нам нужен payment_method (токен карты)                      │
    // └─────────────────────────────────────────────────────────────┘
    console.log('Retrieving SetupIntent:', setup_intent_id);
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!si || !si.payment_method) {
      throw new Error('SetupIntent has no payment_method');
    }
    console.log('SetupIntent OK, payment_method:', si.payment_method);

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 2: Создать Customer с привязанной картой                │
    // │                                                              │
    // │ Customer = клиент в Stripe                                   │
    // │ - Хранит payment_method (карту)                             │
    // │ - Можно использовать для будущих платежей                   │
    // │ - Можно привязать email для квитанций                       │
    // └─────────────────────────────────────────────────────────────┘
    const customer = await stripe.customers.create({
      email: email || undefined,              // Email (опционально)
      payment_method: si.payment_method,      // Привязать карту
      invoice_settings: { 
        default_payment_method: si.payment_method  // Карта по умолчанию
      }
    });

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 3: Списать $3 НЕМЕДЛЕННО (PaymentIntent)                │
    // │                                                              │
    // │ PaymentIntent = намерение списать деньги                     │
    // │ - amount: 300 = $3.00 (в центах)                            │
    // │ - confirm: true = списать сразу (не ждать confirmCardPayment)│
    // │ - off_session: true = списание без участия клиента          │
    // │ - statement_descriptor_suffix = что клиент увидит в банке   │
    // └─────────────────────────────────────────────────────────────┘
    const pi = await stripe.paymentIntents.create({
      amount: 300,                         // $3.00 (в центах: 300 = $3.00)
      currency: 'usd',                     // Валюта
      customer: customer.id,               // ID клиента
      payment_method: si.payment_method,   // Карта для списания
      confirm: true,                       // ✅ СПИСАТЬ НЕМЕДЛЕННО
      off_session: true,                   // Разрешить списание без клиента
      statement_descriptor_suffix: 'VIN Report',  // Что увидит клиент в банке
      description: 'Trial activation $3'   // Описание для админа
    });
    // После этого $3 СПИСАНЫ! ✅

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 4: Создать SubscriptionSchedule для $49×3               │
    // │                                                              │
    // │ SubscriptionSchedule = расписание подписки                   │
    // │ - start_date: когда начать (сейчас + 10 дней)               │
    // │ - iterations: 3 = сколько раз списать                       │
    // │ - end_behavior: 'cancel' = что делать после завершения      │
    // │ - items: [{ price: PRICE_49_EVERY_10D }] = что списывать    │
    // │                                                              │
    // │ ВАЖНО: PRICE_49_EVERY_10D должен быть настроен в Stripe:    │
    // │        - Product: "VIN Report Subscription"                 │
    // │        - Price: $49.00 every 10 days                        │
    // └─────────────────────────────────────────────────────────────┘
    let schedule = null;
    const priceId = process.env.PRICE_49_EVERY_10D;
    if (priceId) {
      try {
        // Рассчитать дату старта: сейчас + 10 дней
        const startAt = Math.floor(Date.now() / 1000) + 10 * 86400;
        // 86400 секунд = 1 день
        // 10 * 86400 = 10 дней
        
        // Создать SubscriptionSchedule
        schedule = await stripe.subscriptionSchedules.create({
          customer: customer.id,              // ID клиента
          start_date: startAt,                // Старт через 10 дней
          end_behavior: 'cancel',             // ✅ ОТМЕНИТЬ ПОСЛЕ ЗАВЕРШЕНИЯ
          phases: [
            {
              iterations: 3,                  // ✅ 3 ЦИКЛА (10, 20, 30 дней)
              default_payment_method: si.payment_method,  // Карта для списания
              collection_method: 'charge_automatically',  // Списывать автоматически
              proration_behavior: 'none',     // Не рассчитывать пропорции
              items: [{ price: priceId }]     // ✅ $49 КАЖДЫЕ 10 ДНЕЙ
            }
          ]
        });
        console.log('Subscription schedule created:', schedule.id);
        
        // РЕЗУЛЬТАТ:
        // День 10: $49 списаны (iteration 1/3)
        // День 20: $49 списаны (iteration 2/3)
        // День 30: $49 списаны (iteration 3/3)
        // День 31: Подписка ОТМЕНЯЕТСЯ ✅ (end_behavior: 'cancel')
      } catch (scheduleError) {
        console.error('Failed to create subscription schedule:', scheduleError.message);
        // Продолжаем, даже если подписка не создалась
      }
    } else {
      console.log('PRICE_49_EVERY_10D not set, skipping subscription schedule');
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 5: Получить VIN (из request / SetupIntent / Customer)   │
    // └─────────────────────────────────────────────────────────────┘
    let finalVin = vin || si.metadata?.vin || '';
    
    if (!finalVin && customer) {
      finalVin = customer.metadata?.vin || '';
    }
    
    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 6: Отправить ClearVin отчет на email                    │
    // │ (если есть email и VIN)                                     │
    // └─────────────────────────────────────────────────────────────┘
    if (email && finalVin) {
      try {
        console.log('Sending ClearVin report to:', email, 'for VIN:', finalVin);
        
        // Вызвать API для отправки отчета
        const reportResponse = await fetch(
          `${process.env.VERCEL_URL ? 
            `https://${process.env.VERCEL_URL}` : 
            'https://vintrusted.com'}/api/send-clearvin-report`, 
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              vin: finalVin
            })
          }
        );
        
        if (reportResponse.ok) {
          console.log('ClearVin report sent successfully');
        } else {
          const errorData = await reportResponse.json();
          console.error('Failed to send ClearVin report:', errorData);
        }
      } catch (reportError) {
        console.error('Error sending ClearVin report:', reportError.message);
        // Продолжаем, даже если отчет не отправился
      }
    } else {
      console.log('Skipping ClearVin report - missing email or VIN');
    }
    
    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 7: Построить URL для редиректа                          │
    // │ → /purchase-confirmation.html?vin=xxx&setup_intent=yyy       │
    // └─────────────────────────────────────────────────────────────┘
    const baseUrl = process.env.APP_URL || 
                    process.env.RETURN_URL?.replace('/success.html', '')
                                          .replace('/payment-success', '') || 
                    'https://vintrusted.com';
    let successUrl = `${baseUrl}/purchase-confirmation.html`;
    
    const params = new URLSearchParams();
    if (finalVin) {
      params.append('vin', finalVin);
    }
    if (si.id) {
      params.append('setup_intent', si.id);
    }
    
    if (params.toString()) {
      successUrl += '?' + params.toString();
    }
    
    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 8: Обработать 3D Secure (если нужно)                    │
    // │ (редко, только для некоторых карт)                          │
    // └─────────────────────────────────────────────────────────────┘
    const payload = { success: true, success_url: successUrl };
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      payload.next_action = true;
      payload.client_secret = pi.client_secret;
      // Фронтенд должен будет вызвать stripe.confirmCardPayment()
    }

    console.log('Checkout success!');
    res.status(200).json(payload);
  } catch (e) {
    console.error('Checkout error:', e.message, e.type, e.code);
    res.status(400).json({ 
      error: e.message, 
      type: e.type, 
      code: e.code 
    });
  }
}
```

**ЧТО ДЕЛАЕТ:**
1. Получает `SetupIntent` из Stripe (содержит `payment_method` - токен карты)
2. Создает `Customer` с привязанной картой
3. Списывает **$3.00 НЕМЕДЛЕННО** через `PaymentIntent`
4. Создает `SubscriptionSchedule` для **3 списаний по $49 каждые 10 дней**
5. Отправляет ClearVin отчет на email (если есть)
6. Возвращает URL для редиректа на страницу подтверждения

---

#### `api/verify-payment.js` (NEW) - **Валидация оплаты перед GA4**

```javascript
// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINT: GET /api/verify-payment?setup_intent=seti_xxx
// ЦЕЛЬ: Проверить что оплата реально прошла перед отстукиванием GA4
// НАЗНАЧЕНИЕ: Предотвратить ложные конверсии без реальных денег
// ═══════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { setup_intent } = req.query;
    
    if (!setup_intent) {
      return res.status(400).json({ 
        paid: false, 
        error: 'setup_intent parameter required' 
      });
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 1: Получить SetupIntent из Stripe                       │
    // └─────────────────────────────────────────────────────────────┘
    const si = await stripe.setupIntents.retrieve(setup_intent);
    
    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 2: Проверить что SetupIntent succeeded                  │
    // │ И что есть payment_method (карта подтверждена)              │
    // └─────────────────────────────────────────────────────────────┘
    if (si.status !== 'succeeded' || !si.payment_method) {
      return res.status(200).json({ 
        paid: false,
        status: si.status,
        payment_method: si.payment_method,
        reason: 'SetupIntent not succeeded or no payment_method'
      });
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 3: Найти связанный PaymentIntent ($3)                   │
    // └─────────────────────────────────────────────────────────────┘
    let paymentIntent = null;
    
    if (si.customer) {
      const customerPaymentIntents = await stripe.paymentIntents.list({
        customer: si.customer,
        limit: 5,
      });
      
      // Ищем PaymentIntent на $3.00 (300 cents)
      paymentIntent = customerPaymentIntents.data.find(pi => 
        pi.amount === 300 && pi.currency === 'usd'
      );
    }

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ШАГ 4: Проверить что $3 списались                           │
    // └─────────────────────────────────────────────────────────────┘
    const paymentSucceeded = paymentIntent && paymentIntent.status === 'succeeded';

    // ┌─────────────────────────────────────────────────────────────┐
    // │ ИТОГОВАЯ ПРОВЕРКА: Оплата валидна если:                     │
    // │ 1. SetupIntent succeeded + payment_method                    │
    // │ 2. PaymentIntent succeeded ($3)                              │
    // └─────────────────────────────────────────────────────────────┘
    const isValid = si.status === 'succeeded' && 
                    si.payment_method && 
                    paymentSucceeded;

    return res.status(200).json({
      paid: isValid,
      setup_intent: {
        id: si.id,
        status: si.status,
        payment_method: si.payment_method
      },
      payment_intent: paymentIntent ? {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ 
      paid: false,
      error: error.message 
    });
  }
}
```

**ЧТО ДЕЛАЕТ:**
1. Получает `setup_intent` из query параметра
2. Проверяет статус `SetupIntent` в Stripe (должен быть `succeeded`)
3. Проверяет наличие `payment_method` (карта должна быть подтверждена)
4. Ищет связанный `PaymentIntent` на $3.00 (проверяет что деньги списались)
5. Возвращает `{ paid: true }` ТОЛЬКО если все проверки прошли
6. Используется на `/purchase-confirmation.html` перед отстукиванием GA4

**КРИТИЧНО:**
- Без этой проверки GA4 будет отстукивать конверсии БЕЗ реальных денег
- Если `SetupIntent.payment_method = null` → оплата НЕ прошла
- Если `PaymentIntent.status != 'succeeded'` → $3 НЕ списались
- Только `paid: true` → разрешить отстукивание GA4/Google Ads

---

## 🎯 **ГЛАВНЫЕ КОНЦЕПЦИИ STRIPE**

### 1. **SetupIntent** vs **PaymentIntent**

```javascript
// ┌─────────────────────────────────────────────────────────────────┐
// │ SetupIntent = СОХРАНИТЬ КАРТУ (без списания денег)              │
// └─────────────────────────────────────────────────────────────────┘
const setupIntent = await stripe.setupIntents.create({
  usage: 'off_session',  // Разрешить будущие списания без клиента
  metadata: { vin: "..." }
});
// → Возвращает payment_method (токен карты)
// → НЕ списывает деньги
// → Можно использовать для будущих платежей

// ┌─────────────────────────────────────────────────────────────────┐
// │ PaymentIntent = СПИСАТЬ ДЕНЬГИ СЕЙЧАС                           │
// └─────────────────────────────────────────────────────────────────┘
const paymentIntent = await stripe.paymentIntents.create({
  amount: 300,  // $3.00
  currency: 'usd',
  customer: 'cus_xxx',
  payment_method: 'pm_xxx',
  confirm: true,      // ✅ СПИСАТЬ СРАЗУ
  off_session: true   // Без участия клиента
});
// → Списывает $3.00 НЕМЕДЛЕННО
// → Возвращает status: 'succeeded' если успешно
```

**ПОЧЕМУ МЫ ИСПОЛЬЗУЕМ ОБА?**
- `SetupIntent`: Сохраняем карту на фронтенде (безопасно, без PCI-DSS)
- `PaymentIntent`: Списываем $3 на бэкенде (полный контроль)

---

### 2. **SubscriptionSchedule** - График Подписки

```javascript
// ┌─────────────────────────────────────────────────────────────────┐
// │ SubscriptionSchedule = РАСПИСАНИЕ ПОДПИСКИ                       │
// │ Позволяет:                                                       │
// │ - Запланировать старт на будущее                                │
// │ - Ограничить количество циклов (iterations)                     │
// │ - Автоматически отменить после N циклов (end_behavior: 'cancel')│
// └─────────────────────────────────────────────────────────────────┘

const schedule = await stripe.subscriptionSchedules.create({
  customer: 'cus_xxx',
  start_date: Math.floor(Date.now() / 1000) + 10 * 86400,  // +10 дней
  end_behavior: 'cancel',  // ✅ ОТМЕНИТЬ ПОСЛЕ ЗАВЕРШЕНИЯ
  phases: [{
    iterations: 3,  // ✅ 3 ЦИКЛА
    items: [{ 
      price: 'price_xxx'  // $49 каждые 10 дней
    }]
  }]
});

// РЕЗУЛЬТАТ:
// День 0:  Создан schedule
// День 10: Первое списание $49 (iteration 1/3)
// День 20: Второе списание $49 (iteration 2/3)
// День 30: Третье списание $49 (iteration 3/3)
// День 31: Подписка ОТМЕНЯЕТСЯ автоматически ✅
```

**ПОЧЕМУ НЕ ОБЫЧНАЯ SUBSCRIPTION?**
- `Subscription` = бесконечная подписка (нужна ручная отмена)
- `SubscriptionSchedule` = ограниченная подписка (авто-отмена после N циклов)

---

### 3. **Price** - Настройка Цены в Stripe

```bash
# В Stripe Dashboard:
# Products → + Add Product

Name: "VIN Report Subscription - $49/10 days"

Pricing:
  - Price: $49.00
  - Billing period: Custom
  - Interval: Every 10 days
  - Usage type: Licensed (fixed quantity)

Save → Скопировать Price ID: price_1ABC123xyz

# В Vercel Environment Variables:
PRICE_49_EVERY_10D=price_1ABC123xyz
```

---

## 📊 **ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (Vercel)**

```bash
# ══════════════════════════════════════════════════════════════════
# STRIPE CREDENTIALS
# ══════════════════════════════════════════════════════════════════

# Секретный ключ (для бэкенда)
STRIPE_SECRET_KEY=sk_[mode]_[your_stripe_secret_key_here]

# Публичный ключ (для фронтенда)
STRIPE_PUBLISHABLE_KEY=pk_[mode]_[your_stripe_publishable_key_here]

# ══════════════════════════════════════════════════════════════════
# STRIPE PRICE IDS
# ══════════════════════════════════════════════════════════════════

# Price ID для $49 каждые 10 дней
# Создается в Stripe Dashboard → Products → Create Price
PRICE_49_EVERY_10D=price_xxxxxxxxxxxxxxxxxxxxx

# ══════════════════════════════════════════════════════════════════
# CLEARVIN API (для отчетов)
# ══════════════════════════════════════════════════════════════════

CLEARVIN_EMAIL=redstepler@gmail.com
CLEARVIN_PASSWORD=t1sih81s68!36

# ══════════════════════════════════════════════════════════════════
# URLs
# ══════════════════════════════════════════════════════════════════

APP_URL=https://vintrusted.com
RETURN_URL=https://vintrusted.com
```

---

## ✅ **ПРОВЕРОЧНЫЙ ЧЕКЛИСТ**

### **Для корректной работы подписки:**

- [ ] ✅ `STRIPE_SECRET_KEY` установлен в Vercel
- [ ] ✅ `STRIPE_PUBLISHABLE_KEY` установлен в Vercel
- [ ] ✅ `PRICE_49_EVERY_10D` создан в Stripe Dashboard
      - Interval: 10 days
      - Price: $49.00
- [ ] ✅ `PRICE_49_EVERY_10D` добавлен в Vercel Environment Variables
- [ ] ✅ `CLEARVIN_EMAIL` и `CLEARVIN_PASSWORD` установлены
- [ ] ✅ Тестовый платеж проходит успешно
- [ ] ✅ В Stripe Dashboard видна SubscriptionSchedule с 3 iterations
- [ ] ✅ Google Analytics отслеживает конверсию на `/purchase-confirmation.html`

---

## 🔍 **КАК ПРОВЕРИТЬ ЧТО ВСЕ РАБОТАЕТ**

### 1. **Проверить переменные в Vercel**

```bash
# Vercel Dashboard → Settings → Environment Variables
# Убедиться что все переменные установлены:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PRICE_49_EVERY_10D=price_...
CLEARVIN_EMAIL=...
CLEARVIN_PASSWORD=...
```

### 2. **Тестовый платеж с проверкой логов**

```
1. Открыть vintrusted.com
2. Открыть DevTools (F12) → Console tab
3. Ввести VIN → Перейти на report.html
4. Заполнить тестовую карту:
   - Number: 4242 4242 4242 4242
   - Exp: 12/34
   - CVC: 123
5. Отметить чекбокс Terms & Conditions
6. Нажать "Pay $3.00"

7. ПРОВЕРИТЬ ЛОГИ В CONSOLE (КРИТИЧНО):
   ✅ [PAY] 🔄 Starting payment process for VIN: ...
   ✅ [PAY] 🔄 Before elements.submit()
   ✅ [PAY] ✅ After elements.submit()
   ✅ [PAY] 🔄 Before stripe.confirmSetup()
   ✅ [PAY] ✅ After stripe.confirmSetup()
   ✅ [PAY] 💳 payment_method: pm_xxx (НЕ NULL!)
   ✅ [PAY] 🔄 Calling backend checkout API...
   ✅ [PAY] ✅ Backend checkout success
   ✅ [PAY] 🎉 Payment completed successfully!
   ✅ [PAY] 🔄 Redirecting to confirmation page...

8. ПОСЛЕ РЕДИРЕКТА НА /purchase-confirmation.html:
   ✅ [CONFIRMATION] 🔄 Verifying payment with Stripe...
   ✅ [CONFIRMATION] ✅ Payment CONFIRMED in Stripe!
   ✅ [CONFIRMATION] ✅ Firing GA4 conversion events...
   ✅ [CONFIRMATION] ✅ Google Ads conversion tracked
   ✅ [CONFIRMATION] ✅ GA4 purchase event tracked
   ✅ [CONFIRMATION] ✅ GA4 POKUPKA event tracked
   ✅ [CONFIRMATION] 🎉 All conversion events fired successfully!

9. ИТОГОВАЯ ПРОВЕРКА:
   ✅ Анимация 10 сек
   ✅ Редирект на /success.html с отчетом
```

**ЕСЛИ ВИДИТЕ В ЛОГАХ:**
- ❌ `payment_method: NULL - ERROR!` → confirmSetup не завершился
- ❌ `Payment NOT confirmed in Stripe` → оплата не прошла, GA4 НЕ отстукается
- ❌ `SetupIntent not succeeded` → карта не подтверждена


### 3. **Проверить Stripe Events (КРИТИЧНО)**

```
1. Stripe Dashboard → Developers → Events

2. ОБЯЗАТЕЛЬНО ДОЛЖНЫ БЫТЬ ЭТИ СОБЫТИЯ (в порядке появления):
   ✅ setup_intent.created
   ✅ setup_intent.succeeded ← КРИТИЧНО! Без этого payment_method = null
   ✅ customer.created
   ✅ payment_method.attached
   ✅ payment_intent.created
   ✅ payment_intent.succeeded ← КРИТИЧНО! Без этого $3 не списались
   ✅ subscription_schedule.created

3. ЕСЛИ НЕТ setup_intent.succeeded:
   ❌ Проблема: confirmSetup не завершается на фронтенде
   ❌ Результат: payment_method = null
   ❌ Результат: $3 не списываются
   ❌ Фикс: Проверить логи [PAY] в браузере

4. ЕСЛИ НЕТ payment_intent.succeeded:
   ❌ Проблема: Backend не создал PaymentIntent или карта отклонена
   ❌ Результат: $3 не списались
   ❌ Фикс: Проверить логи Vercel
```

### 4. **Проверить в Stripe Dashboard**

```
1. Stripe Dashboard → Customers
2. Найти клиента по времени создания (только что)
3. Проверить:
   ✅ Payment Intent: $3.00 succeeded
   ✅ Subscription Schedule: active
   ✅ Next payment: через 10 дней ($49.00)
   ✅ Iterations: 0 of 3
   ✅ End date: через 30 дней
   ✅ End behavior: cancel
   ✅ Payment Method: Card (ends in 4242) - ДОЛЖНА БЫТЬ ПРИВЯЗАНА
```

### 5. **Проверить логи Vercel**

```bash
# Vercel Dashboard → Deployments → Latest → Logs

# Искать:
✅ "Checkout request"
✅ "SetupIntent OK, payment_method: pm_xxx"
✅ "Subscription schedule created: sub_sched_xxx"
✅ "ClearVin report sent successfully"
✅ "Checkout success!"

# Если есть ошибки:
❌ "PRICE_49_EVERY_10D not set"
   → Добавить переменную в Vercel

❌ "Failed to create subscription schedule"
   → Проверить что Price ID правильный

❌ "Checkout error: ..."
   → Проверить STRIPE_SECRET_KEY
```

---

## 🎉 **РЕЗЮМЕ: ВСЯ СХЕМА ОДНИМ ВЗГЛЯДОМ**

```
┌───────────────────┐
│   ПОЛЬЗОВАТЕЛЬ    │  Вводит VIN → Попадает на report.html
│   🧑‍💻               │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   report.html     │  Загружает Stripe.js + vin-stripe.js
│   📄               │  window.VIN.mount('#vin-pay')
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  vin-stripe.js    │  GET /api/stripe-config → publishableKey
│  📜                │  stripe = Stripe(publishableKey)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  create-setup-    │  POST { vin: "xxx" }
│  intent.js        │  → SetupIntent { client_secret, id }
│  🔐                │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Payment Element  │  Форма ввода карты
│  💳                │  elements.create('payment')
└─────────┬─────────┘
          │
          ▼ ПОЛЬЗОВАТЕЛЬ ВВОДИТ КАРТУ + НАЖИМАЕТ "Pay $3.00"
          │
          ▼
┌───────────────────┐
│  stripe.confirm   │  Подтверждение карты (токенизация)
│  Setup            │  → payment_method = "pm_xxx"
│  🔒                │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  checkout-trial-  │  POST { setup_intent_id, vin }
│  then-two-charges │  ├─ Customer.create()
│  💰                │  ├─ PaymentIntent.create() → $3 СПИСАНЫ ✅
│                   │  ├─ SubscriptionSchedule.create()
│                   │  │   ├─ start_date: +10 дней
│                   │  │   ├─ iterations: 3
│                   │  │   ├─ price: $49 каждые 10 дней
│                   │  │   └─ end_behavior: cancel ✅
│                   │  └─ send-clearvin-report (email)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  purchase-        │  Анимация 10 сек
│  confirmation.    │  Google Analytics: POKUPKA + purchase
│  html 🎉          │  → Редирект на success.html
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  success.html     │  Отображение ClearVin отчета
│  📊                │  Google Analytics: report_viewed
└───────────────────┘

═════════════════════════════════════════════════════════════════

ГРАФИК СПИСАНИЙ:

День 0:   $3.00 СПИСАНЫ ✅ → Доступ к отчету
День 10:  $49.00 списаны автоматически (iteration 1/3)
День 20:  $49.00 списаны автоматически (iteration 2/3)
День 30:  $49.00 списаны автоматически (iteration 3/3)
День 31+: Подписка ОТМЕНЯЕТСЯ ✅

ИТОГО: $3 + $49 × 3 = $150 за 30 дней
```

---

**ВСЕ ФАЙЛЫ И АРХИТЕКТУРА СОБРАНЫ! ✅**

