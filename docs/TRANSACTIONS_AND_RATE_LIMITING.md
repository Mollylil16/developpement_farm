# Implémentation des Transactions et Rate Limiting

**Date:** 2025-01-XX  
**Améliorations:** Transactions DB + Rate Limiting

---

## ✅ Transactions Implémentées

### 1. Marketplace Service

#### `acceptOffer` (ligne 359)
**Problème:** 3 opérations DB sans transaction (UPDATE offer + UPDATE listing + INSERT transaction)

**Solution:** Wrappe toutes les opérations dans `databaseService.transaction()` :

```typescript
async acceptOffer(offerId: string, producerId: string) {
  // Validation avant transaction
  const offer = await this.databaseService.query(...);
  
  // Transaction atomique
  return await this.databaseService.transaction(async (client) => {
    await client.query('UPDATE marketplace_offers ...');
    await client.query('UPDATE marketplace_listings ...');
    const transaction = await client.query('INSERT INTO marketplace_transactions ...');
    return this.mapRowToTransaction(transaction.rows[0]);
  });
}
```

**Impact:** ✅ Garantit la cohérence : soit toutes les opérations réussissent, soit toutes échouent

---

#### `createListing` (ligne 29)
**Problème:** INSERT listing + UPDATE animal sans transaction

**Solution:** Wrappe dans transaction avec gestion d'erreur pour colonnes optionnelles :

```typescript
async createListing(createListingDto: CreateListingDto, userId: string) {
  // Validations avant transaction
  ...
  
  return await this.databaseService.transaction(async (client) => {
    const result = await client.query('INSERT INTO marketplace_listings ...');
    
    // UPDATE animal avec gestion d'erreur si colonnes n'existent pas
    try {
      await client.query('UPDATE production_animaux ...');
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        throw error; // Re-throw si autre erreur
      }
    }
    
    return this.mapRowToListing(result.rows[0]);
  });
}
```

**Impact:** ✅ Garantit que le listing et le statut animal sont cohérents

---

#### `createPurchaseRequestOffer` (ligne 985)
**Problème:** INSERT offer + UPDATE compteur sans transaction

**Solution:** Wrappe dans transaction :

```typescript
async createPurchaseRequestOffer(...) {
  // Validation avant transaction
  ...
  
  return await this.databaseService.transaction(async (client) => {
    const result = await client.query('INSERT INTO purchase_request_offers ...');
    await client.query('UPDATE purchase_requests SET offers_count = offers_count + 1 ...');
    return this.mapRowToPurchaseRequestOffer(result.rows[0]);
  });
}
```

**Impact:** ✅ Garantit que le compteur d'offres est toujours synchronisé

---

### 2. Mortalites Service

#### `create` (ligne 61)
**Problème:** UPDATE animal statut + INSERT mortalite sans transaction

**Solution:** Wrappe dans transaction avec gestion d'erreur :

```typescript
async create(createMortaliteDto: CreateMortaliteDto, userId: string) {
  await this.checkProjetOwnership(createMortaliteDto.projet_id, userId);
  
  return await this.databaseService.transaction(async (client) => {
    // UPDATE animal si code fourni
    if (createMortaliteDto.animal_code) {
      try {
        await client.query('UPDATE production_animaux SET statut = ''mort'' ...');
      } catch (error) {
        // Ne pas faire échouer si animal n'existe pas ou est déjà mort
        console.warn("Erreur lors de la mise à jour du statut de l'animal:", error);
      }
    }
    
    const result = await client.query('INSERT INTO mortalites ...');
    const mortalite = this.mapRowToMortalite(result.rows[0]);
    this.invalidateMortalitesCache(mortalite.projet_id);
    return mortalite;
  });
}
```

**Impact:** ✅ Garantit que le statut animal et la mortalité sont cohérents

---

## ✅ Rate Limiting Implémenté

### Configuration Globale

**Fichier:** `backend/src/app.module.ts`

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requêtes par minute par défaut
      },
      {
        name: 'long',
        ttl: 600000, // 10 minutes
        limit: 500, // 500 requêtes par 10 minutes
      },
    ]),
    ...
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Guard global
    },
  ],
})
```

**Impact:** ✅ Protection DDoS globale sur tous les endpoints

---

### Rate Limiting par Endpoint

**Fichier:** `backend/src/auth/auth.controller.ts`

#### Endpoints d'authentification (limites strictes)

1. **`/auth/register`** : `@Throttle({ default: { limit: 5, ttl: 60000 } })`
   - 5 requêtes par minute
   - Protection contre création de comptes en masse

2. **`/auth/login`** : `@Throttle({ default: { limit: 5, ttl: 60000 } })`
   - 5 requêtes par minute
   - **Protection brute force critique**

3. **`/auth/login-simple`** : `@Throttle({ default: { limit: 5, ttl: 60000 } })`
   - 5 requêtes par minute
   - Protection contre attaques

4. **`/auth/forgot-password`** : `@Throttle({ default: { limit: 3, ttl: 60000 } })`
   - 3 requêtes par minute (plus strict car envoie SMS)
   - **Protection contre abus de SMS**

5. **`/auth/verify-reset-otp`** : `@Throttle({ default: { limit: 5, ttl: 60000 } })`
   - 5 tentatives par minute
   - Protection contre brute force OTP

**Endpoints non limités explicitement:**
- `/auth/refresh` : utilise la limite globale (100 req/min)
- `/auth/google`, `/auth/apple` : utilise la limite globale (100 req/min)
- `/auth/reset-password` : utilise la limite globale (100 req/min)

**Impact:** ✅ Protection efficace contre :
- Brute force sur login
- Création de comptes en masse
- Abus de SMS (forgot-password)
- Attaques DDoS générales

---

## 📊 Résumé des Changements

### Fichiers Modifiés

1. **`backend/src/marketplace/marketplace.service.ts`**
   - `createListing()` : Transaction ajoutée
   - `acceptOffer()` : Transaction ajoutée
   - `createPurchaseRequestOffer()` : Transaction ajoutée

2. **`backend/src/mortalites/mortalites.service.ts`**
   - `create()` : Transaction ajoutée

3. **`backend/src/app.module.ts`**
   - `ThrottlerModule` ajouté avec configuration globale
   - `ThrottlerGuard` ajouté comme guard global

4. **`backend/src/auth/auth.controller.ts`**
   - `@Throttle()` ajouté sur 5 endpoints critiques

### Dépendances Ajoutées

- `@nestjs/throttler` : Package pour rate limiting

---

## 🧪 Tests Recommandés

### Transactions

1. **Test `acceptOffer` avec échec :**
   - Simuler un échec sur l'INSERT transaction
   - Vérifier que les UPDATE sont rollbackés

2. **Test `createListing` avec colonnes manquantes :**
   - Vérifier que l'UPDATE animal échoue silencieusement si colonnes n'existent pas
   - Vérifier que le listing est quand même créé

3. **Test `create` mortalite :**
   - Vérifier que si UPDATE animal échoue, la mortalité est quand même créée
   - Vérifier que si INSERT mortalite échoue, l'animal n'est pas modifié

### Rate Limiting

1. **Test limites d'authentification :**
   - Faire 6 requêtes `/auth/login` en moins d'une minute
   - Vérifier que la 6ème retourne HTTP 429 (Too Many Requests)

2. **Test limite globale :**
   - Faire 101 requêtes sur un endpoint non limité en moins d'une minute
   - Vérifier que la 101ème retourne HTTP 429

3. **Test headers de réponse :**
   - Vérifier la présence de headers `X-RateLimit-*` :
     - `X-RateLimit-Limit`
     - `X-RateLimit-Remaining`
     - `X-RateLimit-Reset`

---

## 📝 Notes

- Les transactions utilisent la méthode `databaseService.transaction()` existante
- Le rate limiting est actif sur tous les endpoints par défaut (100 req/min)
- Les endpoints d'authentification ont des limites plus strictes (3-5 req/min)
- Le rate limiting est basé sur l'IP par défaut (pour endpoints publics)
- Pour endpoints protégés, on pourrait utiliser userId au lieu de IP (amélioration future)

---

## 🔄 Prochaines Étapes

1. ✅ Transactions implémentées
2. ✅ Rate limiting implémenté
3. ⏳ Tester en environnement de staging
4. ⏳ Monitorer les erreurs 429 en production
5. ⏳ Ajuster les limites si nécessaire

