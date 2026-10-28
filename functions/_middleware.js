// Every other address (old .me.uk domain, www, *.pages.dev) permanently redirects to the main domain.
const CANONICAL_HOST = 'londonlocksmith24hr.co.uk';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const isPreview = url.hostname.endsWith('.locksmith24hr.pages.dev');
  if (url.hostname !== CANONICAL_HOST && !isPreview) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
