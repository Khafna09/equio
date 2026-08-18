# Primer despliegue de Equio

Destino: Cloudflare Pages + Render Starter + Neon Free.

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
.mvnw.cmd dependency:copy-dependencies -DincludeArtifactIds=postgresql -DoutputDirectory=target/dependency
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

UNSPLASH_ACCESS_KEY puede quedar vacío. Render genera automáticamente las dos
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

1. Registro, login, recarga de página y logout.
2. Crear, editar y eliminar un movimiento con y sin categoría.
3. Presupuestos, metas, búsqueda de imagen y descarga del PDF.
4. Español e inglés, tema, formato horario y página 404.
5. Cookie refresh con HttpOnly, Secure y SameSite=Strict.
6. Ausencia de access y refresh tokens en Local Storage y Session Storage.

Con estas comprobaciones el primer despliegue queda completo.

