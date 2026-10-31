(function () {
  // The technical *.pages.dev address serves the same site: send visitors to the real domain.
  if (location.hostname.slice(-10) === '.pages.dev') {
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      location.replace(new URL(location.pathname + location.hash, canonical.href).href);
      return;
    }
  }

  // ---- Tracking settings: fill these in before launching ads ----
  var GA_ID = '';                 // Google Analytics 4, e.g. 'G-XXXXXXXXXX'
  var ADS_ID = 'AW-18540395911';              // Google Ads, e.g. 'AW-123456789'
  var ADS_CALL_LABEL = 'XYkgCLnmm60dEIf734hF';      // Google Ads conversion label for phone clicks
  var ADS_WHATSAPP_LABEL = 'fZsECLzmm60dEIf734hF';  // Google Ads conversion label for WhatsApp clicks
  // ---------------------------------------------------------------

  var CONSENT_KEY = 'cookieConsent';
  var trackingConfigured = !!(GA_ID || ADS_ID);

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Our own click counter: works without consent because it sets no cookies,
  // stores nothing in the browser and sends nothing that identifies the visitor.
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || !navigator.sendBeacon) return;
    var href = link.getAttribute('href');
    var type = href.indexOf('tel:') === 0 ? 'call' : href.indexOf('wa.me') !== -1 ? 'whatsapp' : '';
    if (!type) return;

    var params = new URLSearchParams(location.search);
    var referrerHost = '';
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (err) {}
    var source = params.has('gclid') || params.has('gbraid') || params.has('wbraid') ? 'ads'
      : !referrerHost ? 'direct'
      : referrerHost === location.hostname ? 'site'
      : /(^|\.)google\./.test(referrerHost) ? 'google'
      : 'other';

    navigator.sendBeacon('/api/click', JSON.stringify({
      type: type,
      source: source,
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      page: location.pathname
    }));
  });

  var notice = document.getElementById('cookie-notice');
  var accept = document.getElementById('cookie-accept');
  var reject = document.getElementById('cookie-reject');
  var settingsLinks = document.querySelectorAll('a[href$="#cookie-settings"]');

  // Until tracking IDs are set there is nothing to consent to, so the
  // banner and the "Cookie settings" link stay hidden.
  if (!trackingConfigured) {
    settingsLinks.forEach(function (link) { link.hidden = true; });
    return;
  }

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Nothing from Google is loaded until the visitor accepts.
  var trackingLoaded = false;
  function loadTracking() {
    if (trackingLoaded) return;
    trackingLoaded = true;

    gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    gtag('js', new Date());
    if (GA_ID) gtag('config', GA_ID);
    if (ADS_ID) gtag('config', ADS_ID);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID || ADS_ID);
    document.head.appendChild(s);
  }

  function clearTrackingCookies() {
    var host = location.hostname;
    var domains = [host, '.' + host, '.' + host.split('.').slice(-2).join('.'), '.' + host.split('.').slice(-3).join('.')];
    document.cookie.split(';').forEach(function (pair) {
      var name = pair.split('=')[0].trim();
      if (!/^(_ga|_gcl|_gid|_gat)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
      });
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  }

  // Count taps on the call and WhatsApp buttons (only after consent).
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || !trackingLoaded) return;
    var href = link.getAttribute('href');
    if (href.indexOf('tel:') === 0) {
      gtag('event', 'click_call');
      if (ADS_ID && ADS_CALL_LABEL) gtag('event', 'conversion', { send_to: ADS_ID + '/' + ADS_CALL_LABEL });
    } else if (href.indexOf('wa.me') !== -1) {
      gtag('event', 'click_whatsapp');
      if (ADS_ID && ADS_WHATSAPP_LABEL) gtag('event', 'conversion', { send_to: ADS_ID + '/' + ADS_WHATSAPP_LABEL });
    }
  });

  // Consent banner
  if (getConsent() === 'granted') loadTracking();
  if (!notice || !accept || !reject) return;

  if (!getConsent() || location.hash === '#cookie-settings') notice.hidden = false;

  accept.addEventListener('click', function () {
    setConsent('granted');
    notice.hidden = true;
    loadTracking();
  });

  reject.addEventListener('click', function () {
    var wasGranted = getConsent() === 'granted';
    setConsent('denied');
    notice.hidden = true;
    if (wasGranted) {
      clearTrackingCookies();
      location.reload();
    }
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href$="#cookie-settings"]') : null;
    if (!link) return;
    e.preventDefault();
    notice.hidden = false;
  });
})();
