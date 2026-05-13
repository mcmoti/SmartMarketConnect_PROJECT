# test_stk.ps1
# Simplifies running the STK Push test script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $ScriptDir "Backend"
$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    $VenvPython = "python" # Fallback to global python if venv not found
}

Write-Host "Running STK Push test..." -ForegroundColor Cyan
Set-Location $BackendDir

try {
    & $VenvPython test_stk.py
} finally {
    Set-Location $ScriptDir
}
Write-Host "STK Push test finished." -ForegroundColor Green
