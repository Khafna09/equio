# Requires PowerShell 7, PostgreSQL client tools and GnuPG. Credentials are environment-only.
param(
    [Parameter(Mandatory)] [string] $OutputDirectory,
    [switch] $UploadToR2,
    [switch] $AllowLocal
)
. (Join-Path $PSScriptRoot 'PostgresMaintenance.ps1')
Initialize-Maintenance $AllowLocal.IsPresent
$dumpTool = Get-PgTool 'pg_dump'
$output = [IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($OutputDirectory)).FullName
$name = 'equio-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N')
$encrypted = Join-Path $output ($name + '.dump.gpg')
$temp = New-MaintenanceTemp 'equio-backup-'
$plain = Join-Path $temp 'database.dump'
try {
    & $dumpTool --format=custom --no-owner --no-privileges --no-password --file $plain
    Assert-NativeSuccess 'Database backup'
    $env:BACKUP_PASSPHRASE | & $script:Gpg --batch --pinentry-mode loopback --passphrase-fd 0 `
        --symmetric --cipher-algo AES256 --output $encrypted $plain
    Assert-NativeSuccess 'Backup encryption'
    $hash = (Get-FileHash -LiteralPath $encrypted -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($encrypted + '.sha256', $hash + "`n", [Text.UTF8Encoding]::new($false))
    if ($UploadToR2) {
        $endpoint = Require-Environment 'R2_ENDPOINT'
        $bucket = Require-Environment 'R2_BUCKET'
        if ($endpoint -notmatch '^https://[a-f0-9]{32}\.r2\.cloudflarestorage\.com$' -or
                $bucket -notmatch '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$') { throw 'Invalid private R2 destination' }
        $null = Require-Environment 'AWS_ACCESS_KEY_ID'
        $null = Require-Environment 'AWS_SECRET_ACCESS_KEY'
        foreach ($file in @($encrypted, $encrypted + '.sha256')) {
            & aws s3 cp $file ("s3://$bucket/equio/" + [IO.Path]::GetFileName($file)) `
                --endpoint-url $endpoint --region auto --only-show-errors
            Assert-NativeSuccess 'Encrypted R2 upload'
        }
    }
    Write-Output "Backup complete: $encrypted"
} finally {
    Remove-MaintenanceTemp $temp $plain
}
