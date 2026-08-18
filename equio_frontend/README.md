# Equio Frontend

Aplicación web de finanzas personales construida con React 19, TypeScript, Vite, TanStack Query, Axios y Tailwind CSS. Incluye dashboard, movimientos, categorías, presupuestos reordenables, metas de ahorro y configuración bilingüe español/inglés.

La auditoría y las decisiones de seguridad del sistema completo están en [SECURITY_AUDIT.md](../SECURITY_AUDIT.md). El despliegue en Cloudflare Pages está documentado en [docs/operations/DEPLOYMENT.md](../docs/operations/DEPLOYMENT.md).

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
| `npm run check:i18n` | Paridad de cat?logos y claves usadas |
| `npm run test` | Pruebas unitarias con Vitest |
| `npm run test:watch` | Vitest en modo interactivo |
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

## Autenticación y sesión

- El access token se mantiene en una variable de módulo; no se escribe en `localStorage` ni `sessionStorage`.
- El refresh token nunca es accesible desde JavaScript: el backend lo entrega como cookie `HttpOnly`.
- Axios usa `withCredentials`, obtiene el token desde `/auth/csrf` y envía `X-XSRF-TOKEN` para registro, login, refresh y logout. No intenta leer una cookie perteneciente al subdominio de la API.
- Un único refresh puede ejecutarse a la vez; las solicitudes que reciben 401 esperan esa operación y se reintentan una vez.
- Al cargar la aplicación se restaura la sesión mediante refresh. Los antiguos valores `token` y `user` se eliminan de `localStorage`.
- Logout revoca la sesión en el servidor y limpia el estado en memoria.
- Los mensajes provenientes de Axios se inspeccionan antes de mostrarse y nunca renderizan HTML arbitrario.

`localStorage` se limita a preferencias no sensibles: idioma, tema, modo de presupuesto, orden de tarjetas y memoria de emoji. El orden se valida como una lista de enteros positivos antes de utilizarlo. No se usa `sessionStorage`.

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
componentes usados por Equio. Esto conserva SVG y reduce el chunk de gráficos
sin cambiar la interfaz visual.

## Datos y caché

TanStack Query conserva únicamente datos de la sesión activa en memoria. Al cerrar sesión se limpia su uso desde el contexto y se invalida la autenticación. Evita persistir el Query Client o respuestas financieras en almacenamiento del navegador.

Los IDs enviados al backend no se consideran autorización. El backend vuelve a comprobar el propietario y RLS aplica el aislamiento final.

## Presupuestos y metas

Las tarjetas de subpresupuestos utilizan `@dnd-kit` para reordenamiento fluido por mouse y teclado; el orden local contiene solo IDs validados. La grilla presenta hasta tres tarjetas por fila y no encierra la primera fila en un scroll horizontal.

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
