# Copias cifradas, restauración y rollback

## Herramientas y secretos

Requisitos: PowerShell 7, clientes PostgreSQL 18, GnuPG; AWS CLI solo para R2.
El dump incluye datos, esquema, restricciones, RLS y Flyway; no incluye roles
PostgreSQL/contraseñas ni secretos/configuración de Render.

Variables de entorno, nunca en Git ni `VITE_*`:

| Variable | Uso |
| --- | --- |
| `PGHOST`, `PGPORT`, `PGDATABASE` | Endpoint directo, puerto y base |
| `PGUSER`, `PGPASSWORD` | Credencial de mantenimiento, no runtime |
| `PGSSLMODE` | `verify-full` fuera de pruebas desechables locales |
| `PGSSLROOTCERT` | `system` con libpq 18 o ruta a CA confiable |
| `BACKUP_PASSPHRASE` | Aleatoria, al menos 32 caracteres, distinta a passwords de BD |
| `PG_BIN`, `GPG_BIN` | Opcionales: ubicación de herramientas |
| `R2_ENDPOINT`, `R2_BUCKET` | Endpoint de cuenta R2 y bucket privado |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credencial R2 limitada al bucket |

La credencial de mantenimiento necesita leer todas las filas con FORCE RLS.
Los scripts verifican `BYPASSRLS`/superusuario; confirmar permisos reales del
rol administrativo de Neon. No usar `--enable-row-security` ni desactivar RLS
para silenciar errores: podría producirse un dump incompleto. La API conserva
el rol limitado sin BYPASSRLS; el desarrollador conserva acceso administrativo.

Guardar la passphrase en un gestor de contraseñas y mantener una copia
independiente. Perderla impide recuperar los backups. La rotación debe conservar
las claves necesarias para las copias todavía vigentes.

## Crear y programar copias

Desde la raíz:

```powershell
./backend/scripts/Backup-Database.ps1 -OutputDirectory ./backend/target/backups
./backend/scripts/Backup-Database.ps1 -OutputDirectory ./backend/target/backups -UploadToR2
```

La segunda orden es opcional. `pg_dump` obtiene un snapshot consistente;
GnuPG cifra con AES-256 y se calcula SHA-256 del archivo cifrado. Solo se
suben `.dump.gpg` y `.sha256`, que se conservan juntos. El plaintext temporal
se elimina en `finally`, incluso al fallar; usar disco temporal privado/cifrado.
Los dumps están ignorados por Git.

En Windows se recomienda Gpg4win. El GnuPG de Git requiere `GNUPGHOME` con
ruta MSYS (`/c/Users/usuario/...`), no con `C:` para el socket del agente.

Para activar `.github/workflows/database-backup.yml`:

1. Crear un bucket R2 privado, sin dominio público ni `r2.dev`.
2. Configurar lifecycle/retención de 30 días en el prefijo `equio/`.
3. Crear el environment GitHub `production-backups` con acceso restringido.
4. Añadir secrets `BACKUP_PGHOST`, `BACKUP_PGDATABASE`, `BACKUP_PGUSER`,
   `BACKUP_PGPASSWORD`, `BACKUP_PASSPHRASE`, `R2_ENDPOINT`, `R2_BUCKET`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
5. Activar la variable de repositorio `EQUIO_BACKUPS_ENABLED=true`.
6. Ejecutar manualmente, comprobar ambos objetos y una restauración de staging.
7. Confirmar notificaciones de fallos de GitHub y revisar antigüedad de copias.

Sin estos pasos el workflow está intencionalmente desactivado. GitHub schedules
pueden retrasarse: no son un SLA. Objetivo inicial RPO de unas 24 horas y RTO
objetivo de 1–2 horas, sujeto al ensayo de restauración; no son garantías medidas.

## Restauración aislada

1. Crear una base/rama **nueva y vacía**, nunca sobrescribir producción.
2. Descargar `.dump.gpg` y `.sha256`; configurar `PG*` con el destino nuevo.
3. Usar la passphrase correspondiente y confirmar exactamente `PGDATABASE`:

```powershell
./backend/scripts/Restore-Database.ps1 -BackupFile ./equio.dump.gpg -ConfirmTargetDatabase equio_restore
```

Se rechazan destinos con tablas/vistas/secuencias. Se verifica checksum,
descifra y restaura en una sola transacción. Después se comprueba Flyway y
las seis tablas con FORCE RLS. No se ejecuta `--clean`.

4. Recrear/reconfigurar el rol con `DatabaseRoleSetup.java`, dirigido al destino
   restaurado. El dump omite owners/ACL: reaplicar permisos es obligatorio.
5. Ejecutar `DatabaseSecurityCheck.java`, arrancar una API aislada y comparar
   usuarios, movimientos, saldos y reportes; comprobar aislamiento entre cuentas.
6. Solo entonces cambiar `DB_URL`/`DB_MIGRATION_URL` y reabrir tráfico. Mantener
   la base anterior hasta dar por válida la recuperación.

`-AllowLocal` solo permite desactivar TLS en loopback para tests desechables.
No sirve como excepción de producción. La copia cifrada y restauración local
se ensayaron en una segunda base vacía; no se tocaron datos del desarrollador.

## Rollback

Antes de migraciones: copia reciente, commit/imagen desplegada, versión Flyway,
configuración y ensayo en staging. Preferir migraciones correctivas hacia adelante.

- Pages: restaurar deployment anterior solo si es compatible con la API vigente.
- Render: restaurar commit/imagen solo si contrato, esquema y reglas de seguridad
  son compatibles. No volver a una API anterior a V13/V14 para eludir controles.
- BD: Flyway no genera reversión automática. Si es imprescindible recuperar,
  detener escrituras y restaurar en una base nueva con los pasos anteriores.
- Una recuperación pierde escrituras posteriores al backup: determinar el
  intervalo, comunicarlo y reconciliarlo antes de aceptar movimientos nuevos.

No usar `flyway clean`, editar checksums ni borrar producción como rollback.
