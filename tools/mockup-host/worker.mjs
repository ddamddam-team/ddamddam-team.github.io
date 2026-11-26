const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

async function matches(a, b) {
  const encoder = new TextEncoder();
  const digest = value => crypto.subtle.digest('SHA-256', encoder.encode(value));
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  const x = new Uint8Array(left), y = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}

export default {
  async fetch(request, env) {
    if (!env.MOCKUP_PASSWORD) {
      return new Response('접근 설정이 완료되지 않았습니다.', { status: 503, headers });
    }
    let credentials = '';
    const authorization = request.headers.get('Authorization') || '';
    if (/^Basic /i.test(authorization)) {
      try { credentials = atob(authorization.slice(6)); } catch { /* Reject malformed input. */ }
    }
    if (!await matches(credentials, `team:${env.MOCKUP_PASSWORD}`)) {
      return new Response('팀 공유 비밀번호를 입력해주세요.', {
        status: 401,
        headers: { ...headers, 'WWW-Authenticate': 'Basic realm="OWW team mockups", charset="UTF-8"' },
      });
    }
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/mockups') {
      return new Response(null, {
        status: 302,
        headers: { ...headers, Location: '/mockups/' },
      });
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
    }
    // No asset request can run before the authentication check above.
    if (url.pathname === '/mockups/') url.pathname = '/.catalog/index.html';
    else {
      const project = url.pathname.match(/^\/mockups\/([^/]+)\/$/);
      if (project) url.pathname = `/.catalog/${project[1]}.html`;
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
    return result;
  },
};
