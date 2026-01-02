# 🚀 Démarrage Rapide - Uniformisation Marketplace

## ⚡ En 3 étapes simples

### Étape 1 : Appliquer la migration DB (5 min)

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
cd backend\database\migrations
.\apply-migration-063.ps1
```

**Saisissez le mot de passe PostgreSQL quand demandé.**

✅ **Résultat attendu :**
```
✅ Migration appliquée avec succès!
✅ Colonnes batch_pigs OK
✅ Colonnes batches OK
✅ Trigger de synchronisation OK
✅ Vue enrichie OK
```

---

### Étape 2 : Redémarrer le backend (2 min)

```powershell
cd ..\..  # Revenir dans backend/
npm run start:dev
```

✅ **Vérifiez dans les logs :**
- `[NestApplication] Nest application successfully started`
- `MarketplaceUnifiedService` est chargé

---

### Étape 3 : Tester le frontend (3 min)

```powershell
cd ..  # Revenir à la racine
npm run android  # ou npm run ios
```

✅ **Vérifiez :**
- L'app compile sans erreur
- Le marketplace s'affiche correctement
- Les listings ont leurs badges ("Individuel" ou "Bande")

---

## 🎯 C'est tout ! L'uniformisation est active

Vous pouvez maintenant :

### Utiliser les nouveaux composants

**Frontend - Affichage :**
```typescript
import { UnifiedListingCard } from '../components/marketplace';

<UnifiedListingCard listing={listing} onPress={handlePress} />
```

**Frontend - Création :**
```typescript
import { AddListingModal } from '../components/marketplace';

// Mode individuel
<AddListingModal
  visible={true}
  projetId={projet.id}
  subjectId={animal.id}
  subjectCode={animal.code}
  subjectWeight={animal.poids_actuel}
  onClose={closeModal}
  onSuccess={refreshListings}
/>

// Mode bande
<AddListingModal
  visible={true}
  projetId={projet.id}
  batchId={batch.id}
  batchName={batch.pen_name}
  batchCount={batch.total_count}
  batchAverageWeight={batch.average_weight_kg}
  onClose={closeModal}
  onSuccess={refreshListings}
/>
```

---

## 📚 Documentation complète

Si vous voulez plus de détails :

| Document | Pour quoi ? |
|----------|-------------|
| **`GUIDE_DEPLOIEMENT.md`** | Guide complet étape par étape |
| **`docs/MARKETPLACE_UNIFIED_USAGE.md`** | Documentation technique des composants |
| **`docs/MARKETPLACE_VALIDATION_CHECKLIST.md`** | 21 tests à exécuter |
| **`UNIFORMISATION_MARKETPLACE_COMPLETE.md`** | Vue d'ensemble du projet |

---

## 🆘 Problèmes courants

### ❌ "psql: command not found"

**Solution :** Ajoutez PostgreSQL à votre PATH Windows ou utilisez le chemin complet :
```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d farm_db_dev -f 063_uniformize_marketplace_batch_support.sql
```

### ❌ "password authentication failed"

**Solution :** Vérifiez votre mot de passe PostgreSQL. Par défaut c'est souvent `postgres`.

### ❌ "database farm_db_dev does not exist"

**Solution :** Utilisez le nom de votre base de données de développement :
```powershell
psql -U postgres -d farm_db -f 063_uniformize_marketplace_batch_support.sql
```

### ❌ Backend ne démarre pas

**Solution :** 
1. Vérifiez que la migration s'est bien passée
2. Vérifiez vos variables d'environnement `.env`
3. Regardez les logs d'erreur

---

## ✅ Checklist minimale

- [ ] Migration 063 appliquée ✅
- [ ] Backend redémarré sans erreur ✅
- [ ] Frontend compile ✅
- [ ] Au moins un listing visible dans l'app ✅

**Si ces 4 points sont OK, vous êtes prêt à continuer le développement !**

---

## 🎓 Ce qui a changé

### Backend
- ✅ Un seul service `MarketplaceUnifiedService` au lieu de 2
- ✅ Synchronisation automatique des statuts (trigger DB)
- ✅ Contraintes renforcées

### Frontend
- ✅ Un seul composant `UnifiedListingCard` au lieu de 2
- ✅ Un seul modal `AddListingModal` pour les 2 modes
- ✅ Interface cohérente

### Base de données
- ✅ Colonnes marketplace dans `batch_pigs` et `batches`
- ✅ Trigger de synchronisation automatique
- ✅ Vue enrichie pour requêtes performantes

### Pour l'utilisateur
- ✅ **Aucun changement visible** - Tout fonctionne comme avant, mais en mieux ! 🎉

---

**Version:** 1.0.0  
**Date:** 2026-01-02  
**Temps total d'installation:** ~10 minutes

