# This script starts ngrok and updates the Django backend's .env file

Write-Host "Starting ngrok on port 8000..." -ForegroundColor Cyan

# Start ngrok in the background and redirect output
# Ensure ngrok is installed or downloaded, we assume it's in PATH or downloaded via npm if npx ngrok is available
try {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx", "--yes", "ngrok", "http", "8000", "--log", "stdout" -NoNewWindow -RedirectStandardOutput "ngrok_output.log" -PassThru
} catch {
    Write-Host "ngrok could not be started. Make sure it is installed and in your PATH." -ForegroundColor Red
    Write-Host "Alternatively, if you installed it via npm, run: npx ngrok http 8000" -ForegroundColor Yellow
    exit
}

Write-Host "Waiting for ngrok to initialize..."
Start-Sleep -Seconds 3

# Extract the public URL
$ngrokUrl = Select-String -Path "ngrok_output.log" -Pattern "url=(https://[a-zA-Z0-9-]+\.ngrok-free\.(app|dev))" | Select-Object -First 1 | ForEach-Object { $_.Matches.Groups[1].Value }

if ([string]::IsNullOrEmpty($ngrokUrl)) {
    Write-Host "Failed to extract ngrok URL. You can view the url manually from the ngrok terminal." -ForegroundColor Red
} else {
    Write-Host "-------------------------------------" -ForegroundColor DarkGreen
    Write-Host "Success! ngrok is live." -ForegroundColor Green
    Write-Host "Public URL: $ngrokUrl" -ForegroundColor White
    Write-Host "-------------------------------------" -ForegroundColor DarkGreen
    Write-Host ""
    Write-Host "Automatically updating Backend/.env with NGROK_URL..." -ForegroundColor Cyan
    
    $envPath = "Backend/.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        if ($envContent -match "(?m)^NGROK_URL=.*") {
            $envContent = $envContent -replace "(?m)^NGROK_URL=.*", "NGROK_URL=$ngrokUrl"
        } else {
            $envContent += "`nNGROK_URL=$ngrokUrl"
        }
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host "Backend/.env updated successfully." -ForegroundColor Green
    } else {
        Write-Host "Could not find Backend/.env file to update automatically." -ForegroundColor Red
    }
}

Write-Host "ngrok is running in the background. Press Ctrl+C to exit when you want to stop it."
