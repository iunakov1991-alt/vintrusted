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
   * Инициализация
   */
  function init() {
    setMobileThemeColor();
    console.log('[MOBILE-ONLY] Initialization complete');
  }
  
  // Запуск при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
