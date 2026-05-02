# Script PowerShell d'audit des logs pour détecter les fuites de données sensibles
# Usage: .\scripts\audit-logs.ps1 [directory]

param(
    [string]$SearchDir = "src"
)

Write-Host "🔍 Audit des logs pour détecter les fuites de données sensibles" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$IssuesFound = 0

# Vérification 1: console.log avec tokens
Write-Host "📋 Vérification 1: Recherche de console.log avec tokens..." -ForegroundColor Yellow
$tokenLogs = Get-ChildItem -Path $SearchDir -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "console\.log.*token" | 
    Where-Object { $_.Line -notmatch "REDACTED|sanitize|masquer|logger" }

if ($tokenLogs) {
    Write-Host "❌ PROBLÈME: console.log avec 'token' trouvé" -ForegroundColor Red
    $tokenLogs | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber): $($_.Line)" }
    $IssuesFound++
} else {
    Write-Host "✅ Aucun console.log avec token trouvé" -ForegroundColor Green
}

Write-Host ""

# Vérification 2: console.log avec password
Write-Host "📋 Vérification 2: Recherche de console.log avec password..." -ForegroundColor Yellow
$passwordLogs = Get-ChildItem -Path $SearchDir -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "console\.log.*password" -CaseSensitive:$false | 
    Where-Object { $_.Line -notmatch "REDACTED|sanitize|masquer|logger" }

if ($passwordLogs) {
    Write-Host "❌ PROBLÈME: console.log avec 'password' trouvé" -ForegroundColor Red
    $passwordLogs | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber): $($_.Line)" }
    $IssuesFound++
} else {
    Write-Host "✅ Aucun console.log avec password trouvé" -ForegroundColor Green
}

Write-Host ""

# Vérification 3: logger avec tokens
Write-Host "📋 Vérification 3: Recherche de logger avec tokens non sanitizés..." -ForegroundColor Yellow
$loggerTokens = Get-ChildItem -Path $SearchDir -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "logger\.(log|debug|info|warn).*(access_token|refresh_token)" | 
    Where-Object { $_.Line -notmatch "REDACTED|sanitize|masquer|structured" }

if ($loggerTokens) {
    Write-Host "⚠️  ATTENTION: logger avec token trouvé (vérifier que c'est sanitizé)" -ForegroundColor Yellow
    $loggerTokens | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber): $($_.Line)" }
    $IssuesFound++
} else {
    Write-Host "✅ Aucun logger direct avec token trouvé" -ForegroundColor Green
}

Write-Host ""

# Vérification 4: console.log directs
Write-Host "📋 Vérification 4: Recherche de console.log directs..." -ForegroundColor Yellow
$consoleLogs = Get-ChildItem -Path $SearchDir -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "console\.log" | 
    Where-Object { 
        $_.Filename -notmatch "node_modules|__tests__|test\.ts|logger\.ts"
    }

$consoleLogCount = ($consoleLogs | Measure-Object).Count
if ($consoleLogCount -gt 0) {
    Write-Host "⚠️  ATTENTION: $consoleLogCount console.log trouvés (devrait utiliser logger)" -ForegroundColor Yellow
    Write-Host "   Utiliser 'logger.debug()' ou 'logger.structured()' à la place" -ForegroundColor Yellow
} else {
    Write-Host "✅ Aucun console.log direct trouvé" -ForegroundColor Green
}

Write-Host ""

# Vérification 5: Patterns JWT
Write-Host "📋 Vérification 5: Recherche de patterns JWT dans les logs..." -ForegroundColor Yellow
$jwtPatterns = Get-ChildItem -Path $SearchDir -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" | 
    Where-Object { $_.Line -notmatch "REDACTED|sanitize|masquer|test" }

if ($jwtPatterns) {
    Write-Host "❌ PROBLÈME: Pattern JWT trouvé dans le code" -ForegroundColor Red
    Write-Host "   Vérifier que ce sont des exemples dans les tests ou commentaires uniquement" -ForegroundColor Yellow
    $jwtPatterns | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber): $($_.Line.Substring(0, [Math]::Min(80, $_.Line.Length)))" }
    $IssuesFound++
} else {
    Write-Host "✅ Aucun pattern JWT suspect trouvé" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan

if ($IssuesFound -eq 0) {
    Write-Host "✅ Audit terminé : Aucun problème critique trouvé" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Audit terminé : $IssuesFound problème(s) trouvé(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommandations :" -ForegroundColor Yellow
    Write-Host "1. Remplacer tous les console.log par logger.structured()"
    Write-Host "2. Vérifier que les tokens sont bien sanitizés"
    Write-Host "3. Utiliser logger.structured() pour logger des données"
    Write-Host ""
    exit 1
}
