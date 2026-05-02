# Script PowerShell pour installer les dépendances
# Usage: .\install_dependencies.ps1

Write-Host "Installation des dépendances Python..." -ForegroundColor Green

# Vérifier si l'environnement virtuel est activé
if (-not $env:VIRTUAL_ENV) {
    Write-Host "⚠️  L'environnement virtuel n'est pas activé!" -ForegroundColor Yellow
    Write-Host "Activation de l'environnement virtuel..." -ForegroundColor Cyan
    
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & "venv\Scripts\Activate.ps1"
    } else {
        Write-Host "❌ Erreur: L'environnement virtuel n'existe pas!" -ForegroundColor Red
        Write-Host "Créez-le d'abord avec: python -m venv venv" -ForegroundColor Yellow
        exit 1
    }
}

# Mettre à jour pip
Write-Host "Mise à jour de pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Installer les dépendances
Write-Host "Installation des dépendances depuis requirements.txt..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host ""
Write-Host "✅ Installation terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "Vérification de l'installation..." -ForegroundColor Cyan

# Vérifier les packages principaux
$packages = @("torch", "cv2", "fastapi", "numpy", "yaml")
$allOk = $true

foreach ($package in $packages) {
    try {
        python -c "import $package" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $package" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $package" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  ❌ $package" -ForegroundColor Red
        $allOk = $false
    }
}

if ($allOk) {
    Write-Host ""
    Write-Host "✅ Toutes les dépendances sont installées correctement!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Certaines dépendances ne sont pas installées. Réessayez l'installation." -ForegroundColor Yellow
}

