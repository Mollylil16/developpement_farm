# Service API Client

Service pour communiquer avec le backend NestJS.

## Utilisation

```typescript
import apiClient from '../services/api/apiClient';

// GET
const users = await apiClient.get('/users');

// POST
const user = await apiClient.post('/auth/register', {
  email: 'user@example.com',
  nom: 'Dupont',
  prenom: 'Jean',
});

// Avec gestion d'erreur
try {
  const data = await apiClient.get('/users');
} catch (error) {
  console.error(error.message); // Message en français
}
```

## Fonctionnalités

- ✅ **Gestion automatique du token JWT** : Ajouté automatiquement à chaque requête
- ✅ **Refresh automatique** : Rafraîchit le token si expiré (401)
- ✅ **Timeout** : 10 secondes par défaut
- ✅ **Messages d'erreur en français**
- ✅ **Intercepteurs** : Personnalisables
- ✅ **TypeScript** : Typage complet

## Configuration

Modifier `API_BASE_URL` dans `apiClient.ts` :
- Dev : `http://localhost:3000`
- Prod : `https://api.fermier-pro.com`

## Intercepteurs

### Ajouter un intercepteur personnalisé

```typescript
// Intercepteur de requête
apiClient.addRequestInterceptor(async (config) => {
  // Modifier la config avant l'envoi
  return config;
});

// Intercepteur de réponse
apiClient.addResponseInterceptor(async (response) => {
  // Modifier la réponse
  return response;
});

// Intercepteur d'erreur
apiClient.addErrorInterceptor(async (error) => {
  // Modifier l'erreur
  return error;
});
```

