import { pathToFileURL } from 'node:url';

const routes = ['movements/page?size=50', 'dashboard/summary?period=MONTH'];

export function loadOptions(env) {
  const url = new URL(env.LOAD_API_ORIGIN ?? 'http://localhost:8189');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
      || !['http:', 'https:'].includes(url.protocol)
      || (!local && (url.protocol !== 'https:' || env.LOAD_STAGING_ORIGIN_CONFIRMATION !== url.origin))) {
    throw new Error('Load tests require loopback or an explicitly confirmed HTTPS staging origin');
  }
  const tokens = (env.LOAD_ACCESS_TOKENS ?? '').split(',').map((token) => token.trim()).filter(Boolean);
  const concurrency = Number(env.LOAD_CONCURRENCY ?? 2);
  const durationSeconds = Number(env.LOAD_DURATION_SECONDS ?? 15);
  const pauseMs = Number(env.LOAD_PAUSE_MS ?? 1000);
  if (!tokens.length || tokens.length > 20 || tokens.some((token) => token.length > 4096 || /\s/.test(token))
      || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10
      || !Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 60
      || !Number.isInteger(pauseMs) || pauseMs < 200 || pauseMs > 5000) {
    throw new Error('Invalid bounded load configuration');
  }
  return { origin: url.origin, tokens, concurrency, durationMs: durationSeconds * 1000, pauseMs };
}

async function consume(response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 512 * 1024) throw new Error('Response exceeds measurement limit');
    }
  } finally { await reader.cancel(); }
}

function percentile(samples, fraction) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted.length ? Math.round(sorted[Math.ceil(sorted.length * fraction) - 1]) : null;
}

export async function runReadLoad(options, {
  fetcher = fetch, now = () => performance.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const start = now();
  const samples = [];
  const statusCounts = {};
  const endpoints = Object.fromEntries(routes.map((route) => [route.split('?')[0], { samples: [], errors: 0 }]));
  let stop = false;
  let networkErrors = 0;
  await Promise.all(Array.from({ length: options.concurrency }, async (_, worker) => {
    let iteration = 0;
    while (!stop && now() - start < options.durationMs) {
      const route = routes[(worker + iteration++) % routes.length];
      const endpoint = endpoints[route.split('?')[0]];
      const began = now();
      try {
        const response = await fetcher(`${options.origin}/api/v1/${route}`, {
          method: 'GET', redirect: 'error', signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${options.tokens[worker % options.tokens.length]}`, Accept: 'application/json' },
        });
        await consume(response);
        statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
        if (response.status !== 200) endpoint.errors++;
        // Expiration/rate limiting is not server capacity; do not keep hammering those responses.
        if (response.status === 401 || response.status === 403 || response.status === 429) stop = true;
      } catch {
        networkErrors++;
        endpoint.errors++;
      }
      const duration = now() - began;
      samples.push(duration);
      endpoint.samples.push(duration);
      await sleep(options.pauseMs);
    }
  }));
  const elapsedSeconds = (now() - start) / 1000;
  return {
    concurrentWorkers: options.concurrency, distinctTokens: new Set(options.tokens).size,
    elapsedSeconds: Math.round(elapsedSeconds * 10) / 10, requests: samples.length,
    requestsPerSecond: Math.round(samples.length / elapsedSeconds * 100) / 100,
    p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), statusCounts, networkErrors,
    endpoints: Object.fromEntries(Object.entries(endpoints).map(([route, result]) => [route, {
      requests: result.samples.length, errors: result.errors, p95Ms: percentile(result.samples, 0.95),
    }])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runReadLoad(loadOptions(process.env));
    console.log(JSON.stringify(result, null, 2));
    if (result.networkErrors || Object.keys(result.statusCounts).some((status) => status !== '200')) process.exitCode = 1;
  } catch {
    console.error('Load measurement failed: check disposable staging configuration; credentials and response bodies are not logged.');
    process.exitCode = 1;
  }
}
