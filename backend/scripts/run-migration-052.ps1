# Script pour exécuter la migration 052 (support batch dans marketplace)
# Usage: .\run-migration-052.ps1

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath
$migrationScript = Join-Path $scriptPath "run-single-migration.ts"

Write-Host "🚀 Exécution de la migration 052..." -ForegroundColor Cyan
Write-Host ""

cd $backendPath
npx tsx $migrationScript "052_add_batch_support_to_marketplace_listings.sql"

