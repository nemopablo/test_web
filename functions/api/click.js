// Counts taps on the call and WhatsApp buttons. No cookies, no IP address, nothing that identifies a visitor.
const TYPES = ['call', 'whatsapp'];
const SOURCES = ['ads', 'google', 'other', 'direct', 'site'];
const DEVICES = ['mobile', 'desktop'];

const SCHEMA = `CREATE TABLE IF NOT EXISTS clicks (
  ts TEXT NOT NULL, day TEXT NOT NULL, type TEXT NOT NULL, source TEXT NOT NULL,
  device TEXT NOT NULL, country TEXT, page TEXT)`;

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

  await env.DB.batch([
    env.DB.prepare(SCHEMA),
    env.DB.prepare('INSERT INTO clicks (ts, day, type, source, device, country, page) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(now.toISOString(), londonDay(now), data.type, source, device, country, page),
  ]);
  return new Response(null, { status: 204 });
}
