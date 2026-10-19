import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = process.env.E2E_API_BASE_URL ?? 'http://localhost:8081/api/v1';
const password = 'Only-Disposable-Test-2026!';
const email = (name: string) => `e2e-${name}-${randomUUID()}@test.example`;
const accountA = { email: email('a'), password, firstName: 'Angela', lastName: 'Audit', language: 'es' };
const accountB = { email: email('b'), password, firstName: 'Bruno', lastName: 'Audit', language: 'en' };

async function register(request: APIRequestContext, account = accountA) {
  const csrf = await (await request.get(`${api}/auth/csrf`)).json();
  return request.post(`${api}/auth/sign-up`, { data: account, headers: { 'X-XSRF-TOKEN': csrf.token } });
}

async function signIn(page: Page, account = accountA) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: /Iniciar sesi\u00f3n|Sign in/i }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`(Hola|Hello), ${account.firstName}`) })).toBeVisible();
}

test.beforeAll(async ({ request }) => {
  expect((await register(request, accountA)).status()).toBe(202);
  expect((await register(request, accountB)).status()).toBe(202);
});

test('registration has a uniform acknowledgement and explicit sign-in', async ({ page, request }) => {
  const duplicate = await register(request, accountA);
  const freshAccount = { ...accountA, email: email('new') };
  const fresh = await register(request, freshAccount);
  expect(duplicate.status()).toBe(202);
  expect(await duplicate.json()).toEqual(await fresh.json());
  await page.goto('/register');
  await page.getByLabel('Nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Apellido', { exact: true }).fill('Audit');
  await page.locator('input[type=email]').fill(accountA.email);
  await page.locator('input[type=password]').fill('Different-Password-2026!');
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Solicitud procesada');
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('link', { name: 'Iniciar sesi\u00f3n', exact: true }).click();
  await signIn(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Espa\u00f1ol', exact: true }).click();
  const savedEnglish = page.waitForResponse((response) => response.url().endsWith('/profiles/me')
    && response.request().method() === 'PUT' && response.status() === 200);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await savedEnglish;
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const savedSpanish = page.waitForResponse((response) => response.url().endsWith('/profiles/me')
    && response.request().method() === 'PUT' && response.status() === 200);
  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  await savedSpanish;
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('uncategorized movement can be created, edited from dashboard and removed', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Nuevo movimiento', exact: true }).click();
  await page.locator('input[type=number]').fill('42.50');
  await page.getByPlaceholder('Nota (opcional)').fill('E2E movimiento caf\u00e9');
  await page.getByRole('button', { name: /Guardar gasto/i }).click();
  await expect(page.getByText('E2E movimiento caf\u00e9', { exact: true })).toBeVisible();
  await expect(page.locator('.echarts-for-react svg path').first()).toBeVisible();
  await page.getByText('E2E movimiento caf\u00e9', { exact: true }).click();
  await page.locator('input[type=number]').fill('45.50');
  await page.getByRole('button', { name: /Guardar cambios/i }).click();
  await page.getByText('E2E movimiento caf\u00e9', { exact: true }).click();
  await expect(page.locator('input[type=number]')).toHaveValue('45.5');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('E2E movimiento caf\u00e9', { exact: true })).toHaveCount(0);
});

test('tabs serialize refresh, synchronize account changes and logout without Web Storage tokens', async ({ page, context }) => {
  await signIn(page);
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('heading', { name: 'Hola, Angela' })).toBeVisible();
  let inflight = 0;
  let maxInflight = 0;
  const statuses: number[] = [];
  context.on('request', (request) => {
    if (request.url().endsWith('/auth/refresh')) maxInflight = Math.max(maxInflight, ++inflight);
  });
  context.on('requestfinished', (request) => { if (request.url().endsWith('/auth/refresh')) inflight--; });
  context.on('response', (response) => { if (response.url().endsWith('/auth/refresh')) statuses.push(response.status()); });
  await Promise.all([page.reload(), other.reload()]);
  await expect(page.getByRole('heading', { name: 'Hola, Angela' })).toBeVisible();
  await expect(other.getByRole('heading', { name: 'Hola, Angela' })).toBeVisible();
  expect(maxInflight).toBeLessThanOrEqual(1);
  expect(statuses.length).toBeGreaterThanOrEqual(2);
  expect(statuses.every((status) => status === 200)).toBe(true);
  await signIn(page, accountB);
  await expect(other.getByRole('heading', { name: 'Hello, Bruno' })).toBeVisible();
  await expect(other.getByText(accountA.email, { exact: true })).toHaveCount(0);
  const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(JSON.stringify(storage)).not.toMatch(/accessToken|equio_refresh|Bearer /);
  let release!: () => void;
  let rotated!: () => void;
  const heldResponse = new Promise<void>((resolve) => { release = resolve; });
  const serverRotated = new Promise<void>((resolve) => { rotated = resolve; });
  await other.route('**/auth/refresh', async (route) => {
    const response = await route.fetch();
    rotated();
    await heldResponse;
    await route.fulfill({ response });
  });
  const reloading = other.reload();
  await serverRotated;
  const loggedOut = page.waitForResponse((response) => response.url().endsWith('/auth/logout')
    && response.request().method() === 'POST');
  await page.getByTitle('Log out', { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(other).toHaveURL(/\/login$/);
  try {
    await expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).pending
      ?.filter((lock) => lock.name === 'equio-auth-cookie-v1').length)).toBe(1);
  } finally { release(); }
  await reloading;
  expect((await loggedOut).status()).toBe(204);
  await expect.poll(async () => (await context.cookies())
    .some((cookie) => cookie.name === 'equio_refresh' && cookie.value)).toBe(false);
});

test('HTTP limits and database readiness are enforced by the real API', async ({ request }) => {
  const csrf = await (await request.get(`${api}/auth/csrf`)).json();
  const headers = { 'X-XSRF-TOKEN': csrf.token, 'Content-Type': 'application/json' };
  expect((await request.post(`${api}/auth/sign-up`, { data: 'x'.repeat(32769), headers })).status()).toBe(413);
  expect((await request.post(`${api}/auth/sign-up`, { data: '{"email":"a","email":"b"}', headers })).status()).toBe(400);
  const ready = await request.get(new URL('/actuator/health/readiness', api).href);
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: 'UP' });
});

test('failed logout warns, prevents restoration on reload and can be retried', async ({ page, context }) => {
  await signIn(page);
  await page.route('**/auth/logout', (route) => route.abort('internetdisconnected'));
  await page.getByTitle('Cerrar sesi\u00f3n', { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toContainText('No se pudo confirmar');
  await expect(page.getByRole('button', { name: 'Iniciar sesi\u00f3n', exact: true })).toBeDisabled();
  expect((await context.cookies()).some((cookie) => cookie.name === 'equio_refresh' && cookie.value)).toBe(true);
  let refreshRequests = 0;
  page.on('request', (request) => { if (request.url().endsWith('/auth/refresh')) refreshRequests++; });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('No se pudo confirmar');
  expect(refreshRequests).toBe(0);
  await page.unroute('**/auth/logout');
  const confirmed = page.waitForResponse((response) => response.url().endsWith('/auth/logout')
    && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Reintentar cierre de sesi\u00f3n', exact: true }).click();
  expect((await confirmed).status()).toBe(204);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Iniciar sesi\u00f3n', exact: true })).toBeEnabled();
  expect((await context.cookies()).some((cookie) => cookie.name === 'equio_refresh' && cookie.value)).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('equio.logout.pending'))).toBeNull();
});

test('history paginates independently of filters and calendar indicators', async ({ page, request }) => {
  test.setTimeout(90000);
  const account = { ...accountA, email: email('paging'), firstName: 'Paula' };
  expect((await register(request, account)).status()).toBe(202);
  const csrf = await (await request.get(`${api}/auth/csrf`)).json();
  const signedIn = await request.post(`${api}/auth/sign-in`, {
    data: { email: account.email, password }, headers: { 'X-XSRF-TOKEN': csrf.token },
  });
  expect(signedIn.status()).toBe(200);
  const { accessToken } = await signedIn.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  for (let index = 0; index < 54; index++) {
    const movement = await request.post(`${api}/movements`, {
      headers, data: { type: 'EXPENSE', amount: 10, date: '2026-01-15T12:00:00', description: `Paging expense ${index}` },
    });
    expect(movement.status()).toBe(201);
  }
  expect((await request.post(`${api}/movements`, {
    headers, data: { type: 'INCOME', amount: 100, date: '2026-01-14T12:00:00', description: 'Paging oldest income' },
  })).status()).toBe(201);
  await signIn(page, account);
  await page.goto('/history');
  await expect(page.getByText(/^Paging expense \d+$/, { exact: true })).toHaveCount(50);
  await page.getByRole('button', { name: 'Cargar m\u00e1s movimientos', exact: true }).click();
  await expect(page.getByText(/^Paging expense \d+$/, { exact: true })).toHaveCount(54);
  await expect(page.getByText('Paging oldest income', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cargar m\u00e1s movimientos', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/^Paging expense \d+$/, { exact: true })).toHaveCount(50);
  await page.getByRole('button', { name: 'Seleccionar mes y a\u00f1o', exact: true }).click();
  await page.getByRole('button', { name: 'enero 2026', exact: true }).click();
  const day = page.getByRole('button', { name: '14', exact: true });
  await expect(day.locator('span')).toHaveCount(1);
  await day.click();
  await expect(page.getByText('Paging oldest income', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Paging expense \d+$/, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cargar m\u00e1s movimientos', exact: true })).toHaveCount(0);
  await page.getByText('Paging oldest income', { exact: true }).click();
  await page.locator('input[type=number]').fill('125');
  await page.getByRole('button', { name: /Guardar cambios/i }).click();
  await page.getByText('Paging oldest income', { exact: true }).click();
  await expect(page.locator('input[type=number]')).toHaveValue('125');
});

test('switching budget reports cancels stale reads and keeps the selected report', async ({ page, request }) => {
  const account = { ...accountA, email: email('reports'), firstName: 'Rosa' };
  expect((await register(request, account)).status()).toBe(202);
  const csrf = await (await request.get(`${api}/auth/csrf`)).json();
  const login = await request.post(`${api}/auth/sign-in`, {
    data: { email: account.email, password }, headers: { 'X-XSRF-TOKEN': csrf.token },
  });
  expect(login.status()).toBe(200);
  const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` };
  const ids: number[] = [];
  for (const [startDate, endDate, totalAmount] of [['2026-01-01', '2026-01-03', 100], ['2026-01-04', '2026-01-06', 200]] as const) {
    const created = await request.post(`${api}/budgets`, {
      headers, data: { name: 'Disposable report', startDate, endDate, totalAmount, isFixed: false },
    });
    expect(created.status()).toBe(201);
    const { id } = await created.json();
    ids.push(id);
    expect((await request.patch(`${api}/budgets/${id}/close`, { headers })).status()).toBe(200);
  }
  await signIn(page, account);
  await page.goto('/budgets');
  await page.getByRole('tab', { name: 'Historial', exact: true }).click();
  let release!: () => void;
  let received!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { received = resolve; });
  let firstCancelled = false;
  page.on('requestfailed', (request) => {
    if (request.url().endsWith(`/budgets/history/${ids[0]}/report`)) firstCancelled = true;
  });
  await page.route(`**/budgets/history/${ids[0]}/report`, async (route) => {
    const response = await route.fetch();
    received();
    await held;
    await route.fulfill({ response }).catch(() => undefined);
  });
  await page.getByRole('button', { name: /3 ene 2026/ }).click();
  await started;
  try {
    await page.getByRole('button', { name: 'Volver al historial', exact: true }).click();
    await expect.poll(() => firstCancelled).toBe(true);
    await page.getByRole('button', { name: /6 ene 2026/ }).click();
    await expect(page.getByText(/0\.00.*200\.00/).first()).toBeVisible();
  } finally { release(); }
  await expect(page.getByText(/0\.00.*100\.00/)).toHaveCount(0);
  const other = await page.context().newPage();
  await signIn(other, accountB);
  await expect(page.getByText(accountB.email, { exact: true })).toBeVisible();
  await expect(page.getByText(/0\.00.*200\.00/)).toHaveCount(0);
  await page.getByRole('tab', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No history', exact: true })).toBeVisible();
  await expect(page.getByText(/0\.00.*200\.00/)).toHaveCount(0);
});
