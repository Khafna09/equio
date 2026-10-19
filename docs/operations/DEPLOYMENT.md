# Primer despliegue de Equio

Destino: Cloudflare Pages + Render Starter + Neon Free.

Consultar también [el README del repositorio](../../README.md) y las guías de
variables, backups y monitorización de esta carpeta. Los informes históricos y
planes de trabajo se conservan localmente, no en Git.
Esta guía contiene pasos de ejecución, no una aprobación de producción.

## 1. Subir el repositorio

1. Confirma todos los archivos nuevos y modificados.
2. Sube la rama que se desplegará.
3. Comprueba que CI termine correctamente.

## 2. Crear Neon

1. Crea un proyecto y una base de datos.
2. Copia el endpoint directo y conviértelo a JDBC:

~~~text
jdbc:postgresql://HOST/BASE?sslmode=verify-full
~~~

3. Conserva el usuario propietario de Neon para Flyway.
4. Crea un archivo temporal backend/.env.production, ignorado por Git, con:

~~~env
DB_URL=jdbc:postgresql://HOST/BASE?sslmode=verify-full
DB_APP_USERNAME=equio_app
DB_APP_PASSWORD=CONTRASENA_ALEATORIA
DB_MIGRATION_USERNAME=USUARIO_PROPIETARIO_NEON
DB_MIGRATION_PASSWORD=CONTRASENA_PROPIETARIO_NEON
~~~

5. Desde backend, crea el rol limitado:

~~~powershell
.\mvnw.cmd dependency:copy-dependencies -DincludeArtifactIds=postgresql -DoutputDirectory=target/dependency
java --class-path target/dependency/* scripts/DatabaseRoleSetup.java .env.production
~~~

Flyway y la API pueden usar el mismo endpoint. Solo sus credenciales deben ser
distintas para que el runtime no omita RLS.

## 3. Desplegar Render

1. Crea un Blueprint usando render.yaml.
2. Carga estas variables solicitadas por Render:

~~~text
DB_URL
DB_APP_USERNAME
DB_APP_PASSWORD
DB_MIGRATION_USERNAME
DB_MIGRATION_PASSWORD
CORS_ALLOWED_ORIGINS=https://app.<dominio>
UNSPLASH_ACCESS_KEY
~~~

UNSPLASH_ACCESS_KEY puede quedar vacío. Antes de activarlo, implementar y verificar
la atribución al fotógrafo/Unsplash, hotlinking y el seguimiento de descargas
exigidos por las [directrices de la API](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).
Render genera automáticamente las dos
claves criptográficas. El primer arranque aplica Flyway.

3. Asigna api.<dominio> al servicio.
4. Abre:

~~~text
https://api.<dominio>/actuator/health/liveness
~~~

Debe responder 200.

## 4. Desplegar Cloudflare Pages

| Campo | Valor |
| --- | --- |
| Root directory | equio_frontend |
| Build command | npm ci && npm run build |
| Output directory | dist |
| Node | 24 |
| VITE_API_BASE_URL | https://api.<dominio>/api/v1 |

Asigna app.<dominio> al proyecto. No agregues 404.html ni un redirect global:
Cloudflare detecta la SPA y React resuelve sus rutas.

## 5. Prueba mínima

En una ventana privada comprueba:

1. Registro con confirmación genérica, login explícito, recarga y logout.
2. Crear, editar y eliminar un movimiento con y sin categoría.
3. Presupuestos, metas, búsqueda de imagen y descarga del PDF.
4. Español e inglés, tema, formato horario y página 404.
5. Cookie refresh con HttpOnly, Secure y SameSite=Strict.
6. Ausencia de access y refresh tokens en Local Storage y Session Storage.
7. Dos pestañas: recarga simultánea, cambio de cuenta e idioma y logout
   sincronizados, sin datos de la cuenta anterior.
8. Fallo de red al cerrar sesión: aviso en Login, sin restauración tras recarga;
   al recuperar conexión, reintentar y confirmar eliminación de la cookie.

## 6. Comprobaciones operativas obligatorias

Antes de admitir usuarios, crear copia previa y revisar datos existentes antes
de V13–V16. Las migraciones no reconstruyen inconsistencias históricas.
V16 crea un índice normal: con muchos datos, ensayar tiempo/bloqueo de escrituras
en staging y acordar ventana antes de aplicarlo; no editar migraciones aplicadas.

Después del arranque, comprobar permisos con `DatabaseSecurityCheck.java`
usando las variables del entorno real (no ejecutar smokes destructivos locales
contra producción). El perfil `prod` también bloquea el arranque si no hay
TLS efectivo, rol limitado y seis tablas con FORCE RLS sin ownership del runtime.

Desde la raíz, con PowerShell 7:

~~~powershell
./backend/scripts/Verify-Production.ps1 -FrontendUrl https://app.<dominio>/ -ApiUrl https://api.<dominio>/
~~~

La prueba es de solo lectura: headers, liveness, rutas privadas, CORS y CSRF.
No sustituye la prueba del navegador de la cookie refresh HttpOnly ni los
flujos financieros.

Producción usa `forward-headers-strategy: native`: Tomcat procesa
`X-Forwarded-For`/`X-Forwarded-Proto` solo desde proxies confiables. Mantener
el filtro de proxies internos; nunca dejar `internal-proxies` vacío para
confiar en cualquier origen. Verificar en Render que HTTPS no produzca bucles
y que cabeceras `Forwarded`/`X-Forwarded-For` enviadas por un cliente no cambien
la IP utilizada por el rate limiting. Si cambia el proveedor, ajustar la
confianza al proxy real, no desactivar HTTPS ni ampliar la confianza a todos.
Referencia: [Spring Boot: proxy frontal](https://docs.spring.io/spring-boot/how-to/webserver.html#howto.webserver.use-behind-a-proxy-server).

Configurar/verificar copias cifradas diarias, retención y restauración remota
de staging según [Backup y rollback](BACKUP_AND_ROLLBACK.md). El workflow está
desactivado hasta cargar secretos y activar `EQUIO_BACKUPS_ENABLED`.

Finalmente, confirmar CI verde/protección de rama, notificaciones de fallos,
activar el monitor HTTPS externo y configurar presupuesto/alertas según
[MONITORING.md](MONITORING.md). Medir memoria/latencia/conexiones con carga representativa.
No se certifica capacidad de 1.000 usuarios concurrentes sin medirla.

