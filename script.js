(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var notice = document.getElementById('cookie-notice');
  var ok = document.getElementById('cookie-ok');
  if (!notice || !ok) return;

  var seen = false;
  try { seen = localStorage.getItem('cookieNoticeSeen') === '1'; } catch (e) {}
  if (!seen) notice.hidden = false;

  ok.addEventListener('click', function () {
    notice.hidden = true;
    try { localStorage.setItem('cookieNoticeSeen', '1'); } catch (e) {}
  });
})();
