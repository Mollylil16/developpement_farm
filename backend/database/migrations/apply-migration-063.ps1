# Script PowerShell pour appliquer la migration 063
# Uniformisation Marketplace

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migration 063 - Uniformisation Marketplace" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration de la base de données
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "farm_db_dev"
$DB_USER = "postgres"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""

# Demander le mot de passe
$DB_PASSWORD = Read-Host "Mot de passe PostgreSQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Définir la variable d'environnement pour psql
$env:PGPASSWORD = $PlainPassword

Write-Host "Connexion à la base de données..." -ForegroundColor Yellow

# Tester la connexion
$testConnection = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur de connexion à la base de données!" -ForegroundColor Red
    Write-Host $testConnection
    exit 1
}

Write-Host "✅ Connexion réussie!" -ForegroundColor Green
Write-Host ""

# Créer un backup (optionnel mais recommandé)
Write-Host "Création d'un backup..." -ForegroundColor Yellow
$backupFile = "..\..\backups\marketplace_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Créer le dossier backups s'il n'existe pas
if (-not (Test-Path "..\..\backups")) {
    New-Item -ItemType Directory -Path "..\..\backups" -Force | Out-Null
}

pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
    -t marketplace_listings `
    -t production_animaux `
    -t batch_pigs `
    -t batches `
    -f $backupFile 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup créé: $backupFile" -ForegroundColor Green
} else {
    Write-Host "⚠️  Impossible de créer le backup, continuons quand même..." -ForegroundColor Yellow
}
Write-Host ""

# Appliquer la migration
Write-Host "Application de la migration 063..." -ForegroundColor Yellow
Write-Host ""

$migrationResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
    -f "063_uniformize_marketplace_batch_support.sql" `
    -v ON_ERROR_STOP=1 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'application de la migration!" -ForegroundColor Red
    Write-Host $migrationResult
    Write-Host ""
    Write-Host "Pour restaurer le backup:" -ForegroundColor Yellow
    Write-Host "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $backupFile"
    exit 1
}

Write-Host $migrationResult
Write-Host ""
Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
Write-Host ""

# Vérifications post-migration
Write-Host "Vérification de l'intégrité..." -ForegroundColor Yellow

# Vérifier les colonnes batch_pigs
$batchPigsCheck = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c @"
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'batch_pigs' 
AND column_name IN ('marketplace_status', 'marketplace_listing_id', 'listed_at', 'sold_at');
"@

if ($batchPigsCheck.Trim() -eq "4") {
    Write-Host "  ✅ Colonnes batch_pigs OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Colonnes batch_pigs manquantes" -ForegroundColor Red
}

# Vérifier les colonnes batches
$batchesCheck = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c @"
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'batches' 
AND column_name IN ('marketplace_status', 'marketplace_listed_count');
"@

if ($batchesCheck.Trim() -eq "2") {
    Write-Host "  ✅ Colonnes batches OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Colonnes batches manquantes" -ForegroundColor Red
}

# Vérifier le trigger
$triggerCheck = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c @"
SELECT COUNT(*) FROM pg_trigger 
WHERE tgname = 'trigger_sync_batch_marketplace_status';
"@

if ($triggerCheck.Trim() -ge "1") {
    Write-Host "  ✅ Trigger de synchronisation OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Trigger de synchronisation manquant" -ForegroundColor Red
}

# Vérifier la vue
$viewCheck = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c @"
SELECT COUNT(*) FROM information_schema.views 
WHERE table_name = 'v_marketplace_listings_enriched';
"@

if ($viewCheck.Trim() -eq "1") {
    Write-Host "  ✅ Vue enrichie OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Vue enrichie manquante" -ForegroundColor Red
}

Write-Host ""

# Statistiques
Write-Host "Statistiques du marketplace:" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c @"
SELECT 
    COUNT(*) FILTER (WHERE listing_type = 'individual') as listings_individuels,
    COUNT(*) FILTER (WHERE listing_type = 'batch') as listings_bandes,
    COUNT(*) FILTER (WHERE status = 'available') as disponibles,
    COUNT(*) FILTER (WHERE status = 'sold') as vendus
FROM marketplace_listings
WHERE status != 'removed';
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Migration 063 terminée avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "  1. Redémarrer le backend (npm run start:dev)"
Write-Host "  2. Tester les endpoints marketplace"
Write-Host "  3. Consulter: GUIDE_DEPLOIEMENT.md"
Write-Host ""

# Nettoyer la variable d'environnement
Remove-Item Env:\PGPASSWORD

