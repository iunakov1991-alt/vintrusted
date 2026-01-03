/**
 * MOBILE-ONLY JAVASCRIPT
 * ======================
 * Все функции будут добавляться по мере разработки
 */

(function() {
  'use strict';
  
  // Проверка мобильного устройства
  var isMobile = document.documentElement.classList.contains('mobile-device');
  
  if (!isMobile) {
    console.log('[MOBILE-ONLY] Not a mobile device, exiting');
    return;
  }
  
  console.log('[MOBILE-ONLY] Mobile device detected, ready for initialization');
  
  /**
   * A/B ТЕСТ: Кружок с ценой
   * =======================
   * Варианты:
   * A (control): без кружка с ценой
   * B (variant): с кружком с ценой
   */
  var AB_TEST_NAME = 'price_badge_test';
  var AB_TEST_STORAGE_KEY = 'ab_test_price_badge';
  
  function getABTestVariant() {
    // Проверяем localStorage
    var stored = localStorage.getItem(AB_TEST_STORAGE_KEY);
    if (stored) {
      console.log('[AB-TEST] Existing variant:', stored);
      return stored;
    }
    
    // Случайное распределение 50/50
    var variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(AB_TEST_STORAGE_KEY, variant);
    console.log('[AB-TEST] New variant assigned:', variant);
    
    // Отправляем событие в GTM
    if (window.dataLayer) {
      window.dataLayer.push({
        'event': 'ab_test_assigned',
        'ab_test_name': AB_TEST_NAME,
        'ab_test_variant': variant,
        'timestamp': new Date().toISOString()
      });
      console.log('[AB-TEST] Event sent to GTM: ab_test_assigned, variant:', variant);
    }
    
    return variant;
  }
  
  function applyABTest() {
    var variant = getABTestVariant();
    var priceBadge = document.querySelector('.mobile-price-badge');
    
    if (variant === 'A' && priceBadge) {
      // Вариант A: скрываем кружок
      priceBadge.style.display = 'none';
      console.log('[AB-TEST] Variant A: Price badge hidden');
    } else if (variant === 'B' && priceBadge) {
      // Вариант B: показываем кружок (уже показан по умолчанию)
      priceBadge.style.display = 'flex';
      console.log('[AB-TEST] Variant B: Price badge visible');
    }
    
    // Отправляем событие показа страницы с вариантом
    if (window.dataLayer) {
      window.dataLayer.push({
        'event': 'ab_test_page_view',
        'ab_test_name': AB_TEST_NAME,
        'ab_test_variant': variant,
        'timestamp': new Date().toISOString()
      });
    }
    
    return variant;
  }
  
  function trackABTestConversion() {
    var variant = getABTestVariant();
    
    if (window.dataLayer) {
      window.dataLayer.push({
        'event': 'ab_test_conversion',
        'ab_test_name': AB_TEST_NAME,
        'ab_test_variant': variant,
        'conversion_type': 'vin_form_submit',
        'timestamp': new Date().toISOString()
      });
      console.log('[AB-TEST] Conversion tracked for variant:', variant);
    }
  }
  
  /**
   * Установить theme-color для мобилки (светло-серый)
   */
  function setMobileThemeColor() {
    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#F7F8FA');
      console.log('[MOBILE-ONLY] Theme color set to #F7F8FA');
    }
  }
  
  /**
   * Автовставка VIN из буфера обмена
   */
  function autoFillVinFromClipboard() {
    var input = document.getElementById('mobile-vin-input');
    if (!input) return;
    
    // Проверяем поддержку Clipboard API
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(function(text) {
          // Проверяем, похоже ли на VIN (17 символов, только разрешенные символы)
          var cleaned = text.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
          if (cleaned.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
            input.value = cleaned;
            console.log('[MOBILE-ONLY] VIN auto-filled from clipboard:', cleaned);
            // Trigger input event для обновления border
            var event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
          }
        })
        .catch(function(err) {
          // Игнорируем ошибки (пользователь мог не дать разрешение)
          console.log('[MOBILE-ONLY] Clipboard read failed (expected):', err.message);
        });
    }
  }
  
  /**
   * Обновление прогресс-бара ввода VIN (только мобилка)
   */
  function updateVinInputProgress(input) {
    var value = input.value.trim().toUpperCase();
    var length = value.length;
    var progress = Math.min(length / 17, 1); // 17 символов = 100%
    
    // Цветовой градиент от синего к зеленому
    if (length === 0) {
      input.style.borderColor = '#3B82F6'; // Синий по умолчанию
    } else if (length < 17) {
      // Оранжевый во время ввода
      input.style.borderColor = '#f59e0b';
    } else if (length === 17) {
      // Зеленый когда 17 символов
      input.style.borderColor = '#10b981';
    } else {
      // Красный если больше 17
      input.style.borderColor = '#ef4444';
    }
  }
  
  /**
   * Обработчик формы ввода VIN
   */
  function initVinForm() {
    var form = document.getElementById('mobile-vin-form');
    var input = document.getElementById('mobile-vin-input');
    var button = form ? form.querySelector('.mobile-check-btn') : null;
    
    if (!form || !input || !button) {
      console.log('[MOBILE-ONLY] VIN form elements not found');
      return;
    }
    
    // Автовставка из буфера обмена при фокусе (только если поле пустое)
    input.addEventListener('focus', function() {
      if (!input.value.trim()) {
        autoFillVinFromClipboard();
      }
    });
    
    // Обработчик ввода для прогресс-бара
    input.addEventListener('input', function() {
      updateVinInputProgress(input);
    });
    
    // Обработчик отправки формы
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var vin = input.value.trim().toUpperCase();
      
      if (!vin) {
        input.focus();
        return;
      }
      
      // Валидация VIN (17 символов)
      if (vin.length !== 17) {
        alert('VIN code must be 17 characters long');
        input.focus();
        return;
      }
      
      // Отслеживаем конверсию A/B теста
      trackABTestConversion();
      
      // Редирект на страницу отчета
      window.location.href = '/report.html?vin=' + encodeURIComponent(vin);
    });
    
    // Обработчик клика по кнопке
    button.addEventListener('click', function(e) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    });
    
    console.log('[MOBILE-ONLY] VIN form initialized');
  }
  
  /**
   * Инициализация кнопки "Check VIN" на втором экране
   * Скроллит к форме на первом экране
   */
  function initSampleCheckButton() {
    var button = document.getElementById('mobile-sample-check-btn');
    if (!button) {
      console.log('[MOBILE-ONLY] Sample check button not found');
      return;
    }
    
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Находим форму на первом экране
      var form = document.querySelector('.mobile-only .mobile-vin-form');
      if (form) {
        // Плавный скролл к форме
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Фокус на поле ввода через небольшую задержку
        setTimeout(function() {
          var input = document.getElementById('mobile-vin-input');
          if (input) {
            input.focus();
          }
        }, 500);
      }
    });
    
    console.log('[MOBILE-ONLY] Sample check button initialized');
  }
  
  
  /**
   * Инициализация
   */
  function init() {
    setMobileThemeColor();
    applyABTest(); // Применяем A/B тест
    initVinForm();
    initSampleCheckButton();
    console.log('[MOBILE-ONLY] Initialization complete');
  }
  
  // Запуск при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
