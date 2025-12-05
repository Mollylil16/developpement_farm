# Script pour supprimer la base de donnees SQLite de l'application
# Usage: .\scripts\delete-database.ps1

Write-Host "Recherche de la base de donnees fermier_pro.db..." -ForegroundColor Cyan

# Chemins possibles pour la base de donnees sur Windows
$possiblePaths = @(
    "$env:USERPROFILE\.expo\databases\SQLite\fermier_pro.db",
    "$env:USERPROFILE\AppData\Local\expo\databases\SQLite\fermier_pro.db",
    "$env:LOCALAPPDATA\expo\databases\SQLite\fermier_pro.db"
)

$found = $false

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "Base de donnees trouvee: $path" -ForegroundColor Green
        $sizeKB = [math]::Round((Get-Item $path).Length / 1KB, 2)
        Write-Host "Taille: $sizeKB KB" -ForegroundColor Yellow
        
        $confirm = Read-Host "Voulez-vous supprimer cette base de donnees? (O/N)"
        if ($confirm -eq "O" -or $confirm -eq "o") {
            try {
                Remove-Item $path -Force
                Write-Host "Base de donnees supprimee avec succes!" -ForegroundColor Green
                Write-Host "La base de donnees sera recreee au prochain demarrage de l'application" -ForegroundColor Cyan
                $found = $true
                break
            } catch {
                Write-Host "Erreur lors de la suppression: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "Suppression annulee" -ForegroundColor Yellow
        }
    }
}

if (-not $found) {
    Write-Host "Base de donnees non trouvee dans les emplacements standards" -ForegroundColor Red
    Write-Host "Emplacements verifies:" -ForegroundColor Yellow
    foreach ($path in $possiblePaths) {
        Write-Host "   - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Astuce: Si vous utilisez un emulateur, la base de donnees peut etre dans l'emulateur" -ForegroundColor Cyan
}

