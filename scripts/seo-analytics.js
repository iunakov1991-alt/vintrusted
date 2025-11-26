// scripts/seo-analytics.js
// Раздельная аналитика для EN / ES веток (GA + Ads / FB / etc.)

const DEFAULTS = {
  en: {
    gaMeasurementId: process.env.SEO_EN_GA_MEASUREMENT_ID || "",
    gAdsId: process.env.SEO_EN_GOOGLE_ADS_ID || "",
    fbPixelId: process.env.SEO_EN_FB_PIXEL_ID || "",
  },
  es: {
    gaMeasurementId: process.env.SEO_ES_GA_MEASUREMENT_ID || "",
    gAdsId: process.env.SEO_ES_GOOGLE_ADS_ID || "",
    fbPixelId: process.env.SEO_ES_FB_PIXEL_ID || "",
  },
};

function normalizeLang(lang) {
  const lc = String(lang || "en").toLowerCase();
  if (lc.startsWith("es")) return "es";
  return "en";
}

function getAnalyticsForLang(lang) {
  const key = normalizeLang(lang);
  return DEFAULTS[key] || DEFAULTS.en;
}

// Простая сборка трекинг-кода, без тяжёлых библиотек
function renderAnalyticsSnippet(lang) {
  const { gaMeasurementId, gAdsId, fbPixelId } = getAnalyticsForLang(lang);
  const parts = [];

  if (gaMeasurementId) {
    parts.push(`
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaMeasurementId}', { 'anonymize_ip': true });
</script>
`);
  }

  if (gAdsId) {
    parts.push(`
<!-- Google Ads -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('config', '${gAdsId}');
</script>
`);
  }

  if (fbPixelId) {
    parts.push(`
<!-- Meta/Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${fbPixelId}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img alt="" height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1"
  />
</noscript>
`);
  }

  return parts.join("\n");
}

module.exports = {
  getAnalyticsForLang,
  renderAnalyticsSnippet,
};
