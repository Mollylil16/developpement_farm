# Script de configuration Java pour le développement Android local
# Note: Ce script est optionnel - EAS Build gère Java automatiquement dans le cloud

Write-Host "=== Configuration Java pour Expo/React Native ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Java est déjà installé
$javaInstalled = Get-Command java -ErrorAction SilentlyContinue

if ($javaInstalled) {
    Write-Host "✓ Java est déjà installé :" -ForegroundColor Green
    java -version
    exit 0
}

Write-Host "⚠ Java n'est pas installé sur ce système." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour Expo SDK 54 avec React Native 0.81.5, vous avez besoin de Java 17 ou supérieur." -ForegroundColor Yellow
Write-Host ""
Write-Host "Options d'installation :" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. RECOMMANDÉ : Continuer avec EAS Build (pas besoin de Java local)" -ForegroundColor Green
Write-Host "   Les builds s'exécutent dans le cloud avec Java préconfiguré." -ForegroundColor Gray
Write-Host "   Commande: npx eas build --platform android --profile preview" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Installer Java localement pour le développement local :" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option A - Via Chocolatey (recommandé si vous avez Chocolatey) :" -ForegroundColor Cyan
Write-Host "     choco install openjdk17" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Téléchargement manuel :" -ForegroundColor Cyan
Write-Host "     1. Téléchargez OpenJDK 17 depuis :" -ForegroundColor Gray
Write-Host "        https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Gray
Write-Host "     2. Installez-le" -ForegroundColor Gray
Write-Host "     3. Définissez JAVA_HOME dans les variables d'environnement :" -ForegroundColor Gray
Write-Host "        Exemple: C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option C - Via Android Studio :" -ForegroundColor Cyan
Write-Host "     Si vous installez Android Studio, il inclut une version JDK intégrée." -ForegroundColor Gray
Write-Host ""
Write-Host "Après installation, configurez JAVA_HOME :" -ForegroundColor Yellow
Write-Host "  [System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\chemin\vers\jdk', 'User')" -ForegroundColor Gray
Write-Host "  [System.Environment]::SetEnvironmentVariable('Path', [System.Environment]::GetEnvironmentVariable('Path', 'User') + ';%JAVA_HOME%\bin', 'User')" -ForegroundColor Gray
Write-Host ""
Write-Host "Voulez-vous continuer avec EAS Build (recommandé) ou installer Java localement ?" -ForegroundColor Cyan

