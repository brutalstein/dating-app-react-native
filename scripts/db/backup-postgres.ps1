param(
    [string]$EnvFile = "$PSScriptRoot\db.env",
    [string]$OutputDir = "",
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
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
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

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $PSScriptRoot 'backups' }
}

$required = @{'DB_HOST'=$dbHost; 'DB_NAME'=$dbName; 'DB_USER'=$dbUser; 'DB_PASSWORD'=$dbPassword}
$missing = $required.GetEnumerator() | Where-Object { [string]::IsNullOrWhiteSpace($_.Value) } | Select-Object -ExpandProperty Key
if ($missing.Count -gt 0) {
    throw "Missing required settings: $($missing -join ', '). Set env vars or use $EnvFile"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $OutputDir ("{0}_{1}.dump" -f $dbName, $timestamp)

$pgDumpExe = if ([string]::IsNullOrWhiteSpace($pgBin)) { 'pg_dump' } else { Join-Path $pgBin 'pg_dump.exe' }
$args = @('-h', $dbHost, '-p', $dbPort, '-U', $dbUser, '-d', $dbName, '-F', 'c', '--no-owner', '--no-privileges', '-f', $backupFile)

Write-Host "[backup] host=$dbHost port=$dbPort db=$dbName user=$dbUser"
Write-Host "[backup] output=$backupFile"
Write-Host "[backup] command=$pgDumpExe $($args -join ' ')"

if ($DryRun) {
    Write-Host '[backup] Dry-run completed.'
    exit 0
}

$env:PGPASSWORD = $dbPassword
& $pgDumpExe @args
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

if (!(Test-Path $backupFile)) {
    throw "Backup file was not created: $backupFile"
}

$fileInfo = Get-Item $backupFile
if ($fileInfo.Length -lt 1024) {
    throw "Backup file is suspiciously small ($($fileInfo.Length) bytes): $backupFile"
}

$bytes = [System.IO.File]::ReadAllBytes($backupFile)
$header = [System.Text.Encoding]::ASCII.GetString($bytes, 0, [Math]::Min(5, $bytes.Length))
if ($header -ne 'PGDMP') {
    throw "Backup file header validation failed (expected PGDMP)."
}

Write-Host "[backup] OK size=$($fileInfo.Length) bytes"
