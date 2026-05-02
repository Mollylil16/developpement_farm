# Script PowerShell pour exécuter toutes les migrations PostgreSQL
# Usage: .\scripts\run-all-migrations.ps1

$ErrorActionPreference = "Continue"

Write-Host "🚀 Exécution de toutes les migrations PostgreSQL..." -ForegroundColor Cyan

# Configuration
$DB_USER = "farmtrack_user"
$DB_NAME = "farmtrack_db"
$MIGRATIONS_DIR = "database\migrations"

# Liste des migrations dans l'ordre
$migrations = @(
    "000_create_users_table.sql",
    "001_create_refresh_tokens.sql",
    "002_add_missing_users_columns.sql",
    "003_create_projets_table.sql",
    "004_create_production_animaux_table.sql",
    "005_create_production_pesees_table.sql",
    "006_create_gestations_table.sql",
    "007_create_sevrages_table.sql",
    "008_create_mortalites_table.sql",
    "009_create_revenus_table.sql",
    "010_create_depenses_ponctuelles_table.sql",
    "011_create_charges_fixes_table.sql",
    "012_create_ingredients_table.sql",
    "013_create_rations_table.sql",
    "014_create_ingredients_ration_table.sql",
    "015_create_stocks_aliments_table.sql",
    "016_create_stocks_mouvements_table.sql",
    "017_create_calendrier_vaccinations_table.sql",
    "018_create_vaccinations_table.sql",
    "019_create_maladies_table.sql",
    "020_create_traitements_table.sql",
    "021_create_visites_veterinaires_table.sql",
    "022_create_planifications_table.sql",
    "023_create_collaborations_table.sql",
    "024_create_rations_budget_table.sql",
    "025_create_rapports_croissance_table.sql",
    "026_create_rappels_vaccinations_table.sql",
    "027_create_veterinarians_table.sql",
    "028_create_regional_pork_price_table.sql",
    "029_create_chat_agent_tables.sql"
)

$successCount = 0
$errorCount = 0

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $MIGRATIONS_DIR $migration
    
    if (-not (Test-Path $migrationPath)) {
        Write-Host "⚠️  Migration introuvable: $migration" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    Write-Host "📄 Exécution de: $migration" -ForegroundColor Gray
    
    try {
        # Exécuter psql et capturer la sortie
        $output = psql -U $DB_USER -d $DB_NAME -f $migrationPath 2>&1 | Out-String
        
        # Vérifier le code de sortie
        if ($LASTEXITCODE -eq 0) {
            # Filtrer les NOTICE (qui sont normales) et les vraies erreurs
            $errorLines = $output | Select-String -Pattern "ERREUR|ERROR|FATAL" -CaseSensitive
            
            if ($errorLines) {
                Write-Host "  ❌ Erreur détectée:" -ForegroundColor Red
                Write-Host $errorLines -ForegroundColor Red
                $errorCount++
            }
            else {
                Write-Host "  ✅ Succès" -ForegroundColor Green
                $successCount++
            }
        }
        else {
            Write-Host "  ❌ Erreur (code: $LASTEXITCODE)" -ForegroundColor Red
            # Afficher seulement les lignes d'erreur, pas les NOTICE
            $errorLines = $output | Select-String -Pattern "ERREUR|ERROR|FATAL" -CaseSensitive
            if ($errorLines) {
                Write-Host $errorLines -ForegroundColor Red
            }
            else {
                Write-Host $output -ForegroundColor Red
            }
            $errorCount++
        }
    }
    catch {
        Write-Host "  ❌ Exception: $_" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

# Résumé
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Résumé:" -ForegroundColor Cyan
Write-Host "  ✅ Succès: $successCount" -ForegroundColor Green
Write-Host "  ❌ Erreurs: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host "  📋 Total: $($migrations.Count)" -ForegroundColor Cyan

if ($errorCount -eq 0) {
    Write-Host "`n🎉 Toutes les migrations ont été exécutées avec succès!" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️  Certaines migrations ont échoué. Vérifiez les erreurs ci-dessus." -ForegroundColor Yellow
    exit 1
}

