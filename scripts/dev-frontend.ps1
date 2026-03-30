$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Split-Path -Parent $scriptDir

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

Set-Location $appRoot
Stop-PortProcess -Port 8081
npx expo start --port 8081 --non-interactive