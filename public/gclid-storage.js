/**
 * GCLID Storage - сохранение и восстановление gclid для отложенных конверсий
 * 
 * Проблема: если пользователь начал с Google Ads, но завершил покупку позже
 * (через закладку, прямой ввод URL и т.д.), gclid теряется.
 * 
 * Решение: сохраняем gclid в localStorage при первом визите,
 * восстанавливаем при конверсии.
 */

(function() {
  'use strict';

  const GCLID_KEY = 'vintrusted_gclid';
  const GCLID_TIMESTAMP_KEY = 'vintrusted_gclid_timestamp';
  const GCLID_TTL = 90 * 24 * 60 * 60 * 1000; // 90 дней

  /**
   * Сохраняет gclid из URL в localStorage
   */
  function saveGclidFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get('gclid');

    if (gclid) {
      localStorage.setItem(GCLID_KEY, gclid);
      localStorage.setItem(GCLID_TIMESTAMP_KEY, Date.now().toString());
      console.log('[GCLID-STORAGE] ✅ Saved gclid:', gclid);
      return gclid;
    }

    return null;
  }

  /**
   * Восстанавливает gclid из localStorage (если не истек TTL)
   */
  function restoreGclid() {
    const gclid = localStorage.getItem(GCLID_KEY);
    const timestamp = localStorage.getItem(GCLID_TIMESTAMP_KEY);

    if (!gclid || !timestamp) {
      console.log('[GCLID-STORAGE] ❌ No stored gclid');
      return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > GCLID_TTL) {
      console.log('[GCLID-STORAGE] ⏰ Stored gclid expired');
      localStorage.removeItem(GCLID_KEY);
      localStorage.removeItem(GCLID_TIMESTAMP_KEY);
      return null;
    }

    console.log('[GCLID-STORAGE] ✅ Restored gclid:', gclid, `(age: ${Math.round(age / 1000 / 60)} minutes)`);
    return gclid;
  }

  /**
   * Получает текущий gclid (из URL или localStorage)
   */
  function getGclid() {
    // Сначала проверяем URL
    const urlParams = new URLSearchParams(window.location.search);
    const gclidFromUrl = urlParams.get('gclid');
    if (gclidFromUrl) {
      return gclidFromUrl;
    }

    // Если в URL нет - восстанавливаем из localStorage
    return restoreGclid();
  }

  /**
   * Очищает gclid из localStorage
   */
  function clearGclid() {
    localStorage.removeItem(GCLID_KEY);
    localStorage.removeItem(GCLID_TIMESTAMP_KEY);
    console.log('[GCLID-STORAGE] 🗑️ Cleared gclid');
  }

  // Автоматически сохраняем gclid при загрузке страницы
  saveGclidFromUrl();

  // Экспортируем в глобальную область видимости
  window.GclidStorage = {
    save: saveGclidFromUrl,
    restore: restoreGclid,
    get: getGclid,
    clear: clearGclid
  };

  console.log('[GCLID-STORAGE] 📦 Initialized');
})();
