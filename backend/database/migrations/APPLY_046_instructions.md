# Instructions d'Application de la Migration 046

## 🔍 Étape 1: Vérifier l'état actuel

Exécutez le script de vérification pour voir quels indexes existent déjà :

```bash
psql -U votre_user -d votre_database -f backend/database/migrations/CHECK_046_status.sql
```

Ou dans psql :
```sql
\i backend/database/migrations/CHECK_046_status.sql
```

Ce script vous indiquera :
- ✅ Quels indexes sont déjà créés
- ⚠️ Si l'ancien index `idx_marketplace_listings_status_listed` existe (nécessite le fix)
- 📊 Un résumé du nombre d'indexes par table

---

## 📋 Étape 2: Choisir le script approprié

### Scénario A: Migration 046 n'a JAMAIS été appliquée

**→ Exécutez la migration complète (version corrigée) :**

```bash
psql -U votre_user -d votre_database -f backend/database/migrations/046_add_performance_indexes.sql
```

Cette version contient déjà les corrections (index partiels pour marketplace_listings).

---

### Scénario B: Migration 046 a été appliquée AVANT la correction

**Signes :**
- L'index `idx_marketplace_listings_status_listed` existe (ancien index)
- Les nouveaux index partiels n'existent pas

**→ Exécutez le script de correction :**

```bash
psql -U votre_user -d votre_database -f backend/database/migrations/FIX_046_marketplace_indexes.sql
```

Ce script :
- Supprime l'ancien index `idx_marketplace_listings_status_listed`
- Crée les nouveaux index partiels optimisés

---

### Scénario C: Migration 046 a été appliquée APRÈS la correction

**Signes :**
- L'index `idx_marketplace_listings_active_listed` existe (nouvel index partiel)
- L'index `idx_marketplace_listings_farm_active` existe
- L'ancien index `idx_marketplace_listings_status_listed` n'existe pas

**→ Aucune action nécessaire ! ✅**

Les index sont déjà corrects.

---

## 🔄 Étape 3: Vérifier après application

Après avoir exécuté le script approprié, vérifiez à nouveau :

```bash
psql -U votre_user -d votre_database -f backend/database/migrations/CHECK_046_status.sql
```

Vérifiez que :
- ✅ Tous les index attendus sont créés
- ✅ Le statut `marketplace_indexes_status` indique "✅ OK"
- ✅ Aucun ancien index `idx_marketplace_listings_status_listed` ne subsiste

---

## 🧪 Étape 4: Tester les performances (optionnel)

Pour vérifier que les nouveaux index sont utilisés :

```sql
-- Test pour marketplace_listings
EXPLAIN ANALYZE
SELECT * FROM marketplace_listings 
WHERE status != 'removed' 
ORDER BY listed_at DESC 
LIMIT 100;
```

Dans le résultat `EXPLAIN`, vous devriez voir :
- `Index Scan using idx_marketplace_listings_active_listed` (ou similaire)
- Le temps d'exécution devrait être rapide (< 50ms sur une table de taille normale)

---

## ❓ Questions fréquentes

### Q: Comment savoir si la migration a été appliquée avant ou après la correction ?

**R:** Exécutez `CHECK_046_status.sql` et regardez les indexes de `marketplace_listings` :
- Si vous voyez `idx_marketplace_listings_status_listed` → Version ancienne (avant correction)
- Si vous voyez `idx_marketplace_listings_active_listed` → Version corrigée (après correction)
- Si aucun des deux → Migration jamais appliquée

### Q: Puis-je exécuter la migration complète même si elle a déjà été appliquée ?

**R:** Oui, mais pas nécessaire si seule la partie marketplace_listings pose problème. La migration utilise `IF NOT EXISTS`, donc elle ne recréera pas les indexes existants. Cependant, si vous avez l'ancien index, vous devrez quand même exécuter le FIX pour le remplacer.

### Q: Le script de correction est-il sûr ?

**R:** Oui, il utilise `DROP INDEX IF EXISTS` et `CREATE INDEX IF NOT EXISTS`, donc il est idempotent et peut être exécuté plusieurs fois sans problème.

### Q: Y a-t-il un risque de perte de données ?

**R:** Non, les indexes ne contiennent que des métadonnées pour accélérer les requêtes. Les supprimer et les recréer n'affecte pas les données de la table.

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs PostgreSQL pour les erreurs
2. Assurez-vous d'avoir les permissions nécessaires (CREATE INDEX)
3. Vérifiez que les tables existent avant de créer les index
4. En cas de doute, exécutez `CHECK_046_status.sql` pour diagnostiquer

