import { pathToFileURL } from 'node:url';

export async function monitor(frontend, api, fetcher = fetch) {
  const origin = (value) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
        || url.pathname !== '/' || !url.hostname.includes('.')
        || ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      throw new Error('Monitoring requires public HTTPS origins without credentials or paths.');
    }
    return url.origin;
  };
  const frontendOrigin = origin(frontend);
  const apiOrigin = origin(api);
  const options = { redirect: 'error', signal: AbortSignal.timeout(15_000) };
  const page = await fetcher(frontendOrigin, { ...options, method: 'HEAD' });
  if (page.status !== 200 || !page.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Frontend check failed: HTTP ${page.status}`);
  }
  for (const probe of ['liveness', 'readiness']) {
    const response = await fetcher(`${apiOrigin}/actuator/health/${probe}`, {
      redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' },
    });
    if (response.status !== 200) throw new Error(`${probe} check failed: HTTP ${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 4096) throw new Error('Health response exceeds allowed size');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (data.status !== 'UP') throw new Error(`${probe} is not UP`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await monitor(process.env.PUBLIC_FRONTEND_ORIGIN, process.env.PUBLIC_API_ORIGIN);
    console.log('PASS frontend, API liveness and database readiness');
  } catch (error) {
    // No response bodies, request credentials or network exception messages in job logs.
    console.error('Production monitor failed:', error instanceof Error ? error.name : 'UnknownError');
    process.exitCode = 1;
  }
}
