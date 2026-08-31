import test from 'node:test';
import assert from 'node:assert/strict';
import { safeFetch } from '../src/http.js';

test('HEAD ignores the Content-Length describing a GET representation', async () => {
  const fetcher = (async () => new Response(null, { headers: { 'content-length': '100000' } })) as typeof fetch;
  const result = await safeFetch(fetcher, 'https://example.com/asset', { method: 'HEAD', maxBytes: 1 });
  assert.equal(result.response.status, 200);
  assert.equal(result.text, '');
});

test('GET still rejects a body exceeding the declared size limit', async () => {
  const fetcher = (async () => new Response('oversized', { headers: { 'content-length': '9' } })) as typeof fetch;
  await assert.rejects(safeFetch(fetcher, 'https://example.com/asset', { maxBytes: 1 }), /safety limit/);
});