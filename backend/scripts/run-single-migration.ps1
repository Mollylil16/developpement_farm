# Script PowerShell pour exécuter une migration SQL spécifique
# Usage: .\run-single-migration.ps1 -MigrationFile "052_add_batch_support_to_marketplace_listings.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile
)

# Charger les variables d'environnement depuis .env
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Déterminer la configuration de connexion
$connectionString = $env:DATABASE_URL
$sslRequired = $false

if ($connectionString) {
    # Vérifier si SSL est requis
    if ($connectionString -match 'sslmode=require' -or $connectionString -match 'render\.com' -or $connectionString -match 'railway\.app') {
        $sslRequired = $true
    }
} else {
    # Utiliser les variables individuelles
    $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
    $dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
    $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "farmtrack_db" }
    $dbUser = if ($env:DB_USER) { $env:DB_USER } else { "farmtrack_user" }
    $dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }
    $dbSsl = $env:DB_SSL -eq "true"
    
    $connectionString = "postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"
    $sslRequired = $dbSsl
}

if (-not $connectionString) {
    Write-Host "❌ Erreur: Aucune configuration de base de données trouvée" -ForegroundColor Red
    Write-Host "Veuillez configurer DATABASE_URL ou les variables DB_* dans le fichier .env" -ForegroundColor Yellow
    exit 1
}

# Chemin du fichier de migration
$migrationPath = Join-Path $PSScriptRoot "..\database\migrations\$MigrationFile"

if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Erreur: Fichier de migration introuvable: $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Exécution de la migration: $MigrationFile" -ForegroundColor Cyan
Write-Host "📄 Chemin: $migrationPath" -ForegroundColor Gray
Write-Host ""

# Lire le contenu SQL
$sqlContent = Get-Content $migrationPath -Raw -Encoding UTF8

# Utiliser psql si disponible, sinon utiliser node avec pg
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "📊 Utilisation de psql..." -ForegroundColor Gray
    
    # Construire la commande psql
    $psqlArgs = @()
    
    if ($sslRequired) {
        $psqlArgs += "-h", ($connectionString -replace '.*@([^:]+):.*', '$1')
        $psqlArgs += "-p", ($connectionString -replace '.*:(\d+)/.*', '$1')
        $psqlArgs += "-U", ($connectionString -replace '.*://([^:]+):.*', '$1')
        $psqlArgs += "-d", ($connectionString -replace '.*/([^?]+).*', '$1')
        $psqlArgs += "-c", $sqlContent
        $env:PGPASSWORD = ($connectionString -replace '.*://[^:]+:([^@]+)@.*', '$1')
        $env:PGSSLMODE = "require"
    } else {
        $psqlArgs = $connectionString, "-c", $sqlContent
    }
    
    try {
        $result = & psql $psqlArgs 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration exécutée avec succès!" -ForegroundColor Green
        } else {
            # Vérifier si c'est juste un "déjà existant"
            if ($result -match 'already exists' -or $result -match 'duplicate' -or $result -match 'existe déjà') {
                Write-Host "⚠️  Migration déjà appliquée (ignorée)" -ForegroundColor Yellow
            } else {
                Write-Host "❌ Erreur lors de l'exécution:" -ForegroundColor Red
                Write-Host $result -ForegroundColor Red
                exit 1
            }
        }
    } catch {
        Write-Host "❌ Erreur: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📊 Utilisation de Node.js avec pg..." -ForegroundColor Gray
    
    # Créer un script Node.js temporaire
    $sqlEscaped = $sqlContent -replace "`"", "\`""
    $sqlEscaped = $sqlEscaped -replace '\$', '\$'
    
    $nodeScript = @"
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || '$connectionString';
const sslRequired = $($sslRequired.ToString().ToLower());

const pool = new Pool({
  connectionString: connectionString,
  ssl: sslRequired ? { rejectUnauthorized: false } : false
});

(async () => {
  const client = await pool.connect();
  try {
    const sql = `$sqlEscaped`;
    await client.query(sql);
    console.log('✅ Migration exécutée avec succès!');
  } catch (error) {
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('existe déjà') ||
        error.code === '42710') {
      console.log('⚠️  Migration déjà appliquée (ignorée)');
    } else {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
"@
    
    $tempScript = Join-Path $env:TEMP "run-migration-$(Get-Random).js"
    try {
        $nodeScript | Out-File -FilePath $tempScript -Encoding UTF8
        
        $nodeResult = node $tempScript 2>&1
        Write-Host $nodeResult
        
        if ($LASTEXITCODE -ne 0) {
            exit 1
        }
    } finally {
        if (Test-Path $tempScript) {
            Remove-Item $tempScript -Force
        }
    }
}

Write-Host ""
Write-Host "✅ Script terminé!" -ForegroundColor Green

