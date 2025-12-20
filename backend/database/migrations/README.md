# 📋 Migrations PostgreSQL

Ce dossier contient toutes les migrations PostgreSQL pour créer les tables de la base de données.

## 📊 Liste des Migrations

### ✅ Tables Core
- `000_create_users_table.sql` - Table des utilisateurs
- `002_add_missing_users_columns.sql` - Colonnes manquantes pour users
- `003_create_projets_table.sql` - Table des projets (fermes)
- `028_create_regional_pork_price_table.sql` - Prix régionaux du porc

### ✅ Tables Production
- `004_create_production_animaux_table.sql` - Animaux de production
- `005_create_production_pesees_table.sql` - Pesées des animaux
- `006_create_gestations_table.sql` - Gestations
- `007_create_sevrages_table.sql` - Sevrages
- `008_create_mortalites_table.sql` - Mortalités
- `022_create_planifications_table.sql` - Planifications

### ✅ Tables Finance
- `009_create_revenus_table.sql` - Revenus
- `010_create_depenses_ponctuelles_table.sql` - Dépenses ponctuelles
- `011_create_charges_fixes_table.sql` - Charges fixes

### ✅ Tables Nutrition
- `012_create_ingredients_table.sql` - Ingrédients
- `013_create_rations_table.sql` - Rations
- `014_create_ingredients_ration_table.sql` - Lien ingredients-rations
- `015_create_stocks_aliments_table.sql` - Stocks d'aliments
- `016_create_stocks_mouvements_table.sql` - Mouvements de stock
- `024_create_rations_budget_table.sql` - Budgets de rations
- `025_create_rapports_croissance_table.sql` - Rapports de croissance

### ✅ Tables Santé
- `017_create_calendrier_vaccinations_table.sql` - Calendrier de vaccinations
- `018_create_vaccinations_table.sql` - Vaccinations effectuées
- `019_create_maladies_table.sql` - Maladies
- `020_create_traitements_table.sql` - Traitements médicaux
- `021_create_visites_veterinaires_table.sql` - Visites vétérinaires
- `026_create_rappels_vaccinations_table.sql` - Rappels de vaccinations
- `027_create_veterinarians_table.sql` - Vétérinaires

### ✅ Tables Collaboration
- `023_create_collaborations_table.sql` - Collaborations

### ✅ Tables Autres
- `001_create_refresh_tokens_table.sql` - Tokens de rafraîchissement
- `029_create_chat_agent_tables.sql` - Tables pour l'assistant conversationnel

## 🚀 Exécution des Migrations

### Exécuter toutes les migrations dans l'ordre

```bash
cd backend
psql -U farmtrack_user -d farmtrack_db -f database/migrations/000_create_users_table.sql
psql -U farmtrack_user -d farmtrack_db -f database/migrations/001_create_refresh_tokens_table.sql
psql -U farmtrack_user -d farmtrack_db -f database/migrations/002_add_missing_users_columns.sql
psql -U farmtrack_user -d farmtrack_db -f database/migrations/003_create_projets_table.sql
# ... etc
```

### Script d'exécution automatique

Un script sera créé pour exécuter toutes les migrations automatiquement.

## 📝 Notes

- Toutes les migrations utilisent `CREATE TABLE IF NOT EXISTS` pour éviter les erreurs si la table existe déjà
- Les contraintes FOREIGN KEY sont définies pour maintenir l'intégrité référentielle
- Les index sont créés pour améliorer les performances des requêtes
- Les types SQLite ont été convertis en types PostgreSQL :
  - `INTEGER` → `INTEGER` ou `BOOLEAN` (pour les flags)
  - `REAL` → `NUMERIC`
  - `TEXT` → `TEXT`
  - `CURRENT_TIMESTAMP` → `NOW()`
  - `CHECK (is_active IN (0, 1))` → `BOOLEAN DEFAULT TRUE`

## ✅ Statut

- ✅ 29 migrations créées
- ⏳ Script d'exécution automatique à créer
- ⏳ Script de migration SQLite → PostgreSQL à compléter

