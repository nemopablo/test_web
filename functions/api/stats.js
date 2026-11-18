// Click totals per day for the owner's morning summary; add ?detail=1 for individual taps (time, type, source). Requires "Authorization: Bearer <STATS_TOKEN>".
const londonDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(date);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });

export async function onRequestGet({ request, env }) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.STATS_TOKEN || auth !== `Bearer ${env.STATS_TOKEN}`) return json({ error: 'unauthorized' }, 401);
  if (!env.DB) return json({ error: 'database not connected' }, 503);

  const params = new URL(request.url).searchParams;
  const detail = params.get('detail') === '1';
  const days = Math.min(Math.max(parseInt(params.get('days'), 10) || 7, 1), 90);
  const today = londonDay(new Date());
  const from = new Date(Date.parse(today) - (days - 1) * 86400000).toISOString().slice(0, 10);

  let rows = [];
  try {
    const result = await env.DB.prepare(detail
      ? `SELECT * FROM clicks WHERE day >= ? ORDER BY ts`
      :
      `SELECT day, type, source, device, COUNT(*) AS clicks FROM clicks
       WHERE day >= ? GROUP BY day, type, source, device ORDER BY day, type, source, device`
    ).bind(from).all();
    rows = result.results;
  } catch (e) {
    // The table only appears with the first click.
    if (!/no such table/.test(String(e))) throw e;
  }
  return json({ timezone: 'Europe/London', from, to: today, rows });
}
