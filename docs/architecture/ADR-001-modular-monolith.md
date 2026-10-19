# ADR-001: Mantener un monolito modular

- Estado: aceptada
- Fecha: 2026-08-16

## Contexto

Equio tiene un solo equipo, una base PostgreSQL y dominios relacionados que participan en transacciones comunes. Redis, colas, replicas y despliegues independientes no resuelven actualmente un limite medido.

## Decision

Mantener React como frontend estatico y Spring Boot como monolito modular. Los dominios permanecen separados por paquetes y servicios de aplicacion, con reglas ArchUnit para las capas basicas.

El escalado inicial sera vertical. El backend solo se multiplicara cuando una instancia optimizada no cumpla los SLO y se hayan resuelto rate limiting y schedulers compartidos.

## Consecuencias

- Un despliegue y una transaccion local simplifican operacion y consistencia.
- Los limites internos deben revisarse porque el compilador permite imports entre modulos.
- Los cambios entre dominios pueden coordinarse sin mensajeria distribuida.
- Una futura extraccion de servicio exigira primero un contrato estable y evidencia de escalado independiente.

## Criterios de revision

Revisar esta decision si aparecen equipos independientes, necesidades de despliegue desacoplado, cargas radicalmente distintas o limites que no puedan resolverse con optimizacion y escalado vertical.
