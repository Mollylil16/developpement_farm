# Diagnostic et correction : Pop-up bloquant le processus d'achat

## 🔍 Problème identifié

Le pop-up "Information" bloque le processus d'achat au lieu de permettre la continuation. Le problème vient du fait que `getMultipleListingsWithSubjects` retourne un tableau vide, mais la cause racine n'était pas identifiée.

## 📊 Analyse de la cause racine

### Flux de données

1. **FarmDetailsModal** crée des listings virtuels pour les batch listings :
   - `id` = `pigId` (ID de l'animal)
   - `originalListingId` = ID réel du listing dans `marketplace_listings`

2. **handleMakeOffer** construit les sélections :
   - Utilise `originalListingId` si disponible, sinon `listing.id`
   - Envoie ces IDs à `handleMakeOfferFromFarm`

3. **handleMakeOfferFromFarm** appelle le backend :
   - Envoie les `listingIds` à `getMultipleListingsWithSubjects`
   - Le backend cherche les listings dans `marketplace_listings` avec ces IDs

4. **Problème potentiel** :
   - Si `originalListingId` n'est pas défini ou est incorrect
   - Les IDs envoyés peuvent être des `pigId` au lieu de `listingId`
   - Le backend ne trouve pas les listings → retourne un tableau vide

## ✅ Corrections apportées

### 1. Logs de diagnostic ajoutés

#### Frontend - MarketplaceService.ts
- Log des `listingIds` envoyés au backend
- Log de la réponse reçue avec détails
- Log détaillé des erreurs

#### Frontend - MarketplaceScreen.tsx
- Log des sélections reçues dans `handleMakeOfferFromFarm`
- Log des IDs qui seront envoyés au backend
- Log de la réponse du backend avec détails

#### Backend - marketplace.service.ts
- Log des `listingIds` reçus
- Log des résultats (réussis/échoués) avec détails
- Log spécifique quand un listing n'est pas trouvé
- Vérification si l'ID correspond à un `pigId` au lieu d'un `listingId`

### 2. Validation améliorée

#### FarmDetailsModal.tsx
- Validation que `originalListingId` est défini pour les listings batch virtuels
- Log d'erreur si `originalListingId` est manquant
- Meilleure gestion des cas limites

### 3. Messages d'erreur améliorés

- Messages plus détaillés avec contexte
- Logs structurés pour faciliter le débogage

## 🔧 Prochaines étapes pour le diagnostic

1. **Reproduire le problème** avec les nouveaux logs
2. **Vérifier les logs** pour identifier :
   - Les `listingIds` envoyés au backend
   - Les IDs qui échouent et pourquoi
   - Si des `pigId` sont envoyés au lieu de `listingId`

3. **Analyser les résultats** :
   - Si tous les IDs échouent → problème de construction des IDs
   - Si certains IDs échouent → problème spécifique à certains listings
   - Si le backend retourne des listings mais sans sujets → problème de récupération des sujets

## 🐛 Problème critique identifié et corrigé

### Problème SQL avec `pig_ids` JSONB

**Localisation** : `backend/src/marketplace/marketplace.service.ts` ligne 965-966

**Problème** : La requête SQL utilisait `WHERE a.id = ANY($1)` avec `listing.pig_ids` directement, mais `pig_ids` est un JSONB array dans la base de données. PostgreSQL ne peut pas utiliser directement un JSONB avec l'opérateur `ANY()` sur un array PostgreSQL.

**Correction appliquée** :
- Conversion correcte de `pig_ids` JSONB en array PostgreSQL `varchar[]`
- Gestion de tous les cas : array JavaScript, string JSON, ou JSONB
- Utilisation de `ANY($1::varchar[])` avec le bon type
- Logs d'avertissement si aucun `pigId` valide n'est trouvé

**Impact** : Cette correction devrait résoudre les cas où les listings batch ne retournent pas de sujets, ce qui causait le tableau vide.

### Problème SQL critique #2 : Table incorrecte pour les listings batch

**Localisation** : `backend/src/marketplace/marketplace.service.ts` ligne 986-1005

**Problème** : La requête SQL cherchait les animaux des listings batch dans `production_animaux`, mais pour les listings batch, les animaux sont stockés dans `batch_pigs`, pas dans `production_animaux`.

**Correction appliquée** :
- Changement de la requête SQL pour chercher dans `batch_pigs` au lieu de `production_animaux`
- Adaptation des colonnes : `batch_pigs` a une structure différente (`name` au lieu de `code`, `current_weight_kg` au lieu de `poids_initial`, `photo_url` au lieu de `photo_uri`, etc.)
- Utilisation des colonnes correctes : `sex`, `birth_date`, `last_weighing_date`, `current_weight_kg`

**Impact** : Cette correction devrait résoudre le problème principal : les listings batch retourneront maintenant les sujets correctement depuis `batch_pigs`.

## 📝 Fichiers modifiés

1. `src/services/MarketplaceService.ts` - Logs de diagnostic ajoutés
2. `src/screens/marketplace/MarketplaceScreen.tsx` - Logs de diagnostic et validation améliorée
3. `src/components/marketplace/FarmDetailsModal.tsx` - Validation de `originalListingId`
4. `backend/src/marketplace/marketplace.service.ts` - **Logs de diagnostic détaillés + Correction SQL critique pour pig_ids JSONB**

## 🎯 Résultat attendu

Après ces modifications, les logs permettront d'identifier précisément :
- Pourquoi `getMultipleListingsWithSubjects` retourne un tableau vide
- Quels IDs sont envoyés et lesquels échouent
- Si le problème vient de la construction des IDs ou de la récupération des données

Une fois la cause identifiée, une correction ciblée pourra être appliquée.
