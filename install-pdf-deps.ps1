# Script d'installation des dépendances pour l'export PDF
# Fermier Pro - Export PDF Feature

Write-Host "================================================" -ForegroundColor Green
Write-Host "   Installation Export PDF - Fermier Pro" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Vérifier si npm est installé
Write-Host "🔍 Vérification de npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé. Installez Node.js d'abord." -ForegroundColor Red
    exit 1
}

# Vérifier si expo-cli est disponible
Write-Host ""
Write-Host "🔍 Vérification d'Expo..." -ForegroundColor Cyan
try {
    $expoVersion = npx expo --version
    Write-Host "✅ Expo version: $expoVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Expo n'est pas installé globalement, mais ce n'est pas grave." -ForegroundColor Yellow
}

# Installer expo-print
Write-Host ""
Write-Host "📦 Installation d'expo-print..." -ForegroundColor Cyan
try {
    npx expo install expo-print
    Write-Host "✅ expo-print installé avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation d'expo-print" -ForegroundColor Red
    exit 1
}

# Installer expo-sharing
Write-Host ""
Write-Host "📦 Installation d'expo-sharing..." -ForegroundColor Cyan
try {
    npx expo install expo-sharing
    Write-Host "✅ expo-sharing installé avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation d'expo-sharing" -ForegroundColor Red
    exit 1
}

# Vérification finale dans package.json
Write-Host ""
Write-Host "🔍 Vérification de package.json..." -ForegroundColor Cyan
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

$expoPrintInstalled = $false
$expoSharingInstalled = $false

if ($packageJson.dependencies.PSObject.Properties.Name -contains "expo-print") {
    Write-Host "✅ expo-print trouvé dans package.json" -ForegroundColor Green
    $expoPrintInstalled = $true
} else {
    Write-Host "⚠️  expo-print non trouvé dans package.json" -ForegroundColor Yellow
}

if ($packageJson.dependencies.PSObject.Properties.Name -contains "expo-sharing") {
    Write-Host "✅ expo-sharing trouvé dans package.json" -ForegroundColor Green
    $expoSharingInstalled = $true
} else {
    Write-Host "⚠️  expo-sharing non trouvé dans package.json" -ForegroundColor Yellow
}

# Résumé
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   Résumé de l'installation" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

if ($expoPrintInstalled -and $expoSharingInstalled) {
    Write-Host "✅ Toutes les dépendances sont installées!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "   1. Redémarrez le serveur Expo:" -ForegroundColor White
    Write-Host "      npx expo start --clear" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   2. Testez l'export PDF:" -ForegroundColor White
    Write-Host "      - Ouvrez l'app" -ForegroundColor White
    Write-Host "      - Allez sur le Dashboard" -ForegroundColor White
    Write-Host "      - Cliquez sur le bouton 📄" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Consultez la documentation:" -ForegroundColor White
    Write-Host "      - INSTALLATION_PDF.md" -ForegroundColor Yellow
    Write-Host "      - EXPORT_PDF_RECAP.md" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🎉 Félicitations! Le système d'export PDF est prêt!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Certaines dépendances sont manquantes." -ForegroundColor Yellow
    Write-Host "   Essayez d'exécuter manuellement:" -ForegroundColor White
    Write-Host "   npx expo install expo-print expo-sharing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green

