# Equio Frontend

Aplicacion web de Equio para gestionar ingresos, gastos, categorias, presupuestos, historial, metas de ahorro y preferencias de perfil. Esta construida con React, TypeScript, Vite, React Router, TanStack Query y Tailwind CSS.

## Requisitos

- Node.js compatible con Vite
- npm
- Backend de Equio disponible

## Configuracion

Crea o actualiza un archivo `.env` local usando `.env.example` como referencia:

```env
VITE_API_BASE_URL=http://localhost:8081/api/v1
VITE_UNSPLASH_ACCESS_KEY=
```

`VITE_UNSPLASH_ACCESS_KEY` es opcional. Si no se define, las metas de ahorro se crean sin imagen remota.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

El servidor de desarrollo usa Vite y normalmente queda en `http://localhost:5173`.

## Estructura

- `src/api`: clientes HTTP por dominio y configuracion central de Axios.
- `src/components`: componentes reutilizables de layout, UI y efectos visuales.
- `src/contexts`: estado global de autenticacion.
- `src/features`: pantallas y flujos de producto por modulo (`auth`, `dashboard`, `history`, `budgets`, `categories`, `movements`, `savings`, `settings`).
- `src/hooks`: hooks de datos y estado compartido.
- `src/types`: contratos TypeScript de requests/responses.
- `src/utils` y `src/lib`: utilidades transversales.

## Seguridad y buenas practicas

- El token JWT se adjunta desde el cliente Axios central.
- Los 401 limpian la sesion local y redirigen a login.
- La URL de API y llaves de servicios externos se configuran por entorno.
- `.env` esta ignorado por Git; comparte solo `.env.example`.
- Mantener la logica de datos en `api`/`hooks` y las pantallas en `features` ayuda a reducir acoplamiento.

## Verificacion

```bash
npm run lint
npm run build
```