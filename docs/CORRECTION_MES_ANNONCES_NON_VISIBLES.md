# Correction : Les sujets mis en vente n'apparaissent pas dans "Mes annonces"

## Problème identifié

Les sujets mis en vente depuis le marketplace n'apparaissaient pas dans l'onglet "Mes annonces" du marketplace.

## Analyse

**Fichier concerné :**
- `src/screens/marketplace/MarketplaceScreen.tsx` (fonction `loadMyListings`)

**Problème :**
La fonction `loadMyListings` récupérait les listings avec seulement le paramètre `projet_id`, mais ne passait pas le paramètre `user_id` pour filtrer par producteur. Le backend retournait donc tous les listings du projet, pas seulement ceux de l'utilisateur connecté.

**Code avant :**
```typescript
const allListings = await apiClient.get<MarketplaceListing[]>('/marketplace/listings', {
  params: { projet_id: projetActif.id },
});
```

**Code après :**
```typescript
const allListings = await apiClient.get<MarketplaceListing[]>('/marketplace/listings', {
  params: { 
    projet_id: projetActif.id,
    user_id: user.id, // Filtrer par producteur pour n'afficher que les annonces de l'utilisateur
  },
});
```

## Solution appliquée

### Modification du frontend

**Fichier :** `src/screens/marketplace/MarketplaceScreen.tsx`

**Changement :**
- Ajout du paramètre `user_id: user.id` dans la requête GET `/marketplace/listings`
- Le backend filtre maintenant correctement les listings par `producer_id` correspondant à `user_id`

**Fonctionnalité backend :**
Le backend (`marketplace.service.ts`) filtre déjà correctement les listings si `userId` est fourni :
```typescript
if (userId) {
  query += ` AND producer_id = $${params.length + 1}`;
  params.push(userId);
}
```

## Impact

### Avant
- ❌ Tous les listings du projet étaient affichés dans "Mes annonces"
- ❌ Les listings d'autres producteurs du même projet apparaissaient
- ❌ Les listings de l'utilisateur pouvaient être noyés dans la liste

### Après
- ✅ Seuls les listings de l'utilisateur connecté sont affichés
- ✅ Les listings d'autres producteurs sont exclus
- ✅ "Mes annonces" affiche uniquement les annonces de l'utilisateur

## Fichiers modifiés

- `src/screens/marketplace/MarketplaceScreen.tsx` :
  - Ajout du paramètre `user_id` dans la requête `loadMyListings`

## Tests recommandés

1. **Test de base** :
   - Créer une annonce depuis le marketplace
   - Ouvrir l'onglet "Mes annonces"
   - ✅ Vérifier que l'annonce créée apparaît dans la liste

2. **Test de filtrage** :
   - Créer plusieurs annonces avec différents utilisateurs sur le même projet
   - Ouvrir "Mes annonces" avec chaque utilisateur
   - ✅ Vérifier que chaque utilisateur ne voit que ses propres annonces

3. **Test de rafraîchissement** :
   - Créer une nouvelle annonce
   - Rafraîchir "Mes annonces" (pull-to-refresh)
   - ✅ Vérifier que la nouvelle annonce apparaît

4. **Test de statut** :
   - Créer une annonce avec statut "available"
   - ✅ Vérifier qu'elle apparaît dans "Mes annonces"
   - Changer le statut à "reserved"
   - ✅ Vérifier qu'elle apparaît toujours
   - Changer le statut à "removed"
   - ✅ Vérifier qu'elle n'apparaît plus (filtrée par le backend)

## Notes

- Le backend filtre déjà les listings avec `status != 'removed'`, donc les annonces supprimées ne s'affichent pas
- Le filtrage par `producer_id` est maintenant correctement appliqué côté backend
- Les listings sont triés par `listed_at DESC` pour afficher les plus récents en premier

