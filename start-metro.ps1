# Script PowerShell pour démarrer Metro avec la variable CI=true
# Cela permet d'ignorer certaines erreurs du FallbackWatcher sur Windows
# Usage: .\start-metro.ps1 [options]

param(
    [switch]$ClearCache,
    [switch]$Web,
    [switch]$Android,
    [switch]$IOS
)

# Ne pas utiliser CI=true car cela désactive le watch mode
# Les erreurs du FallbackWatcher seront gérées dans metro.config.js
# S'assurer que CI n'est PAS défini avant de démarrer
if ($env:CI) {
    Remove-Item Env:CI -ErrorAction SilentlyContinue
    Write-Host "⚠️  Variable CI retirée (elle désactive le watch mode)" -ForegroundColor Yellow
}

# Construire la commande expo avec npx
$expoCommand = "npx expo start"

if ($ClearCache) {
    $expoCommand += " --clear"
}

if ($Web) {
    $expoCommand += " --web"
}

if ($Android) {
    $expoCommand += " --android"
}

if ($IOS) {
    $expoCommand += " --ios"
}

# S'assurer que CI n'est pas défini
if ($env:CI) {
    Remove-Item Env:CI
    Write-Host "⚠️  Variable CI retirée (elle désactive le watch mode)" -ForegroundColor Yellow
}

Write-Host "🚀 Démarrage de Metro (erreurs FallbackWatcher gérées dans metro.config.js)" -ForegroundColor Cyan
Write-Host "Commande: $expoCommand" -ForegroundColor Gray
Write-Host ""

# Exécuter la commande
Invoke-Expression $expoCommand

