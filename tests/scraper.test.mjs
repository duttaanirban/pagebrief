import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl, extractText, scrape, summarizeText, readLimited } from '../lib/scraper.ts';

const article = '<html><title>Title</title><body><nav>Unwanted navigation</nav><article><h1>Useful article</h1><p>' + 'This article explains a useful topic with concrete details. '.repeat(8) + '</p><script>malicious code</script></article><footer>Unwanted footer</footer></body></html>';
function mockPage(pageResponse, address = '93.184.216.34') {
  return async input => String(input).startsWith('https://cloudflare-dns.com/')
    ? Response.json({ Status: 0, Answer: [{ type: 1, data: address }] }) : pageResponse();
}
test('rejects unsafe schemes, credentials, local IP variants and ports', () => {
  for (const value of ['file:///etc/passwd', 'http://localhost', 'http://127.1', 'http://2130706433', 'http://10.0.0.1', 'http://169.254.169.254', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'https://user:pass@example.com', 'https://example.com:8080']) assert.throws(() => publicUrl(value));
  assert.equal(publicUrl('https://example.com/article#part').href, 'https://example.com/article');
});
test('extracts article content and removes scripts and page chrome', () => {
  const result = extractText(article);
  assert.equal(result.title, 'Useful article');
  assert.match(result.text, /useful topic/);
  assert.doesNotMatch(result.text, /Unwanted|malicious/);
  assert.ok(result.wordCount > 50);
  assert.equal(result.truncated, false);
  assert.throws(() => extractText('<body><p>Empty</p></body>'));
});
test('bounds long text and streamed HTML size', async () => {
  assert.equal(extractText('<article><p>' + 'word '.repeat(5000) + '</p></article>').truncated, true);
  await assert.rejects(readLimited(new Response('long payload'), 5), /too large/);
});
test('scrapes public HTML but rejects private DNS, unsafe redirects and files', async () => {
  const result = await scrape('https://example.com', mockPage(() => new Response(article, { headers: { 'content-type': 'text/html' } })));
  assert.equal(result.title, 'Useful article');
  await assert.rejects(scrape('https://example.com', mockPage(() => new Response(article), '10.0.0.1')), /private/);
  await assert.rejects(scrape('https://example.com', mockPage(() => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }))), /private/);
  await assert.rejects(scrape('https://example.com', mockPage(() => new Response('PDF', { headers: { 'content-type': 'application/pdf' } }))), /Only HTML/);
});
test('passes extracted content to Groq and handles quota and empty responses', async () => {
  const summary = await summarizeText('Source text', 'test-key', 'test-model', async (url, init) => {
    assert.equal(String(url), 'https://api.groq.com/openai/v1/chat/completions');
    const payload = JSON.parse(init.body);
    assert.match(payload.messages[1].content, /Source text/);
    assert.equal(payload.model, 'test-model');
    return Response.json({ choices: [{ message: { content: 'A short summary.' } }] });
  });
  assert.equal(summary, 'A short summary.');
  await assert.rejects(summarizeText('source', 'key', 'model', async () => new Response(null, { status: 429 })), /quota/);
  await assert.rejects(summarizeText('source', 'key', 'model', async () => Response.json({ choices: [] })), /empty summary/);
});
