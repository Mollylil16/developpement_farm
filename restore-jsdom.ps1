# Script pour restaurer jsdom après avoir démarré Metro

Write-Host "🔄 Restauration de jsdom" -ForegroundColor Cyan
Write-Host ""

$jsdomBackup = "node_modules\jsdom.backup"
$jsdomPath = "node_modules\jsdom"

if (Test-Path $jsdomBackup) {
    if (Test-Path $jsdomPath) {
        Write-Host "⚠️  jsdom existe déjà" -ForegroundColor Yellow
        Write-Host "   Suppression de l'ancien jsdom..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $jsdomPath -ErrorAction SilentlyContinue
    }
    
    Write-Host "   Restauration de jsdom..." -ForegroundColor Gray
    Rename-Item -Path $jsdomBackup -NewName "jsdom" -ErrorAction Stop
    
    Write-Host "✅ jsdom restauré avec succès" -ForegroundColor Green
} else {
    Write-Host "❌ Backup jsdom.backup introuvable" -ForegroundColor Red
}

