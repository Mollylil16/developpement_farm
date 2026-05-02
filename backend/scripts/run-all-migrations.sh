#!/bin/bash
# Script Bash pour exécuter toutes les migrations PostgreSQL
# Usage: ./scripts/run-all-migrations.sh

set -e

echo "🚀 Exécution de toutes les migrations PostgreSQL..."

# Configuration
DB_USER="farmtrack_user"
DB_NAME="farmtrack_db"
MIGRATIONS_DIR="database/migrations"

# Liste des migrations dans l'ordre
migrations=(
    "000_create_users_table.sql"
    "001_create_refresh_tokens.sql"
    "002_add_missing_users_columns.sql"
    "003_create_projets_table.sql"
    "004_create_production_animaux_table.sql"
    "005_create_production_pesees_table.sql"
    "006_create_gestations_table.sql"
    "007_create_sevrages_table.sql"
    "008_create_mortalites_table.sql"
    "009_create_revenus_table.sql"
    "010_create_depenses_ponctuelles_table.sql"
    "011_create_charges_fixes_table.sql"
    "012_create_ingredients_table.sql"
    "013_create_rations_table.sql"
    "014_create_ingredients_ration_table.sql"
    "015_create_stocks_aliments_table.sql"
    "016_create_stocks_mouvements_table.sql"
    "017_create_calendrier_vaccinations_table.sql"
    "018_create_vaccinations_table.sql"
    "019_create_maladies_table.sql"
    "020_create_traitements_table.sql"
    "021_create_visites_veterinaires_table.sql"
    "022_create_planifications_table.sql"
    "023_create_collaborations_table.sql"
    "024_create_rations_budget_table.sql"
    "025_create_rapports_croissance_table.sql"
    "026_create_rappels_vaccinations_table.sql"
    "027_create_veterinarians_table.sql"
    "028_create_regional_pork_price_table.sql"
    "029_create_chat_agent_tables.sql"
)

success_count=0
error_count=0

for migration in "${migrations[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration"
    
    if [ ! -f "$migration_path" ]; then
        echo "⚠️  Migration introuvable: $migration"
        ((error_count++))
        continue
    fi
    
    echo "📄 Exécution de: $migration"
    
    if psql -U "$DB_USER" -d "$DB_NAME" -f "$migration_path" > /dev/null 2>&1; then
        echo "  ✅ Succès"
        ((success_count++))
    else
        echo "  ❌ Erreur"
        psql -U "$DB_USER" -d "$DB_NAME" -f "$migration_path"
        ((error_count++))
    fi
    
    echo ""
done

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé:"
echo "  ✅ Succès: $success_count"
echo "  ❌ Erreurs: $error_count"
echo "  📋 Total: ${#migrations[@]}"

if [ $error_count -eq 0 ]; then
    echo ""
    echo "🎉 Toutes les migrations ont été exécutées avec succès!"
    exit 0
else
    echo ""
    echo "⚠️  Certaines migrations ont échoué. Vérifiez les erreurs ci-dessus."
    exit 1
fi

