import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monitor } from './monitor-production.mjs';

const page = () => new Response(null, { status: 200, headers: { 'Content-Type': 'text/html' } });
const healthy = () => Response.json({ status: 'UP' });

test('checks frontend and both public sanitized probes', async () => {
  const calls = [];
  await monitor('https://app.example.test', 'https://api.example.test', async (url, options) => {
    calls.push([url, options.redirect]);
    return calls.length === 1 ? page() : healthy();
  });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([, redirect]) => redirect === 'error'));
});

test('rejects credentials, invalid origins, failed probes and oversized health payloads', async () => {
  await assert.rejects(monitor('http://localhost', 'https://api.example.test'));
  await assert.rejects(monitor('https://secret@app.example.test', 'https://api.example.test'));
  for (const bad of [new Response(null, { status: 503 }), Response.json({ status: 'DOWN' }),
    new Response('x'.repeat(4097))]) {
    let calls = 0;
    await assert.rejects(monitor('https://app.example.test', 'https://api.example.test', async () => ++calls === 1 ? page() : bad));
  }
});
