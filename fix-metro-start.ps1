# Script pour permettre à Metro de démarrer en gérant les problèmes jsdom
# Ce script renomme temporairement jsdom pour éviter les erreurs lstat

Write-Host "🔧 Fix pour permettre à Metro de démarrer" -ForegroundColor Cyan
Write-Host ""

$jsdomPath = "node_modules\jsdom"

if (Test-Path $jsdomPath) {
    Write-Host "📦 Package jsdom trouvé" -ForegroundColor Yellow
    
    # Renommer jsdom temporairement
    $jsdomBackup = "node_modules\jsdom.backup"
    
    if (Test-Path $jsdomBackup) {
        Write-Host "⚠️  Backup jsdom existe déjà" -ForegroundColor Yellow
        Write-Host "   Suppression du backup existant..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $jsdomBackup -ErrorAction SilentlyContinue
    }
    
    Write-Host "   Renommage de jsdom en jsdom.backup..." -ForegroundColor Gray
    Rename-Item -Path $jsdomPath -NewName "jsdom.backup" -ErrorAction Stop
    
    Write-Host "✅ jsdom renommé avec succès" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Vous pouvez maintenant démarrer Metro:" -ForegroundColor Cyan
    Write-Host "   npx expo start --clear" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Pour restaurer jsdom plus tard:" -ForegroundColor Yellow
    Write-Host "   Rename-Item node_modules\jsdom.backup node_modules\jsdom" -ForegroundColor Gray
} else {
    Write-Host "ℹ️  jsdom n'existe pas ou a déjà été renommé" -ForegroundColor Gray
    Write-Host "   Metro devrait pouvoir démarrer normalement" -ForegroundColor Gray
}

