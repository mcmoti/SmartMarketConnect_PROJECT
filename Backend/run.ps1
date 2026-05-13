# ============================================================
# Smart Market Connect — Django Backend Runner
# Run from the Backend directory: .\run.ps1
# Optional: .\run.ps1 -Port 8000   (try a specific port first)
# ============================================================

param(
    [int]$Port = 8000
)

# Resolve paths relative to this script's location
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$VenvPython = Join-Path $ScriptDir "..\\.venv\Scripts\python.exe"

# Fallback: look for a local venv too
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Cannot find Python in ..\.venv or .venv. Run setup first." -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $VenvPython" -ForegroundColor Cyan

# ---- Port availability check -----------------------------------------------
function Test-PortFree([int]$p) {
    $reserved = netsh interface ipv4 show excludedportrange protocol=tcp 2>$null |
        Select-String "(\d+)\s+(\d+)" |
        ForEach-Object {
            $m = $_.Matches[0].Groups
            [pscustomobject]@{ Start=[int]$m[1].Value; End=[int]$m[2].Value }
        }
    foreach ($r in $reserved) {
        if ($p -ge $r.Start -and $p -le $r.End) { return $false }
    }
    $tcp = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    try   { $tcp.Start(); $tcp.Stop(); return $true }
    catch { return $false }
}

$candidatePorts = @($Port, 8080, 8888, 9000, 9090, 7000, 7777)
$chosenPort = $null
foreach ($p in $candidatePorts) {
    if (Test-PortFree $p) { $chosenPort = $p; break }
}

if ($null -eq $chosenPort) {
    Write-Host "[ERROR] Could not find a free port. Tried: $($candidatePorts -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SMC Django Backend" -ForegroundColor Green
Write-Host "  http://127.0.0.1:$chosenPort" -ForegroundColor Green
Write-Host "  API Docs: http://127.0.0.1:$chosenPort/api/docs/" -ForegroundColor Green
Write-Host "  Admin:    http://127.0.0.1:$chosenPort/admin/" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# ---- Launch server ---------------------------------------------------------
Set-Location $ScriptDir
& $VenvPython manage.py runserver "127.0.0.1:$chosenPort"
