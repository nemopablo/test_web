// Counts taps on the call and WhatsApp buttons. No cookies, no IP address, nothing that identifies a visitor.
// "visit" is a random id made per page load, "adclick" the last 6 characters of the ad click id: both only group taps together.
const TYPES = ['call', 'whatsapp'];
const SOURCES = ['ads', 'google', 'other', 'direct', 'site'];
const DEVICES = ['mobile', 'desktop'];

const SCHEMA = `CREATE TABLE IF NOT EXISTS clicks (
  ts TEXT NOT NULL, day TEXT NOT NULL, type TEXT NOT NULL, source TEXT NOT NULL,
  device TEXT NOT NULL, country TEXT, page TEXT, browser TEXT, visit TEXT, adclick TEXT)`;

// Columns added after the table was first created.
const UPGRADES = ['browser', 'visit', 'adclick'].map((c) => `ALTER TABLE clicks ADD COLUMN ${c} TEXT`);
let upgraded = false;

// Coarse browser family only, never the full user agent.
function browserFamily(ua) {
  if (!ua) return 'none';
  if (/bot|crawl|spider|headless|lighthouse|python|curl|wget|httpclient/i.test(ua)) return 'bot';
  if (/GSA\//.test(ua)) return 'google-app';
  if (/FBAN|FBAV|Instagram/.test(ua)) return 'facebook-app';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/iPhone|iPad/.test(ua)) return /CriOS/.test(ua) ? 'ios-chrome' : /Safari/.test(ua) ? 'ios-safari' : 'ios-webview';
  if (/Android/.test(ua)) return /; wv\)/.test(ua) ? 'android-webview' : /Chrome/.test(ua) ? 'android-chrome' : 'android-other';
  if (/Windows|Macintosh|Linux/.test(ua)) return 'desktop';
  return 'other';
}

const londonDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(date);

export async function onRequestPost({ request, env }) {
  // Before the database is connected the site keeps working, clicks just aren't counted.
  if (!env.DB) return new Response(null, { status: 204 });

  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) {
    return new Response(null, { status: 403 });
  }

  let data;
  try {
    data = JSON.parse(await request.text());
  } catch (e) {
    return new Response(null, { status: 400 });
  }
  if (!data || !TYPES.includes(data.type)) return new Response(null, { status: 400 });

  const now = new Date();
  const source = SOURCES.includes(data.source) ? data.source : 'other';
  const device = DEVICES.includes(data.device) ? data.device : 'desktop';
  const page = String(data.page || '/').slice(0, 100);
  const country = (request.cf && request.cf.country) || null;
  const browser = browserFamily(request.headers.get('User-Agent'));
  const visit = /^[a-z0-9]{1,8}$/.test(data.visit || '') ? data.visit : null;
  const adclick = /^[A-Za-z0-9_-]{1,8}$/.test(data.adclick || '') ? data.adclick : null;

  if (!upgraded) {
    await env.DB.prepare(SCHEMA).run();
    for (const sql of UPGRADES) {
      try { await env.DB.prepare(sql).run(); } catch (e) { /* column already there */ }
    }
    upgraded = true;
  }

  await env.DB.batch([
    env.DB.prepare(SCHEMA),
    env.DB.prepare('INSERT INTO clicks (ts, day, type, source, device, country, page, browser, visit, adclick) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(now.toISOString(), londonDay(now), data.type, source, device, country, page, browser, visit, adclick),
  ]);
  return new Response(null, { status: 204 });
}
