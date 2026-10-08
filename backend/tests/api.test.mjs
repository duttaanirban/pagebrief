import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.ts';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('health and summary endpoint return JSON with configured CORS', async () => {
  await withServer({ apiKey: 'test-key', origins: ['https://pagebrief.vercel.app'],
    scrapePage: async url => ({ title: 'Article', url, text: 'Extracted article', wordCount: 80, truncated: false }),
    summarizePage: async text => { assert.equal(text, 'Extracted article'); return 'Summary of the article.'; },
  }, async base => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const response = await fetch(`${base}/api/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://pagebrief.vercel.app' }, body: JSON.stringify({ url: 'https://example.com' }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://pagebrief.vercel.app');
    assert.equal((await response.json()).summary, 'Summary of the article.');
    const preflight = await fetch(`${base}/api/summarize`, { method: 'OPTIONS', headers: { Origin: 'https://pagebrief.vercel.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  });
});
test('rejects unknown origins, malformed JSON and oversized requests', async () => {
  await withServer({ apiKey: 'test-key', origins: ['https://pagebrief.vercel.app'] }, async base => {
    assert.equal((await fetch(`${base}/api/summarize`, { method: 'POST', headers: { Origin: 'https://other.vercel.app' } })).status, 403);
    assert.equal((await fetch(`${base}/api/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(`${base}/api/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'x'.repeat(5000) }) })).status, 413);
    const invalid = await fetch(`${base}/api/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'http://127.0.0.1' }) });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /private/);
  });
});
test('missing key returns a configuration error and requests are throttled', async () => {
  await withServer({ apiKey: '' }, async base => {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${base}/api/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 503);
    }
    const limited = await fetch(`${base}/api/summarize`, { method: 'POST' });
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).error, /Too many/);
  });
});
