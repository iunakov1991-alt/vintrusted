// Mobile Hero VIN Input - EXACTLY FROM PROVIDED CODE
(function() {
  const vinEl = document.getElementById('mobile-hero-vin');
  const cta = document.getElementById('mobile-hero-cta');
  const cta2 = document.getElementById('mobile-hero-cta2');

  if (!vinEl || !cta || !cta2) {
    console.warn('[MOBILE-HERO] Elements not found');
    return;
  }

  function sanitizeVIN(v) {
    return (v || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/[IOQ]/g, ''); // common VIN exclusions
  }

  function isValidVIN(v) {
    return v.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
  }

  function syncButtons(enabled) {
    cta.disabled = !enabled;
    cta2.disabled = !enabled;
  }

  vinEl.addEventListener('input', () => {
    const s = sanitizeVIN(vinEl.value);
    if (vinEl.value !== s) vinEl.value = s;
    syncButtons(isValidVIN(s));
  });

  function go() {
    const vin = sanitizeVIN(vinEl.value);
    if (!isValidVIN(vin)) return;

    // Replace this with your real route
    window.location.href = `/report?vin=${encodeURIComponent(vin)}`;
  }

  cta.addEventListener('click', go);
  cta2.addEventListener('click', go);

  // nicer UX: paste VIN anywhere
  window.addEventListener('paste', (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    const s = sanitizeVIN(txt);
    if (s.length >= 10) {
      vinEl.value = s.slice(0, 17);
      syncButtons(isValidVIN(vinEl.value));
      vinEl.focus();
    }
  });

  console.log('[MOBILE-HERO] Initialized');
})();
