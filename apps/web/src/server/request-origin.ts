export function isSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  // Next can normalize the internal URL to localhost. Use the actual HTTP Host
  // for browser-origin checks, without trusting forwarded-host headers.
  const host = request.headers.get("host") ?? url.host;
  return request.headers.get("origin") === `${url.protocol}//${host}`;
}
