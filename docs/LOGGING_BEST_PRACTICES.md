# Guide des Bonnes Pratiques de Logging

**Date** : 2025-01-XX  
**Version** : 1.0

---

## 🔒 Règles de Sécurité Essentielles

### ⚠️ NE JAMAIS Logger

1. **Tokens d'authentification**
   - ❌ `access_token`, `refresh_token`, `auth_token`
   - ❌ Tokens JWT (même partiellement)
   - ❌ Bearer tokens

2. **Mots de passe**
   - ❌ Mots de passe en clair
   - ❌ Hashs de mots de passe (peuvent être crackés)
   - ❌ OTP, PIN, codes secrets

3. **Secrets et clés API**
   - ❌ Clés API (`api_key`, `apikey`)
   - ❌ Clés privées/publiques
   - ❌ Secrets d'application

4. **Données personnelles sensibles**
   - ❌ Numéros de carte bancaire, CVV
   - ❌ Numéros de sécurité sociale (SSN)
   - ❌ Informations médicales sensibles

5. **Identifiants complets**
   - ❌ Noms de clés SecureStore complets
   - ❌ Chemins de fichiers avec tokens
   - ❌ URLs avec tokens en paramètres

---

## ✅ Ce qui PEUT être Loggé

### Informations Sûres à Logger

1. **Métadonnées**
   - ✅ ID utilisateur (pas le token)
   - ✅ Type d'opération (ex: `access_token`, `refresh_token` au lieu du nom complet)
   - ✅ Longueur de chaînes (pour validation)
   - ✅ Statut de validation (true/false)

2. **Données de debug**
   - ✅ Messages d'erreur (sans tokens)
   - ✅ Codes d'erreur HTTP
   - ✅ Types d'erreurs
   - ✅ Stack traces (sans données sensibles)

3. **Données publiques**
   - ✅ Noms, prénoms (sans SSN)
   - ✅ Emails (sans mots de passe)
   - ✅ IDs de projets, animaux, etc.

---

## 📋 Utilisation du Logger

### Logger Standard

```typescript
import { logger } from '../utils/logger';

// ✅ BON : Logger un message simple
logger.info('Utilisateur connecté');

// ✅ BON : Logger avec données sanitizées automatiquement
logger.debug('Tentative de connexion', {
  userId: 'user_123',
  email: 'user@example.com',
});

// ❌ MAUVAIS : Ne pas logger directement des tokens
logger.debug('Token reçu', { token: accessToken }); // ❌ DANGEREUX

// ✅ BON : Utiliser le logger structuré pour des données complexes
logger.structured({
  level: 'info',
  message: 'Utilisateur connecté avec succès',
  data: {
    userId: 'user_123',
    email: 'user@example.com',
    // Les champs sensibles seront automatiquement masqués
  },
  tags: ['auth', 'login'],
});
```

### Logger Structuré (Recommandé)

Le logger structuré sanitize automatiquement toutes les données :

```typescript
logger.structured({
  level: 'info',
  message: 'Requête API réussie',
  data: {
    endpoint: '/api/users',
    method: 'GET',
    userId: 'user_123',
    // Même si vous passez un token par erreur, il sera masqué automatiquement
    access_token: 'eyJhbGciOiJIUzI1NiIs...', // → Sera automatiquement masqué
  },
  tags: ['api', 'users'],
});
```

**Résultat** :
```json
{
  "message": "Requête API réussie",
  "timestamp": "2025-01-XXT...",
  "data": {
    "endpoint": "/api/users",
    "method": "GET",
    "userId": "user_123",
    "access_token": "***REDACTED***"
  },
  "tags": ["api", "users"]
}
```

---

## 🛠️ Fonctions Utilitaires

### Sanitization Manuelle (Si Nécessaire)

Si vous devez logger des données avant qu'elles n'atteignent le logger :

```typescript
import { sanitizeLogMessage } from '../utils/logger';

const userData = {
  email: 'user@example.com',
  password: 'secret123', // Sera masqué
  access_token: 'token...', // Sera masqué
};

const safeData = sanitizeLogMessage(userData);
logger.debug('Données utilisateur', safeData);
```

---

## 🔍 Audit des Logs

### Checklist d'Audit

Avant de déployer en production, vérifier :

- [ ] Aucun token n'apparaît dans les logs
- [ ] Aucun mot de passe n'apparaît dans les logs
- [ ] Aucune clé API n'apparaît dans les logs
- [ ] Les noms de clés SecureStore ne sont pas loggés en entier
- [ ] Les URLs avec tokens sont sanitizées
- [ ] Les objets utilisateur ne contiennent pas de tokens

### Commandes pour Auditer

```bash
# Chercher des tokens potentiels dans les logs
grep -r "access_token" src/ --include="*.ts" --include="*.tsx" | grep -v "REDACTED\|sanitize\|masquer"

# Chercher des mots de passe
grep -r "password" src/ --include="*.ts" --include="*.tsx" | grep -i "log\|console"

# Chercher des console.log directs (devrait utiliser logger)
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

---

## 📊 Niveaux de Log

### Définition des Niveaux

- **`error`** : Erreurs critiques (toujours loggées, même en production)
- **`warn`** : Avertissements (développement uniquement)
- **`info`** : Informations générales (développement uniquement)
- **`debug`** : Informations de debug détaillées (développement uniquement)
- **`success`** : Opérations réussies (développement uniquement)

### Quand Utiliser Chaque Niveau

```typescript
// ERROR : Erreurs critiques qui nécessitent une attention
logger.error('Échec de connexion à la base de données', { error });

// WARN : Problèmes non critiques mais à surveiller
logger.warn('Token proche de l\'expiration', { expiresIn: '5 minutes' });

// INFO : Événements importants de l'application
logger.info('Utilisateur connecté', { userId });

// DEBUG : Informations de debug détaillées
logger.debug('Vérification des permissions', { userId, action: 'create_animal' });

// SUCCESS : Opérations réussies (optionnel)
logger.success('Animal créé avec succès', { animalId });
```

---

## 🎯 Exemples d'Utilisation

### Exemple 1 : Logger une Requête API

```typescript
// ❌ MAUVAIS
console.log('Requête API', {
  url: '/api/users',
  headers: {
    Authorization: `Bearer ${token}`, // ❌ Token exposé
  },
});

// ✅ BON
logger.structured({
  level: 'debug',
  message: 'Requête API',
  data: {
    url: '/api/users',
    method: 'GET',
    // Le token sera automatiquement masqué si présent
  },
  tags: ['api'],
});
```

### Exemple 2 : Logger une Erreur

```typescript
// ❌ MAUVAIS
catch (error) {
  console.error('Erreur:', error); // ❌ Peut contenir des tokens dans la stack trace
}

// ✅ BON
catch (error) {
  logger.error('Erreur lors de la requête API', {
    message: error.message,
    status: error.status,
    // Ne pas logger error directement (peut contenir des tokens)
  });
}
```

### Exemple 3 : Logger des Données Utilisateur

```typescript
// ❌ MAUVAIS
logger.debug('Utilisateur', {
  ...user,
  // Si user contient un token, il sera loggé
});

// ✅ BON
logger.structured({
  level: 'info',
  message: 'Profil utilisateur chargé',
  data: {
    userId: user.id,
    email: user.email,
    prenom: user.prenom,
    // Ne pas inclure user.photo si c'est une URL avec token
    // Ne pas inclure user.access_token si présent
  },
  tags: ['user', 'profile'],
});
```

---

## 🚨 Signaler des Fuites Potentielles

Si vous trouvez des logs contenant des données sensibles :

1. **Ne pas paniquer** : Les tokens peuvent être révoqués
2. **Révoquer les tokens affectés** : Si des tokens sont exposés, les révoquer immédiatement
3. **Corriger le code** : Utiliser le logger structuré avec sanitization
4. **Vérifier les logs en production** : S'assurer que les fuites n'ont pas été exportées
5. **Documenter** : Ajouter une note dans ce document pour éviter les récidives

---

## 📝 Résumé

### Règles d'Or

1. ✅ **Toujours utiliser `logger` au lieu de `console.log`**
2. ✅ **Utiliser `logger.structured()` pour les données complexes**
3. ✅ **Ne jamais logger directement des tokens, mots de passe, ou secrets**
4. ✅ **Laisser le logger sanitizer automatiquement les données**
5. ✅ **Tester que les logs ne contiennent pas de données sensibles avant la production**

### Avantages du Logger Structuré

- ✅ Sanitization automatique
- ✅ Format JSON structuré
- ✅ Tags pour catégoriser
- ✅ Timestamp automatique
- ✅ Niveaux de log appropriés

---

**Note** : Ce document doit être régulièrement mis à jour avec les nouvelles bonnes pratiques et les leçons apprises.
