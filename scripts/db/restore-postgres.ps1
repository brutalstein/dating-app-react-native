param(
    [string]$EnvFile = "$PSScriptRoot\db.env",
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [switch]$Clean,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Load-EnvFile([string]$Path) {
    if (!(Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { return }
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
        }
    }
}

Load-EnvFile $EnvFile

$dbHost = $env:DB_HOST
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { '5432' }
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbPassword = $env:DB_PASSWORD
$pgBin = $env:PG_BIN

$required = @{'DB_HOST'=$dbHost; 'DB_NAME'=$dbName; 'DB_USER'=$dbUser; 'DB_PASSWORD'=$dbPassword}
$missing = $required.GetEnumerator() | Where-Object { [string]::IsNullOrWhiteSpace($_.Value) } | Select-Object -ExpandProperty Key
if ($missing.Count -gt 0) {
    throw "Missing required settings: $($missing -join ', '). Set env vars or use $EnvFile"
}

if (!(Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$bytes = [System.IO.File]::ReadAllBytes($BackupFile)
$header = [System.Text.Encoding]::ASCII.GetString($bytes, 0, [Math]::Min(5, $bytes.Length))
if ($header -ne 'PGDMP') {
    throw "Input is not a PostgreSQL custom-format dump (PGDMP header missing): $BackupFile"
}

$pgRestoreExe = if ([string]::IsNullOrWhiteSpace($pgBin)) { 'pg_restore' } else { Join-Path $pgBin 'pg_restore.exe' }
$args = @('-h', $dbHost, '-p', $dbPort, '-U', $dbUser, '-d', $dbName, '--no-owner', '--no-privileges')
if ($Clean) { $args += '--clean'; $args += '--if-exists' }
$args += $BackupFile

Write-Host "[restore] host=$dbHost port=$dbPort db=$dbName user=$dbUser"
Write-Host "[restore] source=$BackupFile"
Write-Host "[restore] command=$pgRestoreExe $($args -join ' ')"

if ($DryRun) {
    Write-Host '[restore] Dry-run completed.'
    exit 0
}

$env:PGPASSWORD = $dbPassword
& $pgRestoreExe @args
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE"
}

Write-Host '[restore] OK'
