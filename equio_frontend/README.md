# Equio Frontend

Aplicación web de finanzas personales construida con React 19, TypeScript, Vite, TanStack Query, Axios y Tailwind CSS. Incluye dashboard, movimientos, categorías, presupuestos reordenables, metas de ahorro y configuración bilingüe español/inglés.

El despliegue en Cloudflare Pages está documentado en [docs/operations/DEPLOYMENT.md](../docs/operations/DEPLOYMENT.md).
La estructura y el flujo Git están en el [README del repositorio](../README.md).
Los informes de auditoría y planes de trabajo locales no se versionan.

## Requisitos

- Node.js 24.
- npm.
- Backend de Equio disponible.

## Inicio rápido

1. Copia `.env.example` como `.env`.
2. Define únicamente la URL pública de la API:

```env
VITE_API_BASE_URL=http://localhost:8081/api/v1
```

3. Instala exactamente las versiones bloqueadas e inicia Vite:

```powershell
npm ci
npm run dev
```

La aplicación queda disponible normalmente en `http://localhost:5173`.

No agregues contraseñas, tokens privados ni claves de proveedores a variables `VITE_*`: Vite las incorpora al bundle y quedan visibles para cualquier usuario. La clave de Unsplash vive en el backend.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo con recarga en caliente |
| `npm run lint` | ESLint para TypeScript, React y hooks |
| `npm run check:i18n` | Paridad de catálogos y claves usadas |
| `npm run test` | Pruebas unitarias con Vitest |
| `npm run test:watch` | Vitest en modo interactivo |
| `npm run test:e2e` | Regresiones Chromium con API/BD locales desechables |
| `npm run build` | Type-check y bundle de producción |
| `npm run preview` | Previsualiza `dist` con las cabeceras locales |
| `npm audit --audit-level=high` | Falla ante vulnerabilidades altas o críticas |

El build de producción está minificado y no publica source maps.

## Estructura

- `src/api`: cliente Axios, endpoints por dominio, contratos de caché y almacén de access token en memoria.
- `src/components/layout`: navegación, rutas protegidas y layout.
- `src/components/ui`: controles reutilizables.
- `src/contexts`: proveedor de autenticación.
- `src/features`: pantallas y flujos agrupados por dominio.
- `src/hooks`: consultas y mutaciones de TanStack Query.
- `src/i18n`: contexto y catálogo completo español/inglés.
- `src/types`: contratos de requests y responses.
- `src/utils`: errores seguros, moneda, estilos y proxy de imágenes.
- `src/features/errors`: página 404.

La lógica de dominio permanece en `api` y `hooks`; los componentes se concentran en presentación e interacción.

`src/api/queryCache.ts` centraliza claves, tiempos de frescura e invalidaciones de TanStack Query. Las reglas puras extraídas de componentes deben tener una prueba `*.test.ts`. Consulta [Arquitectura](../docs/architecture/README.md) para los límites entre capas.

En presupuestos, `budgetMetrics.ts` concentra los cálculos derivados, `useBudgetOrder.ts` aísla el orden persistido y `SavingsCard`/`BudgetActionModals` mantienen formularios y confirmaciones fuera de la vista coordinadora.

El modo avanzado consulta primero `/budgets/capabilities` y el modo activo se
persiste en el perfil del usuario. La interfaz separa presupuestos vinculados e
independientes, permite crear ambos alcances, previsualiza la asimilación de
gasto antes de vincular y conserva periodo y gasto al desvincular. Volver al
modo normal abre un flujo guiado para vincular, cerrar o eliminar cada
independiente activo. Las mutaciones esperan la respuesta del servidor e
invalidan presupuestos, historial y los dominios financieros afectados.

## Autenticación y sesión

- El access token se mantiene en una variable de módulo; no se escribe en `localStorage` ni `sessionStorage`.
- El refresh token nunca es accesible desde JavaScript: el backend lo entrega como cookie `HttpOnly`.
- Axios usa `withCredentials`, obtiene el token desde `/auth/csrf` y envía `X-XSRF-TOKEN` para registro, login, refresh y logout. No intenta leer una cookie perteneciente al subdominio de la API.
- Un único refresh puede ejecutarse a la vez por pestaña y las rotaciones entre
  pestañas se serializan con Web Locks; las solicitudes que reciben 401 esperan
  esa operación y se reintentan una vez.
- Al cargar la aplicación se restaura la sesión mediante refresh. Los antiguos valores `token` y `user` se eliminan de `localStorage`.
- Logout limpia el estado en memoria y solicita revocación en el servidor.
  Si falla, conserva únicamente `equio.logout.pending=true`, avisa en Login y
  permite reintentar. La recarga intenta confirmar el cierre en lugar de
  restaurar; login/registro/refresh se bloquean hasta la confirmación.
  Si Web Storage está bloqueado, la intención solo permanece en memoria y
  no puede conservarse tras recargar. La marca no sustituye autorización de API.
- Las query keys privadas incluyen el usuario; login/logout/expiración limpian
  queries y mutaciones. Las respuestas tardías de otra sesión se descartan y
  las operaciones anteriores en cola se cancelan. Las respuestas de cookie ya
  enviadas terminan bajo el lock antes de logout, pero no restauran datos de
  otra sesión: abortar fetch no revierte una rotación en el servidor.
- Los mensajes provenientes de Axios se inspeccionan antes de mostrarse y nunca renderizan HTML arbitrario.
- Los tooltips HTML de ECharts escapan nombres de categoría y moneda; los
  movimientos gestionados por metas se muestran sin permitir cambios directos.
- BroadcastChannel transmite solo avisos de cambio/logout, nunca tokens ni datos
  de cuenta. Las pestañas limpian su caché antes de restaurar otra cuenta y el
  idioma se sincroniza con esa cuenta. Usar un navegador con Web Locks y
  BroadcastChannel en HTTPS (localhost en desarrollo); si faltan, se muestra
  un error y no se realiza una rotación insegura.
- El registro muestra confirmación genérica y enlace para iniciar sesión;
  no realiza login automático ni informa si el correo existe.
- Axios espera 15 s (PDF 45 s). Los timeouts muestran un mensaje traducido para
  comprobar los datos antes de repetir; no hay reintento automático de escrituras.

`localStorage` se limita a preferencias no sensibles (idioma, tema, orden de tarjetas y memoria de emoji) y a la marca booleana de cierre pendiente. El orden se valida como una lista de enteros positivos antes de utilizarlo. `sessionStorage` conserva únicamente el periodo calendario elegido, nunca credenciales ni datos financieros.

## Internacionalización y UTF-8

El selector de idioma de Settings persiste `es` o `en` en el perfil y en la preferencia local. Los componentes, vistas, modales, estados vacíos, errores y etiquetas usan `t(...)` desde `src/i18n/translations.ts`.

Los archivos fuente son UTF-8 y `index.html` declara `charset=UTF-8`. Al añadir una cadena visible:

1. Crea la misma clave en `es` y `en`.
2. Usa `t('ruta.clave')`.
3. Ejecuta lint y build.
4. Comprueba que no aparezcan caracteres de reemplazo o texto mal codificado.

`ErrorBoundary` contiene el único fallback bilingüe directo porque puede renderizar cuando el proveedor de i18n no está disponible.

## Seguridad del navegador

`index.html` define una CSP sin `unsafe-eval`, limita imágenes a Equio/data/Unsplash y calcula `connect-src` desde `VITE_API_BASE_URL`. `vite.config.ts` añade `nosniff`, Referrer Policy, Permissions Policy y COOP durante desarrollo/preview.

La directiva `style-src 'unsafe-inline'` se mantiene por los estilos en línea que requieren las bibliotecas visuales actuales. No debe ampliarse a scripts.

En producción el build exige una `VITE_API_BASE_URL` HTTPS explícita y genera
`dist/_headers`. Cloudflare Pages
aplica CSP, HSTS, `nosniff`, protección de framing, políticas de permisos y
COOP; mantiene el HTML con `no-store`, los assets con hash como inmutables y
usa su fallback SPA nativo; React muestra la vista 404 para rutas desconocidas.
CI comprueba que el artefacto exista y
que la CSP contenga el origen configurado de la API.

ECharts se registra con su API modular y solo incluye los gráficos y
componentes usados por Equio. `EChart` carga `EChartRenderer` diferidamente con
un placeholder estable y conserva SVG. El motor sigue siendo un chunk grande;
la carga diferida no elimina ese costo cuando se necesita el gráfico.

## Datos y caché

TanStack Query conserva únicamente datos de la sesión activa en memoria. Al cerrar sesión se limpia su uso desde el contexto y se invalida la autenticación. Evita persistir el Query Client o respuestas financieras en almacenamiento del navegador.

Los IDs enviados al backend no se consideran autorización. El backend vuelve a comprobar el propietario y RLS aplica el aislamiento final.

Historial usa `useMovementPages`: 50 filas por página y filtro, cursor de
fecha/ID, separadores diarios y carga adicional explícita. Tipo/categoría/día
filtran en servidor, no solamente las filas cargadas. El calendario consulta
fechas de actividad del rango visible independientemente de esas páginas.
Dashboard solicita solo cinco recientes. Crear/editar/borrar invalida páginas,
fechas y resumen. Los errores de consulta ofrecen reintento, no un falso vacío.
PDF ocupado muestra un mensaje ES/EN para reintentar más tarde; no hay cola ni
reintento automático de escritura.
El detalle del reporte usa una query por usuario/presupuesto con cancelación,
invalidación al mutar datos financieros y reintento. Una respuesta tardía de
otro reporte no sustituye el seleccionado.

## Presupuestos y metas

Las tarjetas de subpresupuestos utilizan `@dnd-kit` para reordenamiento fluido por mouse y teclado; el orden local contiene solo IDs validados. La grilla presenta hasta tres tarjetas por fila y no encierra la primera fila en un scroll horizontal.

En modo normal solo se presentan los hijos del presupuesto global. Los
presupuestos independientes se administran en su sección del modo avanzado y
sus ciclos cerrados aparecen en el historial con reportes y PDF acotados a su
categoría. Los presupuestos de categoría usan el nombre de la categoría como
identidad y no solicitan un alias redundante. Los ciclos mensuales retroactivos
respetan el día seleccionado. El dashboard conserva por ahora su comportamiento
existente y no selecciona presupuestos independientes.

Las imágenes de metas se solicitan a `/api/v1/images/search`. El navegador nunca llama a Unsplash con una credencial. El dashboard selecciona iconos según la temática de cada meta.

## Desarrollo

- Mantén formularios controlados y límites equivalentes a los DTO del backend.
- No uses `dangerouslySetInnerHTML` con contenido remoto o del usuario.
- No almacenes secretos ni tokens en Web Storage.
- Toda cadena visible debe existir en ambos idiomas.
- Conserva comentarios solo cuando expliquen una decisión no evidente.
- Usa el cliente `apiClient`; no crees instancias Axios que omitan cookies, CSRF o refresh.

## Verificación

```powershell
npm ci
npm run lint
npm run check:i18n
npm run test
npm run build
npm audit --audit-level=high
```

Antes de publicar, prueba login, refresh, logout, cambio de idioma, rutas 404, presupuestos por drag and drop e imágenes de metas contra un backend con perfil de producción equivalente.

Para E2E, iniciar una API con BD vacía/desechable local, CORS
`http://localhost:5178` y límites de login/registro de 100 solo en ese fixture.
Después, desde esta carpeta:

```powershell
npx playwright install chromium
$env:E2E_API_BASE_URL='http://localhost:8081/api/v1'
npm run test:e2e
```

Playwright inicia/cierra su propio Vite en 5178 y crea cuentas aleatorias.
La configuración rechaza servidores no loopback; no ejecutar contra la BD
del desarrollador ni producción. Node 24 es el runtime probado; las trazas
están desactivadas y los artefactos locales de fallo se excluyen de Git.
La suite cubre registro, movimiento sin categoría/gráfico, edición/eliminación,
refresh concurrente, cambio de cuenta/idioma, logout entre pestañas y cierre
fallido con recarga/reintento, más paginación/filtro/calendario/edición del historial.
La cancelación al cambiar de reporte también está cubierta. Las siete
regresiones no utilizan cuentas reales.
