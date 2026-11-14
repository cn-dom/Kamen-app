import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/api/index.js';

test('API staging exposes only a non-sensitive health response', async () => {
  const response = await worker.fetch(new Request('https://api.example.test/api/health'), {}, {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.storage, 'D1');
});

test('API fails closed when Cloudflare Access is not configured', async () => {
  const response = await worker.fetch(new Request('https://api.example.test/api/me'), {}, {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error, /Cloudflare Access/i);
});
