# Equio Backend

API REST de Equio para autenticación, perfiles, categorías, movimientos, presupuestos, dashboard y metas de ahorro. La aplicación usa Spring Boot 4, Java 21, Spring Security, JPA/Hibernate, Flyway y PostgreSQL.

El diseño de seguridad y las decisiones pendientes de infraestructura están documentados en [SECURITY_AUDIT.md](../SECURITY_AUDIT.md).

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
| `NVD_API_KEY` | vacío | Clave opcional/recomendada para OWASP Dependency-Check |

Puedes ajustar el pool con `DB_POOL_MAX_SIZE` y `DB_POOL_MIN_IDLE`, BCrypt con `BCRYPT_STRENGTH` (10 a 14), y el dominio de cookie con `COOKIE_DOMAIN`.

### Producción

Activa `SPRING_PROFILES_ACTIVE=prod`. Ese perfil exige HTTPS, cookies `Secure`, Swagger desactivado y procesa cabeceras reenviadas del proxy. Usa una URL PostgreSQL con validación completa del certificado, por ejemplo:

```text
jdbc:postgresql://db.internal:5432/equio?sslmode=verify-full&sslrootcert=/run/secrets/postgres-ca.pem
```

La cuenta de migraciones debe existir solo durante despliegues. La API en ejecución utiliza `equio_app`, sin permisos de superusuario, creación de roles o bases de datos.

## Autenticación

- El access token JWT dura 15 minutos por defecto e incluye `iss`, `aud`, `jti` y `type=access`.
- El access token se devuelve en el cuerpo y el frontend lo conserva solo en memoria.
- El refresh token es opaco, aleatorio y se almacena únicamente como SHA-256 en PostgreSQL.
- La cookie de refresh es `HttpOnly`, `SameSite=Strict`, `Secure` en producción y tiene ruta `/api/v1/auth`.
- Cada refresh rota el token. La reutilización de uno reemplazado revoca la familia activa.
- Todas las operaciones mutantes de autenticación, incluido registro e inicio de sesión, requieren el encabezado CSRF.
- Los intentos fallidos producen mensajes genéricos, rate limiting y bloqueo temporal.

## Base de datos

Flyway es la única fuente del esquema; Hibernate usa `ddl-auto=validate`. Las migraciones están en `src/main/resources/db/migration`.

RLS está habilitado y forzado para `categories`, `movements`, `budgets` y `saving_goals`. Los servicios establecen `app.current_user_id` dentro de cada transacción. Las consultas de recursos también incluyen `user_id`, por lo que existe defensa en profundidad contra IDOR.

Para cambiar el esquema:

1. Crea una migración `V<n>__descripcion.sql`.
2. Ejecuta las pruebas.
3. Aplica Flyway con la cuenta de migraciones.
4. Verifica de nuevo el rol limitado y RLS.

No uses la cuenta `equio_app` para DDL. Para explorar datos durante desarrollo usa un cliente PostgreSQL con la cuenta de migraciones de tu `.env`; evita reutilizarla en la aplicación.

## Estructura

- `users`: autenticación, perfil, bloqueo y sesiones refresh.
- `transactions`: categorías, movimientos y resumen financiero.
- `budgets`: presupuestos, subpresupuestos, historial y scheduler.
- `savings`: metas y aportes/retiros.
- `images`: proxy autenticado de Unsplash.
- `shared/config`: configuración y validaciones de entorno.
- `shared/security`: JWT, CSRF, RLS, rate limiting y manejadores HTTP.
- `shared/exceptions`: errores JSON seguros.
- `resources/db/migration`: esquema versionado.
- `scripts`: configuración y pruebas de seguridad operativas.

## API

Los grupos principales son:

- `/api/v1/auth`: registro, inicio de sesión, refresh, logout y bootstrap CSRF.
- `/api/v1/profiles/me`: perfil del usuario autenticado.
- `/api/v1/categories`, `/movements`, `/budgets`, `/savings`: recursos financieros del propietario.
- `/api/v1/dashboard/summary`: resumen mensual.
- `/api/v1/images/search`: búsqueda de una imagen segura mediante el proxy.

Salvo registro, login, refresh, logout y CSRF, todas las rutas requieren `Authorization: Bearer <access-token>`.

## Verificación

Pruebas unitarias e integración:

```powershell
.\mvnw.cmd test
```

Análisis SCA de dependencias con umbral CVSS 7:

```powershell
.\mvnw.cmd verify -Psecurity-scan
```

La primera actualización de NVD puede tardar; configura `NVD_API_KEY` para evitar límites públicos. Los reportes se generan en `target/dependency-check-report.html` y `.json`.

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
