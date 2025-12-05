# 🧹 Plan de Nettoyage des Migrations

Plan pour supprimer complètement `migrateTables()` et migrer toutes les migrations vers le système versionné.

## 📋 État actuel

### ✅ Déjà migré vers fichiers versionnés

Les migrations suivantes sont déjà dans `src/database/migrations/` :

- ✅ `002_add_telephone_to_users.ts`
- ✅ `003_make_email_telephone_optional.ts`
- ✅ `004_add_multi_role_fields.ts`
- ✅ `005_add_projet_id_to_rations.ts`
- ✅ `006_add_statut_to_production_animaux.ts`
- ✅ `007_add_user_id_to_collaborations.ts`
- ✅ `008_add_race_to_production_animaux.ts`
- ✅ `009_add_prix_kg_to_projets.ts`
- ✅ `010_add_reproducteur_fields.ts`
- ✅ `011_add_verrat_fields_to_gestations.ts`
- ✅ `012_add_projet_id_to_gestations.ts`
- ✅ `013_add_animal_code_to_mortalites.ts`
- ✅ `014_add_projet_id_to_sevrages.ts`
- ✅ `015_add_projet_id_to_depenses.ts`
- ✅ `016_add_projet_id_to_charges_fixes.ts`
- ✅ `017_add_animal_id_to_revenus.ts`
- ✅ `018_add_poids_kg_to_revenus.ts`
- ✅ `019_add_derniere_modification_fields.ts`
- ✅ `020_add_marge_fields_to_revenus.ts`
- ✅ `021_sync_actif_statut.ts`
- ✅ `022_update_ingredients_unit.ts`
- ✅ `023_recalculate_gmq.ts`
- ✅ `024_add_permission_sante_to_collaborations.ts`
- ✅ `025_create_marketplace_additional_tables.ts`

### ⚠️ Encore dans `migrateTables()`

Les migrations suivantes sont encore dans `database.ts` et doivent être extraites :

1. **Migration users (email/telephone)** - Lignes 245-351
   - Déjà dans `003_make_email_telephone_optional.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

2. **Migration multi-rôles** - Lignes 353-381
   - Déjà dans `004_add_multi_role_fields.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

3. **Migration rations projet_id** - Lignes 408-439
   - Déjà dans `005_add_projet_id_to_rations.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

4. **Migration statut production_animaux** - Lignes 441-463
   - Déjà dans `006_add_statut_to_production_animaux.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

5. **Migration user_id collaborations** - Lignes 465-503
   - Déjà dans `007_add_user_id_to_collaborations.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

6. **Migration race production_animaux** - Lignes 505-515
   - Déjà dans `008_add_race_to_production_animaux.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

7. **Migration prix_kg projets** - Lignes 539-570
   - Déjà dans `009_add_prix_kg_to_projets.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

8. **Migration reproducteur** - Lignes 572-585
   - Déjà dans `010_add_reproducteur_fields.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

9. **Migration verrat_id gestations** - Lignes 611-635
   - Déjà dans `011_add_verrat_fields_to_gestations.ts` ✅
   - **Action** : Vérifier si identique, supprimer dupliqué

10. **Migration projet_id gestations** - Lignes 663-700
    - Déjà dans `012_add_projet_id_to_gestations.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

11. **Migration animal_code mortalites** - Lignes 702-729
    - Déjà dans `013_add_animal_code_to_mortalites.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

12. **Migration projet_id sevrages** - Lignes 731-849
    - Déjà dans `014_add_projet_id_to_sevrages.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

13. **Migration projet_id depenses** - Lignes 851-888
    - Déjà dans `015_add_projet_id_to_depenses.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

14. **Migration projet_id charges_fixes** - Lignes 890-925
    - Déjà dans `016_add_projet_id_to_charges_fixes.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

15. **Migration ingredients unite** - Lignes 927-1007
    - Déjà dans `022_update_ingredients_unit.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

16. **Migration recalcul GMQ** - Lignes 1009-1093
    - Déjà dans `023_recalculate_gmq.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

17. **Migration permission_sante** - Lignes 1095-1120
    - Déjà dans `024_add_permission_sante_to_collaborations.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

18. **Migration vaccinations colonnes** - Lignes 1122-1169
    - ⚠️ **À extraire** vers nouveau fichier

19. **Migration visites_veterinaires** - Lignes 1171-1229
    - ⚠️ **À extraire** vers nouveau fichier

20. **Migration photo_uri production_animaux** - Lignes 1231-1244, 1348-1371
    - ⚠️ **À extraire** vers nouveau fichier

21. **Migration production_animaux statut** - Lignes 1246-1346
    - ⚠️ **À extraire** vers nouveau fichier (ou fusionner avec 006)

22. **Migration vaccinations nullable** - Lignes 1373-1437
    - ⚠️ **À extraire** vers nouveau fichier

23. **Migration maladies types** - Lignes 1439-1494
    - ⚠️ **À extraire** vers nouveau fichier

24. **Migration OPEX/CAPEX** - Lignes 1496-1515
    - Déjà dans `add_opex_capex_fields.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

25. **Migration saved_farms** - Lignes 1517-1523
    - Déjà dans `add_saved_farms_to_users.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

26. **Migration animal_id revenus** - Lignes 1526-1546
    - Déjà dans `017_add_animal_id_to_revenus.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

27. **Migration poids_kg revenus** - Lignes 1548-1569
    - Déjà dans `018_add_poids_kg_to_revenus.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

28. **Migration derniere_modification** - Lignes 1571-1615
    - Déjà dans `019_add_derniere_modification_fields.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

29. **Migration marges revenus** - Lignes 1617-1652
    - Déjà dans `020_add_marge_fields_to_revenus.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

30. **Migration marketplace** - Lignes 1654-1744
    - Déjà dans `025_create_marketplace_additional_tables.ts` ✅
    - **Action** : Vérifier si identique, supprimer dupliqué

## 📝 Plan d'action

### Phase 1 : Vérification (1 jour)

1. Comparer chaque migration dans `migrateTables()` avec les fichiers versionnés
2. Identifier les différences
3. Documenter les migrations manquantes

### Phase 2 : Extraction (2 jours)

1. Extraire les migrations manquantes vers des fichiers versionnés
2. Tester chaque migration individuellement
3. Enregistrer dans `migrations/index.ts`

### Phase 3 : Suppression (1 jour)

1. Supprimer `migrateTables()` complètement
2. Vérifier que toutes les migrations sont dans le système versionné
3. Tester l'initialisation complète

### Phase 4 : Validation (1 jour)

1. Tests complets de migration
2. Vérification sur base de données existante
3. Documentation finale

## ⚠️ Précautions

- **Ne pas supprimer** `migrateTables()` tant que toutes les migrations ne sont pas extraites
- **Tester** chaque migration extraite individuellement
- **Vérifier** que les migrations sont idempotentes
- **Sauvegarder** la base de données avant chaque test

## 📊 Progression

- ✅ **25 migrations** déjà versionnées
- ⚠️ **~8 migrations** à extraire
- ❌ **~1500 lignes** de code à supprimer de `database.ts`

---

**Status:** En attente de validation que toutes les migrations sont identiques

