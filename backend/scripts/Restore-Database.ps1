# Restores only into an empty, explicitly named database. Never uses --clean.
param(
    [Parameter(Mandatory)] [string] $BackupFile,
    [Parameter(Mandatory)] [string] $ConfirmTargetDatabase,
    [switch] $AllowLocal
)
. (Join-Path $PSScriptRoot 'PostgresMaintenance.ps1')
Initialize-Maintenance $AllowLocal.IsPresent
if ($ConfirmTargetDatabase -cne $env:PGDATABASE) { throw 'Confirmation must exactly match PGDATABASE' }
if ((Invoke-PgScalar "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')") -ne '0') {
    throw 'Restore target is not empty. Use a new isolated database, not production.'
}
$backup = (Resolve-Path -LiteralPath $BackupFile).Path
$expected = [IO.File]::ReadAllText($backup + '.sha256').Trim()
if ($expected -notmatch '^[a-fA-F0-9]{64}$' -or
        (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ine $expected) {
    throw 'Backup checksum mismatch'
}
$restoreTool = Get-PgTool 'pg_restore'
$temp = New-MaintenanceTemp 'equio-restore-'
$plain = Join-Path $temp 'database.dump'
try {
    $env:BACKUP_PASSPHRASE | & $script:Gpg --batch --pinentry-mode loopback --passphrase-fd 0 `
        --output $plain --decrypt $backup
    Assert-NativeSuccess 'Backup decryption'
    & $restoreTool --exit-on-error --single-transaction --no-owner --no-privileges --no-password `
        --dbname $env:PGDATABASE $plain
    Assert-NativeSuccess 'Transactional database restore'
    $protected = Invoke-PgScalar "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('categories','movements','budgets','saving_goals','savings_pools','savings_pool_transactions') and c.relrowsecurity and c.relforcerowsecurity"
    $version = Invoke-PgScalar 'select version from flyway_schema_history where success order by installed_rank desc limit 1'
    if ($protected -ne '6' -or [int]$version -lt 14) { throw 'Restored schema/RLS verification failed' }
    Write-Output "Restore complete: schema V$version, six tables with forced RLS. Reapply runtime grants and run security checks before switching traffic."
} finally {
    Remove-MaintenanceTemp $temp $plain
}
