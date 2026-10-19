# Equio Backend

API REST de Equio para autenticación, perfiles, categorías, movimientos, presupuestos, dashboard y metas de ahorro. La aplicación usa Spring Boot 4, Java 21, Spring Security, JPA/Hibernate, Flyway y PostgreSQL.

El backend es un monolito modular. `dashboard` compone lecturas de presupuestos y movimientos, mientras los módulos propietarios exponen fachadas de aplicación; los servicios no importan repositorios ajenos. Los efectos entre movimientos, presupuestos y metas usan eventos síncronos dentro de la transacción actual.

El procedimiento reproducible del primer despliegue está en [docs/operations/DEPLOYMENT.md](../docs/operations/DEPLOYMENT.md).
La estructura y el flujo Git están en el [README del repositorio](../README.md).
Los informes de auditoría y planes de trabajo locales no se versionan.

## Requisitos

- Java 21.
- PostgreSQL 15 o posterior.
- Maven Wrapper incluido (`mvnw` y `mvnw.cmd`).
- Una cuenta PostgreSQL de migraciones y otra cuenta limitada para la aplicación.

## Inicio rápido

1. Crea la base de datos `equio`.
2. Copia `.env.example` como `.env`; este último archivo está ignorado por Git.
3. Genera una clave JWT aleatoria de al menos 32 bytes:

```bash
openssl rand -base64 64
```

En PowerShell también puedes usar:

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

4. Define `JWT_SECRET_BASE64`, `METADATA_HASH_KEY_BASE64`, las credenciales de migración y una contraseña aleatoria distinta para `equio_app`.
5. Configura el rol de aplicación. El script valida los identificadores antes de ejecutar DDL:

```powershell
.\mvnw.cmd dependency:copy-dependencies -DincludeArtifactIds=postgresql -DoutputDirectory=target/dependency
java --class-path "target/dependency/*" scripts/DatabaseRoleSetup.java
```

6. Inicia la API:

```powershell
.\mvnw.cmd spring-boot:run
```

En desarrollo queda disponible en `http://localhost:8081/api/v1`. Swagger se publica en `http://localhost:8081/swagger-ui.html` únicamente cuando `SWAGGER_PUBLIC=true`.

## Configuración

Las variables no tienen valores secretos embebidos. La aplicación falla al iniciar si faltan las credenciales obligatorias.

| Variable | Desarrollo | Propósito |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/equio` | URL JDBC |
| `DB_MIGRATION_URL` | opcional | Si se omite, Flyway usa `DB_URL` |
| `DB_APP_USERNAME` | `equio_app` | Rol CRUD usado por la API |
| `DB_APP_PASSWORD` | obligatorio | Contraseña exclusiva del rol de aplicación |
| `DB_MIGRATION_USERNAME` | obligatorio | Rol propietario usado solo por Flyway/DDL |
| `DB_MIGRATION_PASSWORD` | obligatorio | Contraseña del rol de migraciones |
| `JWT_SECRET_BASE64` | obligatorio | Clave HMAC aleatoria, codificada en Base64 |
| `METADATA_HASH_KEY_BASE64` | obligatorio | Clave HMAC distinta para seudonimizar IP/User-Agent |
| `JWT_ACCESS_EXPIRATION_MS` | `900000` | Access token; se admite entre 1 y 60 minutos |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | `30` | Refresh token; se admite entre 1 y 90 días |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes exactos separados por coma |
| `COOKIE_SECURE` | `false` | Debe ser `true` en producción |
| `REQUIRE_HTTPS` | `false` | Fuerza HTTPS cuando está activo |
| `SWAGGER_PUBLIC` | `true` | Debe ser `false` en producción |
| `UNSPLASH_ACCESS_KEY` | vacío | Secreto del proxy de imágenes; nunca se envía al navegador |
| `DATABASE_AUTO_CREATE_ENABLED` | `false` | Excepción optativa para crear la BD local |
| `GLOBAL_RATE_LIMIT_PER_MINUTE` | `300` | Límite general por IP |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | `10` | Límite adicional para inicio de sesión |
| `ACCOUNT_LOCK_ATTEMPTS` | `5` | Fallos antes del bloqueo temporal |
| `ACCOUNT_LOCK_MINUTES` | `15` | Duración del bloqueo |
| `HTTP_MAX_REQUEST_BYTES` | `32768` | Bytes máximos en escrituras API; entre 1024 y 1048576 |
| `HTTP_REQUEST_LOGS` | `true` | Logs saneados de rutas, estados y duración |
| `SLOW_REQUEST_MS` | `2000` | Umbral WARN de peticiones lentas |
| `REPORT_MAX_CONCURRENT_PDFS` | `1` | PDFs simultáneos por instancia, entre 1 y 4 |
| `REPORT_MAX_MOVEMENTS` | `2000` | Máximo de movimientos por reporte |
| `ADVANCED_BUDGETS_ENABLED` | `true` | Habilita operaciones independientes, vínculo y desvínculo |

Puedes ajustar el pool con `DB_POOL_MAX_SIZE` y `DB_POOL_MIN_IDLE`, BCrypt con `BCRYPT_STRENGTH` (10 a 14), y el dominio de cookie con `COOKIE_DOMAIN`.

### Producción

Activa `SPRING_PROFILES_ACTIVE=prod`. Ese perfil exige HTTPS, cookies `Secure`, Swagger desactivado y procesa cabeceras reenviadas del proxy. Para el primer despliegue, Flyway y la API pueden compartir el endpoint directo de Neon. Deben conservar credenciales distintas: el propietario para Flyway y el rol limitado para la API. La URL exige validación completa del certificado, por ejemplo:

```text
jdbc:postgresql://HOST/BASE?sslmode=verify-full
```

La API en ejecución utiliza `equio_app`, sin permisos de superusuario, creación de roles o bases de datos. Separar también los endpoints queda como una optimización futura, no como requisito del primer deploy.

En `prod`, JDBC/Flyway usan el truststore Java para certificados públicos y
comprueban TLS, permisos efectivos y FORCE RLS al arrancar. Para una CA privada,
configurar un truststore Java; `sslrootcert` no sustituye ese truststore con
`DefaultJavaSSLFactory`. El runtime no modifica el historial de Flyway.

El [Dockerfile](Dockerfile) multi-stage genera una imagen sin toolchain y la ejecuta con un usuario no privilegiado. Los health checks públicos son `/actuator/health/liveness` y `/actuator/health/readiness` (incluye BD); solo revelan estado. El endpoint general de Actuator continúa autenticado. El manifiesto de Render está en [render.yaml](../render.yaml).

Docker/Render fijan `TZ=America/Lima`: los cierres usan una única zona de negocio,
no la zona UTC accidental del contenedor. Al cambiar de mercado, revisar esa
configuración y la convención de fechas; no hay zonas individuales por usuario.

## Autenticación

- El access token JWT dura 15 minutos por defecto e incluye `iss`, `aud`, `jti` y `type=access`.
- El access token se devuelve en el cuerpo y el frontend lo conserva solo en memoria.
- El refresh token es opaco, aleatorio y se almacena únicamente como SHA-256 en PostgreSQL.
- La cookie de refresh es `HttpOnly`, `SameSite=Strict`, `Secure` en producción y tiene ruta `/api/v1/auth`. El frontend y la API deben usar subdominios del mismo dominio registrable.
- Cada refresh rota el token. La reutilización de uno reemplazado revoca la familia activa.
- Todas las operaciones mutantes de autenticación, incluido registro e inicio de sesión, requieren el encabezado CSRF.
- Los intentos fallidos producen mensajes genéricos, rate limiting y bloqueo temporal.
- `POST /auth/sign-up` retorna 202 con la misma confirmación para correos nuevos
  o existentes válidos. No devuelve perfil/ID, no modifica cuentas existentes y
  no inicia sesión: el cliente debe continuar a `/auth/sign-in` explícitamente.
- El bootstrap JSON `/auth/csrf` retorna el token plano que corresponde a la
  cookie, apto para el encabezado SPA incluso desde el subdominio del frontend.
- El contador de login se actualiza bajo un bloqueo del usuario. Registro
  duplicado y login inexistente/bloqueado conservan trabajo criptográfico para
  reducir diferencias de tiempo; no se garantiza ausencia total de enumeración.

Recuperación, cambio de contraseña y verificación por email no están implementados.

## Límites y observabilidad

Las escrituras API rechazan cuerpos de más de 32 KiB, cuerpos comprimidos,
claves JSON duplicadas/desconocidas y JSON excesivamente profundo/complejo.
Los DTO mantienen sus validaciones de dominio y Unicode. No se permiten uploads
mediante estos endpoints; cambiar el límite de multipart no elude el filtro API.

En `prod`, JDBC conecta en 10 s y espera socket 30 s; PostgreSQL cancela consultas
de más de 15 s, espera locks como máximo 5 s y termina transacciones inactivas
tras 30 s. Spring limita transacciones a 30 s. Estos límites se aplican al
runtime, no a Flyway ni a la conexión administrativa del desarrollador.
Los timeouts de operación conocidos devuelven 503/OPERATION_TIMEOUT y
Retry-After; no reintentar escrituras sin verificar su resultado.
Tomcat usa el timeout de conexión de 10 s también para leer el cuerpo con su
comportamiento de upload por defecto; no se añaden propiedades de Spring Boot
que no existen. [Referencia Tomcat](https://tomcat.apache.org/tomcat-11.0-doc/config/http.html).

Los logs HTTP contienen plantilla de ruta, estado, duración y requestId;
no contienen query strings, cuerpos, tokens ni importes. Las excepciones
inesperadas registran tipo y requestId, no SQL/stacktraces potencialmente sensibles.
Para depurar, usar el código/test o un breakpoint local, no habilitar logs de
credenciales. Configuración y activación de alertas/costos:
[MONITORING.md](../docs/operations/MONITORING.md).

Los PDFs se admiten antes de leer datos con un límite no bloqueante por proceso;
si está ocupado devuelve 503/REPORT_BUSY y Retry-After. La transacción de lectura
termina antes de renderizar, sin mantener una conexión SQL durante PDFBox.

## Base de datos

Flyway es la única fuente del esquema; Hibernate usa `ddl-auto=validate`. Las migraciones están en `src/main/resources/db/migration`.

RLS está habilitado y forzado para `categories`, `movements`, `budgets`, `saving_goals`, `savings_pools` y `savings_pool_transactions`. Los servicios establecen `app.current_user_id` dentro de cada transacción. Las consultas de recursos también incluyen `user_id`, por lo que existe defensa en profundidad contra IDOR.

Las mutaciones financieras toman primero un lock por usuario. Los ciclos
cerrados son inmutables y los movimientos gestionados por metas tienen
procedencia explícita. El scheduler recupera ciclos al iniciar y cada seis
horas, con transacciones por usuario y liquidación idempotente.

Las pruebas PostgreSQL de CI incluyen `FinancialIntegritySmokeTest.java` y
`BudgetCyclePostgresTest`, `DatabaseLimitsPostgresTest` y `MovementPaginationPostgresTest`
(`TEST_PG_JOBS=true`, solo BD local desechable). Los
smokes no se dirigen a la base del desarrollador ni al entorno productivo.
Backups/restauración: [procedimiento](../docs/operations/BACKUP_AND_ROLLBACK.md).

Para cambiar el esquema:

1. Crea una migración `V<n>__descripcion.sql`.
2. Ejecuta las pruebas.
3. Aplica Flyway con la cuenta de migraciones.
4. Verifica de nuevo el rol limitado y RLS.

No uses la cuenta `equio_app` para DDL. Para explorar datos durante desarrollo usa un cliente PostgreSQL con la cuenta de migraciones de tu `.env`; evita reutilizarla en la aplicación.

## Estructura

- `users`: autenticación, perfil, bloqueo y sesiones refresh.
- `transactions`: categorías, movimientos y consultas financieras.
- `dashboard`: composición de solo lectura entre movimientos y presupuestos.
- `budgets`: presupuestos, subpresupuestos, historial y scheduler.
- `savings`: metas y aportes/retiros.
- `images/controllers` y `images/services`: proxy autenticado de Unsplash.
- `shared/config`: configuración y validaciones de entorno.
- `shared/security`: JWT, CSRF, RLS, rate limiting y manejadores HTTP.
- `shared/exceptions`: errores JSON seguros.
- `shared/events`: contratos síncronos para efectos entre módulos.
- `resources/db/migration`: esquema versionado.
- `scripts`: configuración y pruebas de seguridad operativas.

Las reglas de capas se ejecutan con ArchUnit en `ArchitectureRulesTest`. La organización, dependencias permitidas y deuda conocida se documentan en [Arquitectura](../docs/architecture/README.md).

## API

Los grupos principales son:

- `/api/v1/auth`: registro, inicio de sesión, refresh, logout y bootstrap CSRF.
- `/api/v1/profiles/me`: perfil del usuario autenticado.
- `/api/v1/categories`, `/movements`, `/budgets`, `/savings`: recursos financieros del propietario.
- `/api/v1/dashboard/summary`: resumen del presupuesto o periodo calendario seleccionado.
- `/api/v1/images/search`: búsqueda de una imagen segura mediante el proxy.

### Lecturas de movimientos

- `GET /api/v1/movements/page`: filtros `type`, `categoryId`, `startDate`,
  `endDate`, `startAt`; `size` entre 1 y 100 (50 por defecto).
- Respuesta: `{ items, nextCursor }`; enviar ambos campos `beforeDate` y
  `beforeId` del cursor para la siguiente página con los mismos filtros.
  `nextCursor=null` indica fin. Orden: fecha descendente, luego ID descendente.
- `GET /api/v1/movements/dates?startDate=...&endDate=...`: fechas distintas de
  actividad, como máximo 62 días inclusivos; no descarga movimientos.
- El endpoint legado `/movements` se conserva, pero limita el resultado a
  5.000 registros por defecto. Historial y dashboard usan lecturas paginadas.

`MovementReadService` aplica transacción read-only, propietario, RLS y LEFT
FETCH de categoría; no ejecuta COUNT ni OFFSET por página. V16 incorpora el
índice usuario/fecha/ID. El cursor es navegación, nunca autorización.

Salvo registro, login, refresh, logout y CSRF, todas las rutas requieren `Authorization: Bearer <access-token>`.

### Presupuestos avanzados

El alcance se deriva como `GLOBAL`, `LINKED_CATEGORY` o
`INDEPENDENT_CATEGORY` y se devuelve junto con los importes asignable,
asignado y libre. Solo puede existir un global activo por usuario y una
categoría activa por usuario; Flyway protege ambas reglas con índices
parciales únicos.

Rutas específicas:

- `GET /api/v1/budgets/capabilities`: capacidad autorizada por el servidor.
- `PUT /api/v1/budgets/mode`: persiste `NORMAL` o `ADVANCED` y bloquea el modo normal mientras existan independientes activos.
- `GET /api/v1/budgets/{id}/preview-link?globalId={globalId}`: simulación sin escritura.
- `POST /api/v1/budgets/{globalId}/children/{budgetId}`: vinculación atómica.
- `DELETE /api/v1/budgets/{globalId}/children/{budgetId}`: desvinculación conservando periodo y gasto.

La vinculación bloquea los registros durante la transacción, vuelve a validar
la capacidad y recalcula el gasto de la categoría para el periodo global. El
frontend traduce los códigos estables de conflicto; el mensaje del servidor es
solo diagnóstico. Los presupuestos independientes se renuevan e historizan,
pero no liquidan automáticamente su remanente al pozo de ahorro.
Las operaciones exclusivas del modo avanzado validan tanto la capacidad global
del servidor como la preferencia persistida del usuario. Los presupuestos de
categoría derivan su nombre de la categoría en el backend.

## Verificación

Pruebas unitarias, de contexto y de arquitectura:

```powershell
.\mvnw.cmd test
```

Comprobación del rol y aislamiento RLS:

```powershell
java --class-path "target/dependency/*" scripts/DatabaseSecurityCheck.java
```

Con la API local en ejecución, la prueba de tokens, cookies, CSRF, CORS, rate limiting e IDOR es:

```powershell
java --class-path "target/dependency/*" scripts/SecuritySmokeTest.java
```

## Reglas de contribución

- Añade DTOs validados; no expongas entidades JPA directamente.
- Toda lectura o mutación por ID debe incluir el `userId` autenticado.
- No construyas SQL con datos del usuario.
- No registres tokens, cookies, contraseñas, claves o cuerpos sensibles.
- Mantén los comentarios para reglas de negocio o decisiones que el código no explique por sí mismo.
- Nunca añadas secretos a variables `VITE_*`, al repositorio o a Swagger.
