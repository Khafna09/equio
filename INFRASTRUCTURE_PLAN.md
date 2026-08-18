# Infraestructura mínima para el primer deploy

> Estado: el repositorio contiene lo necesario para desplegar Equio en
> Cloudflare Pages, Render Starter y Neon Free.

## Arquitectura inicial

- Frontend React estático en Cloudflare Pages.
- Backend Spring Boot en una sola instancia de Render Starter.
- PostgreSQL en Neon Free.
- Un único repositorio y despliegues automáticos después de CI.

No se necesitan Redis, colas, workers, réplicas, Kubernetes, balanceadores
adicionales ni una estrategia multirregión para el primer despliegue.

## Ya implementado

- Dockerfile del backend y render.yaml.
- Puerto dinámico de Render y health check de liveness.
- Migraciones Flyway automáticas.
- Pool de base de datos limitado a cinco conexiones.
- Build del frontend con URL HTTPS obligatoria y _headers para Cloudflare.
- CI con pruebas de backend y frontend, lint, traducciones y build.
- Variables y secretos fuera del repositorio.
- TLS, CORS, cookies seguras, RLS, rate limiting y validación de producción.

## Únicos pendientes para desplegar

- [ ] Confirmar y subir a Git todos los cambios actuales.
- [ ] Crear la base en Neon y un rol SQL limitado para la aplicación.
- [ ] Crear el servicio de Render desde render.yaml y cargar sus secretos.
- [ ] Configurar app.<dominio> y api.<dominio> bajo el mismo dominio.
- [ ] Crear el proyecto de Cloudflare Pages y definir VITE_API_BASE_URL.
- [ ] Comprobar registro, login, refresh, movimientos, presupuestos, metas y PDF.

El procedimiento y los valores exactos están en
docs/operations/DEPLOYMENT.md.

## Capacidad inicial

Una instancia Starter con un pool de cinco conexiones es suficiente como punto
de partida para aproximadamente 1.000 cuentas con uso normal. El límite real
dependerá de movimientos por usuario, concurrencia y cuotas de Neon. Solo se
revisará infraestructura cuando las métricas reales muestren saturación.

