# Script PowerShell pour activer l'environnement virtuel
# Usage: .\activate_env.ps1

Write-Host "Activation de l'environnement virtuel..." -ForegroundColor Green

# Vérifier si l'environnement virtuel existe
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Erreur: L'environnement virtuel n'existe pas!" -ForegroundColor Red
    Write-Host "Créez-le d'abord avec: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Activer l'environnement virtuel
& "venv\Scripts\Activate.ps1"

Write-Host "✅ Environnement virtuel activé!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Installer les dépendances: pip install -r requirements.txt" -ForegroundColor White
Write-Host "2. Démarrer le serveur: python -m api.server" -ForegroundColor White
Write-Host ""

