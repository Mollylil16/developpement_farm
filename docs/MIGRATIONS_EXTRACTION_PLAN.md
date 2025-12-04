# Plan d'Extraction des Migrations

## 📋 État actuel

- ✅ Système de migrations versionné en place (`MigrationRunner.ts`)
- ✅ Migrations déjà extraites : 002, 003, 004, add_saved_farms_to_users, add_opex_capex_fields, create_marketplace_tables
- ⚠️ `migrateTables()` contient encore ~1700 lignes de migrations inline
- ⚠️ `migrateTables()` est marquée comme deprecated mais contient encore du code actif

## 🎯 Objectif

Extraire toutes les migrations de `migrateTables()` vers le système versionné, puis supprimer `migrateTables()`.

## 📝 Liste des migrations à extraire

### Migrations simples (ajout de colonnes)

1. **005_add_projet_id_to_rations.ts** - Ajouter projet_id à rations
2. **006_add_statut_to_production_animaux.ts** - Ajouter statut à production_animaux
3. **007_add_user_id_to_collaborations.ts** - Ajouter user_id à collaborations
4. **008_add_race_to_production_animaux.ts** - Ajouter race à production_animaux
5. **009_add_prix_kg_to_projets.ts** - Ajouter prix_kg_vif et prix_kg_carcasse à projets
6. **010_add_reproducteur_fields.ts** - Ajouter reproducteur, pere_id, mere_id à production_animaux
7. **011_add_verrat_fields_to_gestations.ts** - Ajouter verrat_id et verrat_nom à gestations
8. **012_add_projet_id_to_gestations.ts** - Ajouter projet_id à gestations
9. **013_add_animal_code_to_mortalites.ts** - Ajouter animal_code à mortalites
10. **014_add_projet_id_to_sevrages.ts** - Ajouter projet_id à sevrages
11. **015_add_projet_id_to_depenses.ts** - Ajouter projet_id à depenses_ponctuelles
12. **016_add_projet_id_to_charges_fixes.ts** - Ajouter projet_id à charges_fixes
13. **017_add_animal_id_to_revenus.ts** - Ajouter animal_id à revenus
14. **018_add_poids_kg_to_revenus.ts** - Ajouter poids_kg à revenus
15. **019_add_derniere_modification_fields.ts** - Ajouter derniere_modification à revenus, depenses_ponctuelles, marketplace_listings

### Migrations complexes

16. **020_add_marge_fields_to_revenus.ts** - Ajouter colonnes de calcul de marge (8 colonnes)
17. **021_sync_actif_statut.ts** - Synchroniser actif avec statut pour production_animaux
18. **022_update_ingredients_unit.ts** - Mettre à jour contrainte CHECK pour supporter 'sac'
19. **023_recalculate_gmq.ts** - Recalculer GMQ des pesées existantes
20. **024_add_permission_sante_to_collaborations.ts** - Ajouter permission_sante à collaborations

### Migrations Marketplace (déjà partiellement extraites)

21. **025_create_marketplace_additional_tables.ts** - Créer service_proposal_notifications, purchase_requests, purchase_request_offers, purchase_request_matches, weekly_pork_price_trends

## 🔄 Ordre d'exécution

Les migrations doivent être extraites dans l'ordre chronologique (version croissante) pour maintenir la cohérence.

## ✅ Checklist

- [ ] Créer toutes les migrations simples (005-019)
- [ ] Créer toutes les migrations complexes (020-024)
- [ ] Créer migration Marketplace (025)
- [ ] Mettre à jour `index.ts` avec toutes les migrations
- [ ] Vérifier que `runVersionedMigrations()` est appelé dans `initialize()`
- [ ] Tester que toutes les migrations s'appliquent correctement
- [ ] Supprimer `migrateTables()` (ou la vider complètement)
- [ ] Mettre à jour la documentation

## 📊 Estimation

- Migrations simples : ~2h (15 migrations × 8 min)
- Migrations complexes : ~3h (5 migrations × 36 min)
- Tests et validation : ~2h
- **Total : ~7h**

