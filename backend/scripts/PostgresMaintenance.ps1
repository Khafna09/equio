Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-Environment([string] $Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing environment variable: $Name" }
    return $value
}

function Get-PgTool([string] $Name) {
    if ($env:PG_BIN) {
        $path = Join-Path $env:PG_BIN $Name
        if ($IsWindows) { $path += '.exe' }
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing PostgreSQL tool: $Name" }
        return $path
    }
    return (Get-Command $Name -ErrorAction Stop).Source
}

function Initialize-Maintenance([bool] $AllowLocal) {
    foreach ($name in @('PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'BACKUP_PASSPHRASE')) {
        $null = Require-Environment $name
    }
    if ($env:BACKUP_PASSPHRASE.Length -lt 32 -or $env:BACKUP_PASSPHRASE -match '[\r\n]') {
        throw 'Use a random backup passphrase of at least 32 characters without newlines'
    }
    if ($env:PGDATABASE -notmatch '^[A-Za-z0-9_]+$' -or $env:PGDATABASE -in @('postgres', 'template0', 'template1')) {
        throw 'Use a dedicated application or restore database'
    }
    if ($env:PGSSLMODE -ne 'verify-full') {
        if (-not $AllowLocal -or $env:PGHOST -notin @('localhost', '127.0.0.1', '::1') -or $env:PGSSLMODE -ne 'disable') {
            throw 'Remote maintenance requires PGSSLMODE=verify-full; only disposable loopback tests may disable TLS'
        }
    }
    $env:PGCONNECT_TIMEOUT = '15'
    $env:PGCLIENTENCODING = 'UTF8'
    $script:Psql = Get-PgTool 'psql'
    $script:Gpg = if ($env:GPG_BIN) { $env:GPG_BIN } else { (Get-Command gpg -ErrorAction Stop).Source }
    $privileged = Invoke-PgScalar "select rolsuper or rolbypassrls from pg_roles where rolname = current_user"
    if ($privileged -ne 't') {
        throw 'Use a restricted maintenance credential with BYPASSRLS, never the application role. Do not disable RLS to make a dump work.'
    }
}

function Assert-NativeSuccess([string] $Operation) {
    if ($LASTEXITCODE -ne 0) { throw "$Operation failed (exit $LASTEXITCODE)" }
}

function Invoke-PgScalar([string] $Sql) {
    $result = & $script:Psql -X -A -t --no-password -v ON_ERROR_STOP=1 -c $Sql
    Assert-NativeSuccess 'PostgreSQL verification'
    return ($result -join "`n").Trim()
}

function Remove-MaintenanceTemp([string] $Directory, [string] $File) {
    $root = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $resolved = [IO.Path]::GetFullPath($Directory)
    if (-not $resolved.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or
            [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($File)) -ne $resolved) {
        throw 'Refusing cleanup outside the temporary maintenance directory'
    }
    if (Test-Path -LiteralPath $File) { Remove-Item -LiteralPath $File -Force }
    if (Test-Path -LiteralPath $resolved) { [IO.Directory]::Delete($resolved, $false) }
}

function New-MaintenanceTemp([string] $Prefix) {
    $path = Join-Path ([IO.Path]::GetTempPath()) ($Prefix + [Guid]::NewGuid().ToString('N'))
    $null = [IO.Directory]::CreateDirectory($path)
    if (-not $IsWindows) {
        [IO.File]::SetUnixFileMode($path, [IO.UnixFileMode]::UserRead -bor
                [IO.UnixFileMode]::UserWrite -bor [IO.UnixFileMode]::UserExecute)
    }
    return $path
}
