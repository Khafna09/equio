# Equio

Aplicacion de finanzas personales. Un monorepo contiene dos aplicaciones
desplegables de forma independiente y mantiene sincronizados sus contratos:

| Ruta | Responsabilidad |
| --- | --- |
| `backend/` | API Spring Boot, Java 21, PostgreSQL y migraciones Flyway |
| `equio_frontend/` | Interfaz React, TypeScript y Vite con Node.js 24 |
| `.github/` | CI, analisis y herramientas de operacion automatizada |
| `docs/` | Arquitectura y procedimientos reproducibles de operacion |
| `render.yaml` | Blueprint del backend con contexto Docker en `backend/` |

Ver [backend](backend/README.md), [frontend](equio_frontend/README.md) y
[despliegue](docs/operations/DEPLOYMENT.md) para iniciar cada aplicacion.
`docs` y `.github` no son aplicaciones adicionales ni archivos temporales.
Los informes historicos, auditorias privadas y planes locales se conservan en
`.local/docs/`, ignorada por Git. Ningun procedimiento versionado depende de ellos.

## Verificacion

Desde `backend/`:

```powershell
.\mvnw.cmd --batch-mode test package
```

Desde `equio_frontend/`:

```powershell
npm ci
npm run lint
npm run check:i18n
npm run test
$env:VITE_API_BASE_URL='https://api.example.test/api/v1'
npm run build
npm audit --audit-level=high
```

La URL de ejemplo solo sirve para comprobar el build; nunca publicarlo con ella.
Usar la URL HTTPS real al construir un artefacto de despliegue.
Desde la raiz:

```powershell
node --test .github/scripts/monitor-production.test.mjs .github/scripts/load-smoke.test.mjs
git diff --check
```

CI ejecuta ademas PostgreSQL real, smokes de seguridad/integridad financiera,
Playwright y el build Docker. Las pruebas de integracion requieren una base
local desechable y `TEST_PG_JOBS=true`; nunca usar la base del desarrollador o
produccion. Consultar los READMEs y `.github/workflows/security-ci.yml`.

## Flujo Git

- `main`: versiones publicables; no se modifica durante esta integracion.
- `develop`: integracion para continuar el desarrollo; no significa aprobacion
  automatica para produccion.
- `codex/feature/<tema>`: ramas de trabajo de Codex; el resto del equipo puede
  usar `feature/<tema>`. Partir normalmente de `develop`.
- `release/<version>`: crear desde `develop` solo al preparar una version real.
  Validar, integrar en `main`, etiquetar y devolver correcciones a `develop`.
- `hotfix/<tema>`: crear desde `main` solo para una incidencia publicada;
  reintegrar tambien en `develop`.

Ejemplo de una nueva tarea:

```powershell
git switch develop
git switch -c codex/feature/descripcion
# Implementar y verificar antes del commit.
git add -- <archivos-revisados>
git commit -m "feat: descripcion"
```

Integrar mediante pull request y CI. Para una integracion exclusivamente local,
usar `git merge --no-ff` desde `develop` despues de revisar y verificar la rama.
No crear ramas release/hotfix vacias ni desplegar automaticamente `develop`.
La primera integracion agrupa cambios ya existentes en ramas dependientes de
backend, frontend y mantenimiento; no son entregas independientes. Las tareas
nuevas deben partir del `develop` integrado.

En GitHub, configurar proteccion para `main`/`develop`, requerir revision y CI,
y comprobar que los checks requeridos realmente se ejecutan. Esto se configura
en el proveedor y no queda activado por crear ramas locales.

## Archivos locales y seguridad

- Versionar codigo, migraciones, pruebas, lockfile, ejemplos de entorno sin
  secretos, READMEs y guias operativas.
- No versionar `.env`, credenciales, dumps, logs, capturas de prueba, `target`,
  `dist`, `node_modules` ni resultados de Playwright. `.gitignore` no elimina
  secretos presentes en commits anteriores; revisar/rotar si se detectan.
- No ignorar todos los Markdown: la documentacion necesaria para otro
  desarrollador debe seguir disponible al clonar.
- No usar `git clean -fdx`: borraria tambien configuracion y datos locales.

## Limitaciones conocidas antes de publicar

- La recurrencia mensual que comienza los dias 29-31 necesita corregir el
  ajuste al ultimo dia del mes y preservar el dia ancla entre ciclos, con
  pruebas compartidas frontend/backend. Esta integracion no cambia esa regla.
- Recuperacion/cambio de contrasena y verificacion de email no estan
  implementados. No prometer dichas capacidades ni realizar resets inseguros.
- Unsplash requiere completar la atribucion/seguimiento antes de activarlo;
  la clave puede quedar vacia. Revisar licencias de imagenes de respaldo.
- Falta validar secretos, DNS/HTTPS, cookies/CORS, CI remoto, limites de memoria,
  backups remotos/restauracion, alertas y carga representativa en el entorno
  final. Los procedimientos estan en `docs/operations`.

Las pruebas locales no certifican capacidad, ausencia de vulnerabilidades ni
readiness de produccion. Mantener estos bloqueos visibles al preparar release.
