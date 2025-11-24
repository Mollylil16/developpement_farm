# 🔧 Guide d'Intégration - Migration Database OPEX/CAPEX

**Date:** 21 Novembre 2025  
**Version:** 1.0  
**⚠️ CRITIQUE:** Cette migration DOIT être intégrée avant de tester le système OPEX/CAPEX

---

## 📋 Vue d'Ensemble

Cette migration ajoute les champs nécessaires pour le système OPEX/CAPEX :
- **1 champ** dans la table `projets`
- **9 champs** dans la table `revenus`

Sans cette migration, l'application plantera lors de la tentative d'utiliser les fonctionnalités OPEX/CAPEX.

---

## ⚡ Intégration Rapide (5 minutes)

### Étape 1: Ouvrir le fichier database.ts

```bash
Fichier: src/services/database.ts
Ligne: ~1420 (dans la méthode migrateTables())
```

### Étape 2: Localiser la section des migrations

Cherchez la méthode `migrateTables()`. Vous devriez voir d'autres migrations comme :

```typescript
private async migrateTables(): Promise<void> {
  // ... autres migrations existantes ...
  
  // Migration: Ajouter champs pour truies, verrats, etc.
  // Migration: Ajouter champ statut_sante
  // etc.
}
```

### Étape 3: Ajouter la migration OPEX/CAPEX

**À LA FIN** de la méthode `migrateTables()`, **AVANT le dernier }**, ajoutez :

```typescript
// ============================================
// Migration: OPEX/CAPEX - Ajout champs amortissement et marges
// ============================================
try {
  const { migrateOpexCapexFields, isOpexCapexMigrationApplied } = 
    await import('../database/migrations/add_opex_capex_fields');
  
  const migrationApplied = await isOpexCapexMigrationApplied(this.db);
  
  if (!migrationApplied) {
    console.log('🔄 Application de la migration OPEX/CAPEX...');
    await migrateOpexCapexFields(this.db);
    console.log('✅ Migration OPEX/CAPEX appliquée avec succès');
  } else {
    console.log('ℹ️  Migration OPEX/CAPEX déjà appliquée');
  }
} catch (error: any) {
  console.warn('⚠️  Erreur lors de la migration OPEX/CAPEX:', error?.message || error);
  // La migration échoue silencieusement pour ne pas bloquer l'app
}
```

### Étape 4: Sauvegarder

Sauvegardez le fichier `src/services/database.ts`.

---

## 🧪 Vérification de l'Intégration

### Test 1: Démarrer l'application

```bash
npm start
# ou
expo start
```

### Test 2: Vérifier les logs de console

Lors du premier démarrage, vous devriez voir :

```
🔄 Application de la migration OPEX/CAPEX...
✅ Migration OPEX/CAPEX appliquée avec succès
```

Aux démarrages suivants :

```
ℹ️  Migration OPEX/CAPEX déjà appliquée
```

### Test 3: Vérifier les champs DB

Ouvrez la console de développement et exécutez :

```javascript
// Vérifier les colonnes de la table projets
db.getAllAsync('PRAGMA table_info(projets)');

// Vérifier les colonnes de la table revenus
db.getAllAsync('PRAGMA table_info(revenus)');
```

Vous devriez voir les nouveaux champs :
- **projets**: `duree_amortissement_par_defaut_mois`
- **revenus**: `poids_kg`, `cout_kg_opex`, `cout_kg_complet`, etc.

---

## 🔍 Détails Techniques

### Champs Ajoutés

#### Table `projets`
```sql
ALTER TABLE projets ADD COLUMN duree_amortissement_par_defaut_mois INTEGER DEFAULT 36;
```

**Description:** Durée d'amortissement par défaut pour les investissements CAPEX (en mois).

#### Table `revenus`
```sql
-- Poids du porc vendu
ALTER TABLE revenus ADD COLUMN poids_kg REAL;

-- Coûts par kg au moment de la vente
ALTER TABLE revenus ADD COLUMN cout_kg_opex REAL;
ALTER TABLE revenus ADD COLUMN cout_kg_complet REAL;

-- Coûts réels pour ce porc
ALTER TABLE revenus ADD COLUMN cout_reel_opex REAL;
ALTER TABLE revenus ADD COLUMN cout_reel_complet REAL;

-- Marges en valeur
ALTER TABLE revenus ADD COLUMN marge_opex REAL;
ALTER TABLE revenus ADD COLUMN marge_complete REAL;

-- Marges en pourcentage
ALTER TABLE revenus ADD COLUMN marge_opex_pourcent REAL;
ALTER TABLE revenus ADD COLUMN marge_complete_pourcent REAL;
```

**Description:** Champs pour stocker les marges calculées automatiquement lors de chaque vente de porc.

---

## ⚠️ Résolution de Problèmes

### Problème 1: Migration déjà appliquée mais champs manquants

**Symptômes:**
- Console affiche "Migration déjà appliquée"
- Mais erreur "no such column" lors de l'utilisation

**Solution:**
1. Supprimez la table de contrôle des migrations :
   ```sql
   DELETE FROM migrations WHERE name = 'opex_capex_fields';
   ```
2. Redémarrez l'application

### Problème 2: Erreur "table migrations not found"

**Symptômes:**
- Erreur lors de la vérification de la migration

**Solution:**
La table sera créée automatiquement. Redémarrez simplement l'application.

### Problème 3: Données existantes

**Question:** Que deviennent mes données existantes ?

**Réponse:**
- ✅ Toutes vos données existantes sont **préservées**
- ✅ Les nouveaux champs sont ajoutés avec des valeurs `NULL`
- ✅ Aucune donnée n'est supprimée ou modifiée

**Actions pour les données existantes:**
- Les **nouveaux projets** auront une durée d'amortissement de 36 mois par défaut
- Les **projets existants** auront `NULL` (l'app utilisera 36 mois par défaut)
- Les **ventes existantes** n'auront pas de marges calculées (normal)
- Les **nouvelles ventes** avec poids auront les marges automatiquement

---

## 📊 Tests Fonctionnels Post-Migration

### Test 1: Paramètres du Projet

1. Ouvrir **Paramètres**
2. Modifier le projet
3. Vérifier présence du champ **"Durée d'amortissement (mois)"**
4. Changer la valeur (ex: 24 mois)
5. Sauvegarder
6. ✅ Doit sauvegarder sans erreur

### Test 2: Créer une Dépense CAPEX

1. Aller dans **Finance > Dépenses**
2. Créer une nouvelle dépense
3. Sélectionner catégorie **"Investissement"** ou **"Équipement lourd"**
4. Vérifier l'affichage de **"💰 CAPEX - Investissement (amorti sur X mois)"**
5. Sauvegarder
6. ✅ Doit sauvegarder sans erreur

### Test 3: Créer une Vente de Porc avec Poids

1. Aller dans **Finance > Revenus**
2. Créer un nouveau revenu
3. Catégorie: **"Vente de porc"**
4. Remplir montant et **poids (kg)**
5. Sauvegarder
6. ✅ Doit sauvegarder et calculer les marges automatiquement

### Test 4: Voir les Détails d'une Vente

1. Dans la liste des revenus
2. Cliquer sur **"📊 Voir détails & marges"** d'une vente avec poids
3. ✅ Modal doit s'ouvrir avec toutes les informations :
   - Informations générales
   - Coûts de production (OPEX / Complet)
   - Marges (OPEX / Complète) avec couleurs

### Test 5: Dashboard Widget Coûts

1. Retourner au **Dashboard**
2. Scroller jusqu'au widget **"📊 Coût de Production"**
3. ✅ Doit afficher :
   - Coût/kg OPEX
   - Coût/kg Complet
   - Marge moyenne

### Test 6: Graphique OPEX vs CAPEX

1. Aller dans **Finance > Graphiques**
2. Scroller jusqu'au graphique **"📊 OPEX vs CAPEX Amorti"**
3. ✅ Doit afficher un graphique sur 6 mois

---

## ✅ Checklist Finale

Avant de déployer en production :

- [ ] Migration intégrée dans `database.ts`
- [ ] Application démarrée sans erreur
- [ ] Logs de migration visibles dans console
- [ ] Test 1: Champ amortissement visible
- [ ] Test 2: Dépense CAPEX créée avec indicateur
- [ ] Test 3: Vente avec poids créée + marges calculées
- [ ] Test 4: Modal détails vente fonctionnel
- [ ] Test 5: Widget Dashboard affiché
- [ ] Test 6: Graphique OPEX/CAPEX affiché
- [ ] Aucune erreur dans console
- [ ] Sauvegarde base de données existante (recommandé)

---

## 📞 Support

En cas de problème :

1. **Vérifier les logs** de la console
2. **Lire** `OPEX_CAPEX_INTEGRATION_GUIDE.md` pour plus de détails
3. **Consulter** `OPEX_CAPEX_STATUS_FINAL.md` pour le status complet
4. **Tester** sur environnement de développement d'abord

---

## 🎯 Prochaines Étapes Après Migration

Une fois la migration appliquée et testée :

1. ✅ **Former** les utilisateurs au concept OPEX/CAPEX
2. ✅ **Expliquer** l'importance du poids pour les marges
3. ✅ **Encourager** à remplir la durée d'amortissement
4. ✅ **Suivre** l'adoption des nouvelles fonctionnalités

---

**Date de création:** 21 Novembre 2025  
**Dernière mise à jour:** 21 Novembre 2025  
**Auteur:** Assistant AI  
**Version:** 1.0

🚀 **Bonne intégration !**

