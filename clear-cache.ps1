# Script PowerShell pour vider tous les caches React Native / Expo
# Utilisation: .\clear-cache.ps1

Write-Host "🧹 Nettoyage complet des caches..." -ForegroundColor Cyan

# 1. Arrêter les processus Metro/Expo en cours
Write-Host "`n1. Arrêt des processus en cours..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
Start-Sleep -Seconds 2

# 2. Vider le cache npm
Write-Host "`n2. Nettoyage du cache npm..." -ForegroundColor Yellow
npm cache clean --force

# 3. Supprimer node_modules et package-lock.json
Write-Host "`n3. Suppression de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
}

# 4. Vider le cache Metro Bundler
Write-Host "`n4. Nettoyage du cache Metro Bundler..." -ForegroundColor Yellow
if (Test-Path "$env:LOCALAPPDATA\Temp\metro-*") {
    Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Temp\metro-*"
}
if (Test-Path "$env:LOCALAPPDATA\Temp\react-*") {
    Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Temp\react-*"
}

# 5. Vider le cache Expo
Write-Host "`n5. Nettoyage du cache Expo..." -ForegroundColor Yellow
if (Test-Path "$env:USERPROFILE\.expo") {
    Remove-Item -Recurse -Force "$env:USERPROFILE\.expo\*"
}

# 6. Vider le cache React Native
Write-Host "`n6. Nettoyage du cache React Native..." -ForegroundColor Yellow
if (Test-Path "$env:LOCALAPPDATA\Temp\react-native-*") {
    Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Temp\react-native-*"
}

# 7. Réinstaller les dépendances
Write-Host "`n7. Réinstallation des dépendances..." -ForegroundColor Yellow
npm install

Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host "`nVous pouvez maintenant démarrer l'application avec:" -ForegroundColor Cyan
Write-Host "  npx expo start -c" -ForegroundColor White

