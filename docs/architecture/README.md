# Arquitectura de Equio

## Enfoque

Equio es un monolito modular. Esta forma permite desplegar una sola aplicacion mientras mantiene limites de dominio suficientemente claros para un equipo pequeno. Separar servicios de red o bases de datos no es un objetivo hasta que exista una necesidad medida.

## Backend

Los modulos funcionales son `users`, `transactions`, `budgets`, `savings`, `images` y `dashboard`. `dashboard` es un modulo de composicion de solo lectura; los demas poseen sus datos y reglas.

```text
controllers -> services -> repositories -> entities
                    |
                    +-> dto
```

Reglas:

- Los controladores traducen HTTP y delegan casos de uso; no acceden a repositorios.
- Los servicios controlan transacciones, autorizacion y reglas de negocio.
- Los repositorios encapsulan persistencia y no se exponen a controladores.
- Entidades y DTO no dependen de controladores, servicios o repositorios.
- `shared` contiene infraestructura transversal y contratos de integracion, no reglas propias de un dominio.
- Un servicio solo accede a repositorios de su propio modulo. Las consultas externas pasan por servicios de aplicacion y los efectos laterales entre dominios se publican como eventos sincronicos.

`ArchitectureRulesTest` comprueba paquetes, repositorios y direcciones entre servicios con ArchUnit. Una excepcion nueva debe estar justificada en una ADR, tener responsable y fecha de revision; no se debe debilitar una regla para hacer pasar un cambio aislado.

`MovementQueryService`, `CategoryLookupService`, `UserLookupService` y `BudgetLookupService` son fachadas de lectura/referencia. `ExpenseRecordedEvent` y `BudgetLinkRemovalRequestedEvent` eliminan llamadas bidireccionales conservando una unica transaccion local.

El reporte historico separa composicion y renderizado: `BudgetHistoryPdfService` prepara contenido localizado y `BudgetHistoryPdfWriter` encapsula PDFBox y el layout.

## Frontend

La organizacion sigue dominios en `features`, acceso remoto en `api`, estado de servidor en `hooks`, contratos en `types` y componentes reutilizables en `components`.

Reglas:

- Los componentes no crean clientes HTTP; usan hooks o funciones de `api`.
- `queryCache.ts` es la fuente unica de claves, tiempos de frescura e invalidacion por dominio.
- Una mutacion debe invalidar todos los datos derivados desde las claves raiz.
- La logica pura se extrae de modales y vistas para poder probarla sin DOM.
- Una vista coordina datos y estado; secciones independientes, calendarios y drawers viven en componentes propios.
- Datos financieros y tokens no se persisten en el cache del navegador.

Extracciones actuales:

- `HistoryCalendar` contiene navegacion diaria, mensual y anual.
- `BudgetHistoryMovementsDrawer` contiene el panel lateral del reporte.
- `budgetPeriod.ts` calcula ciclos fijos sin depender del modal.
- `SavingsCard` y `BudgetActionModals` encapsulan formularios y confirmaciones.
- `budgetMetrics.ts` y `useBudgetOrder.ts` separan calculos y persistencia del orden visual.

## Pruebas

- Backend: `mvnw test` ejecuta reglas de arquitectura, contexto, seguridad y reglas de reporte.
- Frontend: `npm run test` ejecuta Vitest sobre logica pura y contratos de cache.
- CI ejecuta pruebas, lint, paridad i18n, build y analisis de dependencias.

Las siguientes prioridades son integracion con PostgreSQL real para Flyway/RLS, pruebas de contrato OpenAPI y E2E de los flujos principales.

## Cambios estructurales

Antes de una refactorizacion amplia:

1. Identificar la responsabilidad y el acoplamiento que se quiere reducir.
2. Proteger el comportamiento actual con una prueba.
3. Mover una frontera por vez sin cambiar contratos publicos innecesariamente.
4. Ejecutar backend y frontend completos.
5. Registrar una ADR cuando cambie una decision transversal o dificil de revertir.

## Deuda conocida

- `BudgetServiceImpl`, `BudgetHistoryReportService` y `BudgetDrawer` aun concentran varios casos de uso.
- Las asociaciones JPA entre `User`, `Category`, `Budget` y `SavingGoal` mantienen acoplamiento de modelo. Cambiarlas por identificadores requiere una migracion de esquema y no debe hacerse sin pruebas PostgreSQL.
- Los contratos TypeScript se mantienen manualmente frente a OpenAPI.
- Faltan pruebas frontend de componentes y E2E, y pruebas PostgreSQL de RLS/migraciones.
- El bundle de graficos sigue generando un chunk grande y requiere una estrategia de carga diferida especifica.
