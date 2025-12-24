# Helper script to start the FarmTrack project
# This script navigates to the correct directory and starts the development server

Write-Host "Navigating to project directory..." -ForegroundColor Cyan
Set-Location -Path "developpement_farm"

if (Test-Path "package.json") {
    Write-Host "Found package.json. Starting development server..." -ForegroundColor Green
    npm start
} else {
    Write-Host "Error: package.json not found in developpement_farm directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

