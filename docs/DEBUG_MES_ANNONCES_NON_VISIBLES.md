# Debug : Les sujets mis en vente n'apparaissent toujours pas dans "Mes annonces"

## Problème

Malgré l'ajout du paramètre `user_id` dans la requête, les sujets mis en vente n'apparaissent toujours pas dans "Mes annonces".

## Corrections appliquées

### 1. Ajout du paramètre `user_id` dans la requête

**Fichier :** `src/screens/marketplace/MarketplaceScreen.tsx`

**Changement :**
```typescript
const allListings = await apiClient.get<MarketplaceListing[]>('/marketplace/listings', {
  params: { 
    projet_id: projetActif.id,
    user_id: user.id, // ✅ Filtrer par producteur
  },
});
```

### 2. Correction du rafraîchissement après création

**Fichier :** `src/screens/marketplace/MarketplaceScreen.tsx`

**Changement :**
```typescript
onSuccess={() => {
  setBatchAddModalVisible(false);
  // Recharger les listings de l'onglet actif
  if (activeTab === 'mes-annonces') {
    loadMyListings(); // ✅ Recharger "Mes annonces" si on est sur cet onglet
  } else {
    loadListings();
  }
}}
```

### 3. Ajout d'un délai avant rechargement

**Fichier :** `src/components/marketplace/BatchAddModal.tsx`

**Changement :**
```typescript
onPress: () => {
  onClose();
  // Attendre un peu pour laisser le backend finaliser la création
  setTimeout(() => {
    onSuccess();
  }, 500);
}
```

### 4. Logs de débogage ajoutés

**Frontend :**
- Logs dans `loadMyListings` pour voir les paramètres de requête et les résultats
- Logs pour voir le nombre de listings avant et après filtrage par statut

**Backend :**
- Logs dans `findAllListings` pour voir les paramètres de requête et les résultats
- Logs dans `createIndividualListing` pour voir les détails du listing créé

## Points à vérifier

1. **Vérifier les logs du backend** :
   - Vérifier que `findAllListings` reçoit bien `userId` et `projetId`
   - Vérifier que la requête SQL filtre correctement par `producer_id`
   - Vérifier le nombre de listings retournés

2. **Vérifier les logs du frontend** :
   - Vérifier que `loadMyListings` est appelé avec les bons paramètres
   - Vérifier le nombre de listings reçus
   - Vérifier le nombre de listings après filtrage par statut

3. **Vérifier la création des listings** :
   - Vérifier que les listings sont créés avec le bon `producer_id`
   - Vérifier que les listings sont créés avec le statut `'available'`
   - Vérifier que les listings sont bien insérés dans la base de données

4. **Vérifier le rafraîchissement** :
   - Vérifier que `loadMyListings` est appelé après la création
   - Vérifier que l'onglet actif est bien "mes-annonces"
   - Vérifier que les listings sont rechargés après le délai de 500ms

## Prochaines étapes de diagnostic

1. **Créer une annonce** et vérifier les logs du backend pour voir si elle est bien créée
2. **Ouvrir "Mes annonces"** et vérifier les logs pour voir si la requête est bien faite avec `user_id`
3. **Vérifier les logs** pour voir combien de listings sont retournés
4. **Vérifier le statut** des listings créés pour s'assurer qu'ils sont `'available'` ou `'reserved'`

## Fichiers modifiés

- `src/screens/marketplace/MarketplaceScreen.tsx` :
  - Ajout du paramètre `user_id` dans la requête
  - Correction du rafraîchissement après création
  - Ajout de logs de débogage

- `src/components/marketplace/BatchAddModal.tsx` :
  - Ajout d'un délai avant rechargement
  - Ajout de logs

- `backend/src/marketplace/marketplace.service.ts` :
  - Ajout de logs de débogage dans `findAllListings`

- `backend/src/marketplace/marketplace-unified.service.ts` :
  - Ajout de logs de débogage dans `createIndividualListing`

## Notes

- Les logs de débogage aideront à identifier où se situe le problème
- Le délai de 500ms permet au backend de finaliser la transaction avant le rechargement
- Le filtrage par `producer_id` devrait fonctionner si les listings sont créés avec le bon `userId`

