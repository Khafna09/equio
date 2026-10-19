import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadOptions, runReadLoad } from './load-smoke.mjs';

test('rejects unconfirmed remote origins, credentials and unbounded load', () => {
  const defaults = { LOAD_ACCESS_TOKENS: 'disposable-test-token' };
  for (const env of [
    { LOAD_API_ORIGIN: 'https://api.example.com' },
    { LOAD_API_ORIGIN: 'http://user:password@localhost:8189' },
    { LOAD_API_ORIGIN: 'http://localhost:8189/api/v1' },
    { LOAD_CONCURRENCY: '1000' }, { LOAD_DURATION_SECONDS: '600' }, { LOAD_PAUSE_MS: '0' },
  ]) assert.throws(() => loadOptions({ ...defaults, ...env }));
  assert.throws(() => loadOptions({}));
  assert.equal(loadOptions({ ...defaults, LOAD_API_ORIGIN: 'https://staging.example.com',
    LOAD_STAGING_ORIGIN_CONFIRMATION: 'https://staging.example.com' }).origin, 'https://staging.example.com');
});

test('measures only bounded read routes without retaining tokens or response data', async () => {
  let clock = 0;
  const requests = [];
  const result = await runReadLoad(loadOptions({ LOAD_ACCESS_TOKENS: 'test-secret-token',
    LOAD_CONCURRENCY: '1', LOAD_DURATION_SECONDS: '5' }), {
    now: () => clock, sleep: async (ms) => { clock += ms; },
    fetcher: async (url, options) => {
      requests.push({ url, method: options.method, redirect: options.redirect });
      return new Response('{"private":"do-not-log"}', { status: 200 });
    },
  });
  assert.equal(result.requests, 5);
  assert.equal(result.distinctTokens, 1);
  assert.ok(requests.every((request) => request.method === 'GET' && request.redirect === 'error'));
  assert.ok(requests.every((request) => /\/(movements\/page|dashboard\/summary)\?/.test(request.url)));
  assert.doesNotMatch(JSON.stringify(result), /test-secret|private|do-not-log/);
});

test('stops on authentication or rate limiting rather than claiming capacity', async () => {
  let clock = 0;
  const result = await runReadLoad(loadOptions({ LOAD_ACCESS_TOKENS: 'test-token', LOAD_CONCURRENCY: '1' }), {
    now: () => clock, sleep: async (ms) => { clock += ms; },
    fetcher: async () => new Response('{}', { status: 429 }),
  });
  assert.equal(result.requests, 1);
  assert.equal(result.statusCounts[429], 1);
});
