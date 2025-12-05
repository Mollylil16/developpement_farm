# Configuration de l'API pour le Prix Régional

## Vue d'ensemble

Le service `RegionalPriceService` permet de récupérer le prix régional du porc poids vif depuis une API externe. Si aucune API n'est configurée ou si l'API échoue, le système utilise un prix par défaut (2300 FCFA/kg).

## Architecture

```
RegionalPriceService
  ├─ Priorité 1: Prix stocké dans la base de données (moins de 24h)
  ├─ Priorité 2: API externe (si configurée et activée)
  └─ Priorité 3: Prix par défaut (2300 FCFA/kg)
```

## Configuration

### Option 1: Configuration dans le code

Modifier `src/services/RegionalPriceService.ts` :

```typescript
const DEFAULT_API_CONFIG: RegionalPriceAPIConfig = {
  enabled: true, // Activer l'API
  url: 'https://api.example.com/pork-price', // URL de votre API
  apiKey: 'votre-cle-api', // Optionnel
  timeout: 5000, // 5 secondes
  updateInterval: 24, // Mise à jour toutes les 24 heures
};
```

### Option 2: Configuration dynamique (recommandé)

Créer un fichier de configuration ou utiliser AsyncStorage :

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRegionalPriceService } from './RegionalPriceService';
import { getDatabase } from './database';

// Configuration de l'API
const apiConfig = {
  enabled: true,
  url: 'https://api.example.com/pork-price',
  apiKey: await AsyncStorage.getItem('REGIONAL_PRICE_API_KEY'),
  timeout: 5000,
  updateInterval: 24,
};

const db = await getDatabase();
const service = getRegionalPriceService(db, apiConfig);
```

## Format de l'API

L'API doit retourner un JSON avec l'un des formats suivants :

### Format 1: `price`
```json
{
  "price": 2300,
  "currency": "FCFA",
  "date": "2024-01-15T10:00:00Z"
}
```

### Format 2: `pricePerKg`
```json
{
  "pricePerKg": 2300,
  "currency": "FCFA"
}
```

### Format 3: `value`
```json
{
  "value": 2300,
  "currency": "FCFA"
}
```

## Authentification

Le service supporte deux méthodes d'authentification :

### Bearer Token
```typescript
{
  enabled: true,
  url: 'https://api.example.com/pork-price',
  apiKey: 'votre-token-bearer',
  // Le service ajoutera automatiquement: Authorization: Bearer votre-token-bearer
}
```

### API Key (à adapter selon votre API)
Modifier `RegionalPriceService.ts` ligne 95-99 pour changer le format :
```typescript
if (this.apiConfig.apiKey) {
  headers['X-API-Key'] = this.apiConfig.apiKey; // Au lieu de Authorization
}
```

## Exemple d'utilisation

```typescript
import { getDatabase } from './database';
import { getRegionalPriceService } from './RegionalPriceService';

// Configuration
const apiConfig = {
  enabled: true,
  url: 'https://api.example.com/pork-price',
  apiKey: 'votre-cle',
};

// Récupérer le prix
const db = await getDatabase();
const service = getRegionalPriceService(db, apiConfig);
const price = await service.getCurrentRegionalPrice(); // Retourne le prix en FCFA/kg

// Forcer une mise à jour depuis l'API
const updatedPrice = await service.forceUpdate();
```

## Gestion des erreurs

Le service gère automatiquement :
- ✅ Timeout (5 secondes par défaut)
- ✅ Erreurs réseau
- ✅ Format de réponse invalide
- ✅ Fallback vers le prix par défaut

## Stockage

Les prix récupérés depuis l'API sont stockés dans la table `regional_pork_price` avec :
- `price`: Prix en FCFA/kg
- `source`: 'api', 'manual', ou 'default'
- `updated_at`: Date de mise à jour

Le service utilise automatiquement le prix stocké s'il est récent (moins de 24h par défaut).

## Mise à jour manuelle

Pour mettre à jour le prix manuellement (sans API) :

```typescript
const db = await getDatabase();
await db.runAsync(
  `INSERT INTO regional_pork_price (id, price, source, updated_at)
   VALUES (?, ?, ?, ?)`,
  [`price_${Date.now()}`, 2400, 'manual', new Date().toISOString()]
);
```

## Notes importantes

1. **Sécurité** : Ne jamais commiter les clés API dans le code source
2. **Performance** : Le service met en cache le prix pendant 24h par défaut
3. **Fallback** : Si l'API échoue, le système continue de fonctionner avec le prix par défaut
4. **Flexibilité** : Le format de réponse de l'API peut être adapté selon vos besoins

