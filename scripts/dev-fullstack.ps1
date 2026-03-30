$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Split-Path -Parent $scriptDir
$backendRoot = Join-Path (Split-Path -Parent $appRoot) "Audit-Service"
$backendPython = Join-Path $backendRoot ".venv\Scripts\python.exe"

function Stop-PortProcess {
  param(
    [int]$Port
  )

  $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if ($existing) {
    $existing | ForEach-Object {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 750
  }
}

if (-not (Test-Path $backendPython)) {
  Write-Error "Backend Python executable not found at $backendPython"
  exit 1
}

Stop-PortProcess -Port 8000
Stop-PortProcess -Port 8081

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  "Set-Location '$backendRoot'; & '$backendPython' -m uvicorn app.main:app --reload --port 8000"
)

Set-Location $appRoot
npx expo start --port 8081 --non-interactive