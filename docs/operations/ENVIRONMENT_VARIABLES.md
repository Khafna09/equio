# Variables del primer despliegue

Los valores reales se configuran en Render o Cloudflare y nunca se guardan en
Git.

## Backend en Render

| Variable | Uso |
| --- | --- |
| DB_URL | JDBC de Neon con sslmode=verify-full |
| DB_APP_USERNAME | Rol limitado de la API |
| DB_APP_PASSWORD | Contraseña del rol limitado |
| DB_MIGRATION_USERNAME | Usuario propietario usado por Flyway |
| DB_MIGRATION_PASSWORD | Contraseña del propietario |
| CORS_ALLOWED_ORIGINS | https://app.<dominio> |
| JWT_SECRET_BASE64 | Generada por Render |
| METADATA_HASH_KEY_BASE64 | Generada por Render |
| UNSPLASH_ACCESS_KEY | Opcional |
| TZ | America/Lima; calendario y cierres de ciclos en la misma zona de negocio |
| HTTP_MAX_REQUEST_BYTES | Opcional, 32768 por defecto; límite de cuerpo API |
| HTTP_REQUEST_LOGS | Opcional, true; logs saneados de HTTP |
| SLOW_REQUEST_MS | Opcional, 2000; advertencia por petición lenta |
| REPORT_MAX_CONCURRENT_PDFS | Opcional, 1; entre 1 y 4 PDFs simultáneos por instancia |
| REPORT_MAX_MOVEMENTS | Opcional, 2000; límite de movimientos por reporte |

El manifiesto ya define SPRING_PROFILES_ACTIVE=prod, cookies seguras, Swagger
privado, Flyway y los límites iniciales del pool.

DB_MIGRATION_URL es opcional. Si no existe, Flyway usa DB_URL, que es la
configuración mínima recomendada para el primer deploy.

## Frontend en Cloudflare

| Variable | Uso |
| --- | --- |
| VITE_API_BASE_URL | https://api.<dominio>/api/v1 |

Las variables VITE_* son públicas. Nunca deben contener contraseñas, tokens o
la clave de Unsplash.

## Copias y recuperación

Los secrets de backups se configuran únicamente en el environment GitHub
`production-backups`, no en Pages ni en la API. Sus nombres, permisos,
retención y activación están en [BACKUP_AND_ROLLBACK.md](BACKUP_AND_ROLLBACK.md).
`EQUIO_BACKUPS_ENABLED=true` activa el workflow; sin configuración no hay
copias automáticas. No reutilizar contraseñas de BD como passphrase del backup.

## Monitor externo

Variables del repositorio GitHub, públicas y sin credenciales:

| Variable | Valor |
| --- | --- |
| EQUIO_MONITOR_ENABLED | true únicamente tras configurar las URLs finales |
| PUBLIC_FRONTEND_ORIGIN | https://app.<dominio> sin ruta |
| PUBLIC_API_ORIGIN | https://api.<dominio> sin /api/v1 |

No usa secretos de BD, sesiones ni tokens de API. Activación/notificaciones y
control de costos: [MONITORING.md](MONITORING.md).

El procedimiento de publicación está en [DEPLOYMENT.md](DEPLOYMENT.md).
Los informes y planes privados no son requisitos para ejecutar el proyecto.

