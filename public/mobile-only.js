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
   * Инициализация PDF viewer для мобилки
   * Инициализирует мобильный PDF viewer после загрузки страницы
   */
  function initMobilePdfViewer() {
    // Ждем загрузки PDF.js и vin-pdf-stack.js
    if (typeof pdfjsLib === 'undefined') {
      console.log('[MOBILE-ONLY] PDF.js not loaded yet, will retry');
      setTimeout(initMobilePdfViewer, 500);
      return;
    }
    
    // Проверяем наличие мобильного PDF контейнера
    var mobilePdfRoot = document.querySelector('.mobile-only .mobile-pdf-stack');
    if (!mobilePdfRoot) {
      console.log('[MOBILE-ONLY] Mobile PDF stack container not found');
      return;
    }
    
    // Мобильный PDF viewer будет инициализирован автоматически скриптом vin-pdf-stack.js
    // Но нужно убедиться, что он использует правильные ID
    // Для этого можно переименовать ID или использовать отдельную инициализацию
    console.log('[MOBILE-ONLY] Mobile PDF stack container found, initialization will be handled by vin-pdf-stack.js');
  }
  
  /**
   * Инициализация
   */
  function init() {
    setMobileThemeColor();
    initVinForm();
    // PDF viewer будет инициализирован автоматически скриптом vin-pdf-stack.js
    // Но нужно убедиться, что он работает с мобильными элементами
    // Для этого можно использовать те же ID или создать отдельную инициализацию
    console.log('[MOBILE-ONLY] Initialization complete');
  }
  
  // Запуск при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
