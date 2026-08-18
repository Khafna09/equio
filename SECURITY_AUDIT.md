# Auditoría de seguridad de Equio

> Estado: los controles de aplicación necesarios para el primer deploy están
> implementados. Solo falta configurar y comprobar el entorno real.

## Controles implementados

| Área | Implementación |
| --- | --- |
| Access token | JWT de 15 minutos, clave de 256 bits o más, issuer, audience, jti y tipo |
| Refresh token | Token opaco, hash SHA-256 en BD, rotación y cookie HttpOnly/Secure/SameSite=Strict |
| Contraseñas | PBKDF2-HMAC-SHA256, longitud validada y compatibilidad con hashes BCrypt existentes |
| Navegador | Tokens fuera de Web Storage, CSP, protección de framing y frontend minificado |
| CSRF | Cookie y encabezado para registro, login, refresh y logout |
| CORS | Solo orígenes HTTPS configurados explícitamente |
| Base de datos | Consultas parametrizadas, Flyway, RLS, ownership e integridad referencial |
| Autorización | El backend obtiene el usuario autenticado y valida propiedad para evitar IDOR |
| Secretos | Variables de entorno; Unsplash y claves criptográficas nunca llegan al frontend |
| Errores | Respuestas controladas con requestId y sin stacktraces, SQL ni secretos |
| Abuso | Rate limiting por IP y bloqueo temporal ante intentos fallidos |
| Transporte | HTTPS en producción y PostgreSQL con sslmode=verify-full |
| Dependencias | Lockfiles, Dependabot, npm audit, CodeQL y revisión en CI |

## Decisiones intencionales

- El rate limiting vive en memoria porque se desplegará una sola instancia.
- Los datos financieros no se cifran por campo; se usa TLS, cifrado en reposo
  del proveedor, permisos mínimos y RLS.
- Se mantienen dos usuarios de PostgreSQL: el propietario para Flyway y un rol
  limitado para la API. Pueden usar el mismo endpoint de Neon.
- La cookie SameSite=Strict requiere que frontend y API usen subdominios del
  mismo dominio registrable.

## Únicos pendientes de seguridad para desplegar

- [ ] Crear el rol limitado de Neon y usar credenciales distintas a Flyway.
- [ ] Cargar los secretos exclusivamente en Render.
- [ ] Configurar el origen HTTPS final en CORS y en el build de Cloudflare.
- [ ] Verificar en el navegador que la cookie sea HttpOnly, Secure y Strict.
- [ ] Ejecutar el flujo completo de autenticación y confirmar que los tokens no
      aparecen en Local Storage ni Session Storage.

No hay otras tareas de seguridad que bloqueen el primer despliegue. Controles
como alta disponibilidad, rate limiting distribuido, DAST, SBOM, KMS o
cifrado por campo solo se evaluarán si el uso, la regulación o el riesgo real
los justifican.

