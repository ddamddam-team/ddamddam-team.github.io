import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const password = 'test-only-password';
function request(path, credential) {
  return new Request(`https://mockups.example${path}`, {
    headers: credential ? { Authorization: `Basic ${btoa(credential)}` } : {},
  });
}

test('unauthenticated direct HTML, resources and unknown paths never reach assets', async () => {
  for (const path of ['/mockups/place/장소2차.html', '/mockups/photo.png', '/anything', '/']) {
    for (const credential of [undefined, 'team:wrong-password', `other:${password}`]) {
      const response = await worker.fetch(request(path, credential), {
        MOCKUP_PASSWORD: password,
        ASSETS: { fetch() { assert.fail('Authentication bypass'); } },
      });
      assert.equal(response.status, 401);
      assert.ok(response.headers.get('WWW-Authenticate'));
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    }
  }
});

test('missing password and malformed authorization fail closed', async () => {
  assert.equal((await worker.fetch(request('/'), {})).status, 503);
  const req = new Request('https://mockups.example/mockups/file.html', {
    headers: { Authorization: 'Basic !!!' },
  });
  assert.equal((await worker.fetch(req, { MOCKUP_PASSWORD: password })).status, 401);
});

test('authenticated asset keeps its path and is never browser cached', async () => {
  const req = request('/mockups/place/장소2차.html', `team:${password}`);
  const response = await worker.fetch(req, {
    MOCKUP_PASSWORD: password,
    ASSETS: { async fetch(received) {
      assert.equal(received.url, req.url);
      return new Response('private mockup', { headers: { 'Cache-Control': 'public' } });
    } },
  });
  assert.equal(await response.text(), 'private mockup');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('root redirects only after authentication', async () => {
  const response = await worker.fetch(request('/', `team:${password}`), { MOCKUP_PASSWORD: password });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/mockups/');
});

test('catalog routes also require authentication and resolve generated pages', async () => {
  for (const [path, asset] of [['/mockups/', '/.catalog/index.html'], ['/mockups/place/', '/.catalog/place.html']]) {
    const env = { MOCKUP_PASSWORD: password, ASSETS: { async fetch(req) {
      assert.equal(new URL(req.url).pathname, asset);
      return new Response('catalog');
    } } };
    assert.equal((await worker.fetch(request(path), env)).status, 401);
    const response = await worker.fetch(request(path, `team:${password}`), env);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'catalog');
  }
});
