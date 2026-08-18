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

