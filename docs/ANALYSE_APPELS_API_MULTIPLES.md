# Analyse des Appels API Multiples - Rate Limit

## Problèmes Identifiés

Lors du changement de profil (acheteur → vétérinaire/technicien), de nombreux appels API sont effectués simultanément, causant un rate limit (429).

### PROBLÈME MAJEUR : Le backend ne lisait pas le bon `activeRole`

**Cause racine** : Le backend utilisait `@CurrentUser('activeRole')` pour récupérer le rôle actif du JWT token. Or, **le JWT ne contient pas `activeRole`** ! La stratégie JWT (`jwt.strategy.ts`) retourne seulement `id`, `email`, et `roles`.

```typescript
// jwt.strategy.ts - Ce qui est retourné par le JWT
const result = {
  id: user.id,
  email: user.email,
  roles: user.roles || [],  // PAS de activeRole !
};
```

**Résultat** : `@CurrentUser('activeRole')` retournait toujours `undefined`, donc l'API renvoyait systématiquement une erreur 403.

**Solution** : Le backend doit lire `active_role` depuis la base de données, pas depuis le JWT.

---

## Autres Causes Identifiées

### 1. **Dépendances multiples dans `useEffect`**

Le `useEffect` dans `CollaborationVetTechScreen.tsx` a trop de dépendances qui changent simultanément :

```typescript
useEffect(() => {
  // ...
}, [isFocused, activeRole, currentActiveRole, user?.activeRole, loadQRCode]);
```

**Problème** : Lors du `switchRole` :
- `setActiveRole(role)` → déclenche le useEffect
- `dispatch(updateUser(optimisticUser))` → déclenche le useEffect
- Backend répond et met à jour Redux → déclenche le useEffect

**Résultat** : 3+ appels API en quelques millisecondes.

### 2. **Pas de debounce/throttle**

Chaque changement de dépendance déclenche immédiatement un appel API, même si plusieurs changements se produisent rapidement.

### 3. **Pas de vérification d'appel en cours**

Aucun mécanisme pour empêcher les appels multiples si un appel est déjà en cours.

### 4. **Délai de synchronisation insuffisant**

Le délai de 200ms n'est pas suffisant pour laisser le contexte se synchroniser complètement.

## Solutions Implémentées

### 0. **CORRECTION MAJEURE : Backend lit `active_role` de la DB**

```typescript
// AVANT (ne fonctionnait pas)
async generateProfileQRCode(
  @CurrentUser('id') userId: string,
  @CurrentUser('activeRole') activeRole: string | undefined, // Toujours undefined!
)

// APRÈS (corrigé)
async generateProfileQRCode(
  @CurrentUser('id') userId: string,
  @Query('expiry') expiry?: string
) {
  // Récupérer active_role depuis la base de données
  const userResult = await this.databaseService.query(
    `SELECT active_role FROM users WHERE id = $1`,
    [userId]
  );
  const activeRole = userResult.rows[0]?.active_role; // Source de vérité!
}
```

### 1. **Refs pour tracker les appels**

```typescript
const loadQRCodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const isLoadQRCodeInProgressRef = useRef<boolean>(false);
const lastLoadedRoleRef = useRef<string | null>(null);
```

### 2. **Vérification d'appel en cours**

```typescript
// Vérifier si un appel est déjà en cours pour le même rôle
const currentRole = roleToCheck || activeRole || user?.activeRole;
if (isLoadQRCodeInProgressRef.current && lastLoadedRoleRef.current === currentRole) {
  console.log('[CollaborationVetTechScreen] Appel QR code déjà en cours pour ce rôle, ignoré');
  return;
}
```

### 3. **Debounce avec timeout**

```typescript
// Utiliser un debounce pour éviter les appels multiples lors de changements rapides
loadQRCodeTimeoutRef.current = setTimeout(async () => {
  // ...
}, 800); // Délai de 800ms pour debounce et synchronisation backend
```

### 4. **Cleanup des timeouts**

```typescript
return () => {
  isMounted = false;
  if (loadQRCodeTimeoutRef.current) {
    clearTimeout(loadQRCodeTimeoutRef.current);
    loadQRCodeTimeoutRef.current = null;
  }
};
```

### 5. **Vérification du rôle avant appel**

```typescript
// Vérifier si on a déjà chargé pour ce rôle
if (lastLoadedRoleRef.current !== finalRole) {
  await loadQRCode(true);
}
```

## Recommandations Supplémentaires

### 1. **Simplifier les dépendances du useEffect**

Au lieu de dépendre de `activeRole`, `currentActiveRole`, et `user?.activeRole`, utiliser uniquement `user?.activeRole` qui est la source de vérité.

### 2. **Utiliser un hook de debounce personnalisé**

Créer un hook `useDebouncedEffect` pour gérer automatiquement le debounce.

### 3. **Ajouter un cache pour les QR codes**

Mettre en cache les QR codes générés pour éviter les appels inutiles si le rôle n'a pas changé.

### 4. **Rate limiting côté client**

Implémenter un rate limiter côté client pour éviter de dépasser les limites du serveur.

## Tests à Effectuer

1. **Test de changement de profil rapide** : Changer rapidement entre plusieurs profils et vérifier qu'un seul appel API est effectué.

2. **Test de navigation rapide** : Naviguer rapidement vers/depuis l'écran et vérifier qu'aucun appel n'est effectué si l'écran n'est plus focus.

3. **Test de rate limit** : Vérifier que le système gère correctement les erreurs 429 et attend avant de réessayer.

## Métriques à Surveiller

- Nombre d'appels API par changement de profil (devrait être ≤ 1)
- Temps entre le changement de profil et l'appel API (devrait être ≥ 500ms)
- Nombre d'erreurs 429 (devrait être 0)
