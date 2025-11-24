# Script PowerShell pour réinitialiser la base de données corrompue
# Usage: .\reset-database.ps1

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 RÉINITIALISATION DE LA BASE DE DONNÉES" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Chemins possibles de la base de données
$possiblePaths = @(
    "$env:USERPROFILE\.expo\databases\SQLite\fermier_pro.db",
    "$env:USERPROFILE\AppData\Local\expo\databases\SQLite\fermier_pro.db",
    "$env:USERPROFILE\.expo\fermier_pro.db",
    "$PSScriptRoot\fermier_pro.db"
)

$foundPaths = @()

Write-Host "🔍 Recherche de la base de données..." -ForegroundColor Yellow
Write-Host ""

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $foundPaths += $path
        Write-Host "✅ Trouvée: $path" -ForegroundColor Green
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "❌ Aucune base de données trouvée !" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 La base de données sera créée automatiquement au prochain lancement de l'app." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Chemins recherchés:" -ForegroundColor Gray
    foreach ($path in $possiblePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    pause
    exit 0
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ⚠️  AVERTISSEMENT" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cette opération va SUPPRIMER les fichiers suivants:" -ForegroundColor Red
foreach ($path in $foundPaths) {
    Write-Host "  • $path" -ForegroundColor Red
}
Write-Host ""
Write-Host "Toutes vos données seront PERDUES !" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Êtes-vous sûr ? Tapez 'OUI' pour confirmer"

if ($confirmation -ne "OUI") {
    Write-Host ""
    Write-Host "❌ Opération annulée." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 0
}

Write-Host ""
Write-Host "🗑️  Suppression en cours..." -ForegroundColor Yellow
Write-Host ""

$success = $true
foreach ($path in $foundPaths) {
    try {
        Remove-Item -Path $path -Force -ErrorAction Stop
        Write-Host "✅ Supprimé: $path" -ForegroundColor Green
        
        # Supprimer aussi les fichiers -wal et -shm associés (SQLite)
        $walPath = "$path-wal"
        $shmPath = "$path-shm"
        
        if (Test-Path $walPath) {
            Remove-Item -Path $walPath -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Supprimé: $walPath" -ForegroundColor Green
        }
        
        if (Test-Path $shmPath) {
            Remove-Item -Path $shmPath -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Supprimé: $shmPath" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Erreur lors de la suppression de $path : $_" -ForegroundColor Red
        $success = $false
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($success) {
    Write-Host "  ✅ BASE DE DONNÉES RÉINITIALISÉE AVEC SUCCÈS !" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  RÉINITIALISATION PARTIELLE" -ForegroundColor Yellow
}
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Fermez cette fenêtre" -ForegroundColor White
Write-Host "2. Redémarrez l'application:" -ForegroundColor White
Write-Host "   npx expo start --clear" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. La base de données sera recréée automatiquement" -ForegroundColor White
Write-Host "4. Créez un nouveau projet dans l'app" -ForegroundColor White
Write-Host ""
pause

