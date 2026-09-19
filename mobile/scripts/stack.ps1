<#
  op - Docker stack shortcuts for Windows PowerShell (mirrors the Makefile).

  Usage:  .\scripts\stack.ps1 <command>
  Commands: init up prod down stop restart logs ps migrate psql
            rebuild-web native native-down test clean nuke help
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Command = 'help'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Compose { docker compose @args }

function Load-DotEnv {
  $envFile = Join-Path $root '.env'
  $map = @{}
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
    }
  }
  return $map
}

function Ensure-Env {
  if (-not (Test-Path (Join-Path $root '.env'))) {
    Copy-Item (Join-Path $root '.env.example') (Join-Path $root '.env')
    Write-Host 'created .env - edit it before starting the stack' -ForegroundColor Yellow
  }
}

switch ($Command.ToLower()) {
  'help' {
@'
op stack (PowerShell)

  init          Create .env from the template
  up            Start the stack (build if needed), detached
  prod          Production-style start (ignores docker-compose.override.yml)
  down          Stop & remove containers (keeps DB volume)
  stop          Stop containers
  restart       Restart all services
  logs          Tail logs
  ps            Stack status
  migrate       Run DB migrations against the running stack
  psql          psql shell on the bundled Postgres
  rebuild-web   Rebuild only the web app (after changing EXPO_PUBLIC_* in .env)
  native        db + backend + Expo dev server for a physical device
  native-down   Stop the native profile
  test          Run the full local test suite (no Docker)
  clean         down + remove volumes (DROPS the database)
  nuke          clean + remove built images
'@ | Write-Host
  }
  'init'        { Ensure-Env }
  'up'          { Ensure-Env; Compose up -d --build }
  'prod'        { Ensure-Env; Compose -f docker-compose.yml up -d --build }
  'down'        { Compose down }
  'stop'        { Compose stop }
  'restart'     { Compose restart }
  'logs'        { Compose logs -f --tail=100 }
  'ps'          { Compose ps }
  'migrate'     { Compose exec backend bun run db:migrate }
  'psql' {
    $e = Load-DotEnv
    $u = if ($e['POSTGRES_USER']) { $e['POSTGRES_USER'] } else { 'op' }
    $d = if ($e['POSTGRES_DB'])   { $e['POSTGRES_DB'] }   else { 'op' }
    Compose exec db psql -U $u -d $d
  }
  'rebuild-web' { Compose build web; Compose up -d web }
  'native' {
    Ensure-Env
    $e = Load-DotEnv
    if (-not $e['LAN_HOST'] -or $e['LAN_HOST'] -eq '192.168.0.10') {
      Write-Host "Set LAN_HOST in .env to this machine's Wi-Fi IP first (ipconfig)." -ForegroundColor Yellow
    }
    Compose --profile native up -d --build db backend metro
    $port = if ($e['METRO_PORT']) { $e['METRO_PORT'] } else { '8082' }
    Write-Host "Open  exp://$($e['LAN_HOST']):$port  in Expo Go" -ForegroundColor Green
  }
  'native-down' { Compose --profile native down }
  'test'        { bun run test:all }
  'clean'       { Compose down -v }
  'nuke'        { Compose down --rmi local -v }
  default       { Write-Host "unknown command '$Command' - try: .\scripts\stack.ps1 help" -ForegroundColor Red; exit 1 }
}
