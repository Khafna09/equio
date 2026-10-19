# Monitoreo, alertas y costos

Actualizado: 2026-10-04. Implementacion P1 sencilla para una instancia de API.
La configuracion de cuentas cloud sigue pendiente; no se han activado alertas
remotas ni creado servicios de pago desde este repositorio.

## Disponibilidad

`.github/workflows/operations-monitor.yml` ejecuta cada hora, o manualmente,
`.github/scripts/monitor-production.mjs`. Comprueba el HTML del frontend por HEAD,
liveness de la API y readiness que incluye PostgreSQL. Exige HTTPS, rechaza
redirecciones/credenciales/rutas en los origenes, espera 15 s por peticion y
limita el cuerpo de health a 4 KiB. No necesita contrasenas ni sesiones.

1. Definir variables GitHub `PUBLIC_FRONTEND_ORIGIN=https://app.<dominio>` y
   `PUBLIC_API_ORIGIN=https://api.<dominio>`.
2. Definir `EQUIO_MONITOR_ENABLED=true` y publicar el workflow en la rama principal.
3. Ejecutarlo manualmente y comprobar resultado correcto.
4. Activar notificaciones de fallos de Actions en la cuenta responsable, incluidas
   CI, monitor y backups. Verificar la entrega mediante una prueba controlada
   con URLs de staging que fallen, sin apagar produccion.
5. Activar notificaciones de despliegue fallido en Render y comprobar el destinatario.

GitHub puede retrasar tareas programadas y sus notificaciones dependen de la
configuracion de cada cuenta: no es un SLA ni un aviso inmediato. El intervalo
horario reduce llamadas y consumo de Actions, pero puede tardar aproximadamente
una hora o mas en detectar una caida. Neon puede despertarse por readiness;
observar consumo/cold starts antes de aumentar frecuencia. Si es necesario un
aviso de minutos, usar despues un monitor administrado compatible con las cuotas.
No cambiar Render de liveness a readiness solo para forzar reinicios por fallos de BD.

## Errores y rendimiento

Los logs de API emiten `http_request` con metodo, plantilla de ruta, status,
durationMs y requestId. No incluyen query strings, cuerpos, credenciales,
identidades de cuenta ni importes. Peticiones de 2 s o mas generan WARN;
5xx generan ERROR. El umbral se ajusta con `SLOW_REQUEST_MS`, y el log HTTP
puede desactivarse con `HTTP_REQUEST_LOGS=false` si se exige menos volumen.

Al lanzar, revisar logs y metricas disponibles en Render diariamente. Umbrales
iniciales propuestos, no mediciones de capacidad ni un SLA:

| Senal | Revisar/actuar |
| --- | --- |
| Monitor o backup fallido | Comprobar HTTPS/health, ultimo deploy y copia anterior; asignar responsable |
| 5xx repetidos | Correlacionar requestId/tipo y desplegar correccion o rollback compatible |
| OPERATION_TIMEOUT recurrente | Revisar consultas, locks y conexiones, no desactivar limites |
| Latencia de rutas comunes >2 s de forma sostenida | Separar cold start de saturacion y medir con carga real |
| Memoria/CPU >80% sostenido o reinicios | Investigar primero; aumentar instancia si las medidas lo justifican |
| Cuotas de BD/transferencia/Actions >80% | Reducir uso innecesario o aprobar cambio de plan |

El monitor externo detecta disponibilidad, no una tasa de 5xx de usuarios
autenticados, errores frontend o todas las reglas financieras. Para alertas
automaticas de esos casos, configurar reglas nativas del proveedor si estan
disponibles por plan; mientras no existan, mantener revision operativa explicita.
No se ha anadido una plataforma de telemetria ni se expone un endpoint publico
con metricas privadas. No registrar payloads para investigar un incidente.

## Presupuesto y limites

Definir un presupuesto mensual aprobado **B**, responsable y destinatario.
Revisar al 80% de B; al 100%, aprobar ampliacion o reducir gasto no esencial.
No apagar la API o eliminar backups automaticamente al recibir una alerta.
Revisar uso/facturas semanalmente, diariamente si aparece un crecimiento anormal.

| Proveedor | Control minimo |
| --- | --- |
| Render | Una instancia fija y sin autoscaling. Notificaciones de deploy fallido. Revisar transferencia, builds y plan de workspace; el limite de pipelines no es un tope de toda la factura. |
| Neon Free | Revisar cuotas y consumo desde la consola, mantener scale-to-zero y evitar ramas sobrantes. No contratar un plan solo para obtener alertas. Al pasar a Launch/Scale, configurar el spending limit: notifica al 80%/100%, pero no suspende computes. |
| Cloudflare | Pages y R2 privado con retencion/lifecycle. Configurar budget alerts para gasto por uso; una alerta no corta el servicio ni garantiza un maximo de factura. |
| GitHub | Revisar minutos de Actions y budget/limites del plan. No aumentar la frecuencia del monitor ni CI sin considerar consumo. |
| Unsplash | Mantener el secreto en backend y el rate limit existente; revisar cuota/errores antes de cualquier cambio de servicio. |

Los umbrales de B no estan embebidos en codigo, porque precios/planes y permisos
dependen de las cuentas reales. Conservar evidencia de configuracion y de la
recepcion de avisos antes de marcar estos pendientes como terminados.

Fuentes oficiales consultadas: [notificaciones Render](https://render.com/docs/notifications),
[gasto de pipelines Render](https://render.com/docs/build-pipeline),
[spending limit Neon](https://api-docs.neon.tech/reference/setorganizationspendinglimit),
[facturacion por uso Cloudflare](https://developers.cloudflare.com/billing/understand/usage-based-billing/).

## Respuesta minima a incidentes

1. Confirmar impacto mediante health y un flujo de navegador, sin usar credenciales
   de usuarios ni ejecutar smokes destructivos contra produccion.
2. Buscar requestId y tipo de error, revisar el ultimo cambio y estado de BD/proveedor.
3. Corregir o volver a una version compatible con las migraciones aplicadas.
4. Restaurar solo si hay perdida/corrupcion, siguiendo BACKUP_AND_ROLLBACK.md
   y verificando datos/roles/RLS en staging antes de sustituir produccion.
5. Documentar causa, duracion, accion y prueba que evita la regresion.

Recuperacion y cambio de contrasena permanecen excluidos de P1 por decision
del usuario. No se han anadido endpoints, servicios de email ni tokens de reset.
