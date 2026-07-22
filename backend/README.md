# Equio Backend

API REST de Equio para autenticacion, perfiles, categorias, movimientos, presupuestos y metas de ahorro. Esta construido con Spring Boot, Spring Security, JWT, Spring Data JPA y PostgreSQL.

## Requisitos

- Java 21
- Maven Wrapper incluido (`mvnw` / `mvnw.cmd`)
- PostgreSQL local o remoto

## Configuracion

La aplicacion lee credenciales y parametros sensibles desde variables de entorno. Para desarrollo local se usan defaults no sensibles cuando aplica.

| Variable | Default | Descripcion |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/equio` | URL JDBC de PostgreSQL |
| `DB_USERNAME` | `postgres` | Usuario de base de datos |
| `DB_PASSWORD` | vacio | Password de base de datos |
| `SERVER_PORT` | `8081` | Puerto HTTP |
| `JWT_SECRET` | desarrollo local | Secreto HS256; usar un valor largo y privado en produccion |
| `JWT_EXPIRATION_MS` | `36000000` | Duracion del token en milisegundos |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Origenes permitidos separados por coma |
| `JPA_DDL_AUTO` | `update` | Estrategia de Hibernate |
| `JPA_SHOW_SQL` | `false` | Log SQL |

## Ejecucion

```bash
./mvnw spring-boot:run
```

En Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

La API queda disponible en `http://localhost:8081/api/v1` y Swagger UI en `http://localhost:8081/swagger-ui.html`.

## Estructura

- `src/main/java/com/equio/backend/users`: autenticacion, usuarios, roles y perfiles.
- `src/main/java/com/equio/backend/transactions`: categorias, movimientos y dashboard financiero.
- `src/main/java/com/equio/backend/budgets`: presupuestos globales, por categoria e historial.
- `src/main/java/com/equio/backend/savings`: metas de ahorro y aportes/retiros.
- `src/main/java/com/equio/backend/shared`: configuracion transversal, seguridad, entidades base y manejo de excepciones.
- `src/main/resources/application.yaml`: configuracion parametrizada por entorno.

## Seguridad y buenas practicas

- Los endpoints de negocio requieren JWT Bearer.
- Las rutas publicas se limitan a autenticacion, Swagger y `/error`.
- CORS se configura por variable de entorno; evita usar comodines en produccion.
- Las credenciales de base de datos y el secreto JWT no deben subirse al repositorio.
- Las operaciones por usuario validan la propiedad de los recursos antes de leer o mutar datos.
- Las respuestas de error generales no exponen detalles internos.

## Verificacion

```bash
./mvnw test
```