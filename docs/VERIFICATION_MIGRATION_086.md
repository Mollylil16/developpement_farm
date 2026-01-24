# Vérification de la Migration 086

## Migration automatique

La migration `086_enrich_collaboration_history_audit.sql` sera appliquée automatiquement au démarrage du backend par le `MigrationService`.

### Comment ça fonctionne

1. **Au démarrage du backend :**
   - Le `MigrationService.onModuleInit()` est appelé
   - Il lit tous les fichiers SQL dans `database/migrations/` avec le pattern `\d{3}_*.sql`
   - Il trie les migrations par numéro (086 sera détecté)
   - Il vérifie dans `schema_migrations` si la migration a déjà été appliquée
   - Si non appliquée, il l'exécute dans une transaction

2. **Détection de la migration :**
   - Fichier : `086_enrich_collaboration_history_audit.sql`
   - Pattern détecté : `086_` → numéro de migration : `86`
   - Nom unique : `086_enrich_collaboration_history_audit.sql`

3. **Application :**
   - Les commandes SQL sont exécutées dans une transaction
   - Si succès → enregistrement dans `schema_migrations`
   - Si échec → rollback automatique

## Vérification manuelle

### 1. Vérifier que la migration est appliquée

**Option A : Script SQL**
```bash
psql -d votre_database -f backend/database/scripts/verify-audit-migration.sql
```

**Option B : Requête directe**
```sql
SELECT 
  migration_number,
  migration_name,
  applied_at
FROM schema_migrations
WHERE migration_name = '086_enrich_collaboration_history_audit.sql';
```

**Résultat attendu :** 1 ligne avec `migration_number = 86`

### 2. Vérifier les colonnes ajoutées

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'collaboration_history' 
  AND column_name IN ('device_info', 'action_metadata', 'profile_id')
ORDER BY column_name;
```

**Résultat attendu :** 3 lignes

### 3. Vérifier l'index

```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'collaboration_history' 
  AND indexname = 'idx_collab_history_profile_id';
```

**Résultat attendu :** 1 ligne

### 4. Script de test automatique

**Exécuter le script de test :**
```bash
npx ts-node backend/database/scripts/test-audit-trail.ts
```

**Ce que le script vérifie :**
- ✅ Migration appliquée
- ✅ Colonnes existantes
- ✅ Index créé
- ✅ Métadonnées QR enrichies
- ✅ Logging enrichi fonctionnel
- ✅ Tracking invitation_viewed
- ✅ Statistiques globales

## Logs du backend

### Au démarrage (si migration appliquée pour la première fois) :

```
[MigrationService] Application de la migration 86: 086_enrich_collaboration_history_audit.sql
[MigrationService] ✅ Migration 086_enrich_collaboration_history_audit.sql appliquée avec succès
```

### Si migration déjà appliquée :

```
[MigrationService] Migration 086_enrich_collaboration_history_audit.sql déjà appliquée, ignorée
```

## Dépannage

### Problème : Migration non appliquée

**Symptômes :**
- Pas de log de migration au démarrage
- Colonnes manquantes dans la base de données

**Solutions :**

1. **Vérifier le fichier existe :**
   ```bash
   ls -la backend/database/migrations/086_*.sql
   ```

2. **Vérifier le pattern :**
   - Le fichier doit commencer par `086_`
   - Le fichier doit avoir l'extension `.sql`

3. **Appliquer manuellement :**
   ```bash
   psql -d votre_database -f backend/database/migrations/086_enrich_collaboration_history_audit.sql
   ```

4. **Vérifier les permissions :**
   - Le backend doit avoir les droits d'exécution sur les migrations
   - La base de données doit permettre ALTER TABLE et CREATE INDEX

### Problème : Colonnes existent déjà

**Symptôme :** Erreur "column already exists"

**Solution :** C'est normal si les colonnes existent déjà. Le `IF NOT EXISTS` dans la migration empêche les erreurs.

### Problème : Erreur de contrainte unique

**Symptôme :** Erreur lors de l'insertion dans `schema_migrations`

**Solution :** Le `ON CONFLICT` dans le code devrait gérer cela. Vérifier que la table `schema_migrations` a bien la contrainte unique sur `migration_name`.

## Vérification après déploiement

1. **Sur Render/Production :**
   - Vérifier les logs du backend au démarrage
   - Chercher : "Migration 086_enrich_collaboration_history_audit.sql appliquée avec succès"

2. **Vérifier la base de données :**
   ```sql
   SELECT * FROM schema_migrations 
   WHERE migration_name = '086_enrich_collaboration_history_audit.sql';
   ```

3. **Tester les fonctionnalités :**
   - Scanner un QR code
   - Vérifier que `qr_scan_data` contient les métadonnées enrichies
   - Consulter les invitations
   - Vérifier que `invitation_viewed` est loggée
   - Tester l'endpoint `/collaborations/:id/audit-trail`

## Checklist de validation

- [ ] Migration détectée par le système (vérifier les logs)
- [ ] Migration appliquée avec succès
- [ ] Colonnes `device_info`, `action_metadata`, `profile_id` existent
- [ ] Index `idx_collab_history_profile_id` créé
- [ ] Script de vérification SQL fonctionne
- [ ] Script de test TypeScript fonctionne
- [ ] Métadonnées enrichies présentes dans les nouvelles collaborations QR
- [ ] Logging enrichi fonctionnel

## Notes importantes

1. **Idempotence :** La migration utilise `IF NOT EXISTS` et peut être exécutée plusieurs fois sans erreur

2. **Rétrocompatibilité :** Le code backend fonctionne même si la migration n'est pas appliquée (utilisation de l'ancien format)

3. **Performance :** L'ajout des colonnes et de l'index ne devrait pas affecter les performances existantes

4. **Rollback :** Si nécessaire, créer une migration de rollback qui supprime les colonnes et l'index
