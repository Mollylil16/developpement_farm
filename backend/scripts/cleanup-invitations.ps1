# Script PowerShell de nettoyage des invitations expirées
# Usage: .\cleanup-invitations.ps1
# À exécuter via Task Scheduler quotidiennement

# Configuration
$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3000" }
$SECRET = $env:CLEANUP_SECRET

# Vérification du secret
if (-not $SECRET) {
    Write-Host "❌ Erreur: CLEANUP_SECRET non configuré dans les variables d'environnement" -ForegroundColor Red
    exit 1
}

# Appel de l'endpoint
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "$timestamp - Exécution du cleanup des invitations expirées..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "${API_URL}/collaborations/cleanup-expired?secret=${SECRET}" -Method Get
    
    Write-Host "✅ Cleanup réussi: $($response.message)" -ForegroundColor Green
    Write-Host "📊 $($response.expiredInvitationsCount) invitation(s) expirée(s) nettoyée(s)" -ForegroundColor Cyan
    
    # Log dans un fichier (optionnel)
    $logPath = "$PSScriptRoot\..\logs\cleanup-invitations.log"
    $logDir = Split-Path -Parent $logPath
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    "$timestamp - Cleanup réussi: $($response.message)" | Out-File -FilePath $logPath -Append
    
    exit 0
} catch {
    $errorMessage = $_.Exception.Message
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = "HTTP $statusCode : $errorMessage"
    }
    
    Write-Host "❌ Erreur: $errorMessage" -ForegroundColor Red
    
    # Log de l'erreur
    $logPath = "$PSScriptRoot\..\logs\cleanup-invitations.log"
    $logDir = Split-Path -Parent $logPath
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    "$timestamp - Erreur: $errorMessage" | Out-File -FilePath $logPath -Append
    
    exit 1
}
