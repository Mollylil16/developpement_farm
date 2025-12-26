# Étape 2 : Résilience Réseau et Mode Offline - Guide d'Intégration

## ✅ Composants Créés

### 1. QueueManager (`src/services/chatAgent/core/QueueManager.ts`)
- ✅ Créé et fonctionnel
- ✅ Gère la file d'attente des actions en mode offline
- ✅ Stockage persistant dans AsyncStorage
- ✅ Traitement automatique quand la connexion revient
- ✅ Limite de taille (100 actions max) pour éviter de remplir le stockage

### 2. Retry Handler Amélioré (`src/services/api/retryHandler.ts`)
- ✅ Gestion du 429 (rate limiting) avec délai augmenté (5-10 secondes)
- ✅ Backoff exponentiel amélioré
- ✅ Détection réseau avant chaque retry

### 3. Détection Réseau
- ✅ Déjà présente dans `src/services/network/networkService.ts`

## 📋 Intégration dans ChatAgentService

Pour intégrer complètement le QueueManager dans `ChatAgentService`, suivre ces étapes :

### Étape 1 : Importer QueueManager

```typescript
import { queueManager } from './core/QueueManager';
import { checkNetworkConnectivity } from '../../services/network/networkService';
import { APIError } from '../../services/api/apiClient';
```

### Étape 2 : Initialiser le QueueManager

Dans `initializeContext()` :

```typescript
async initializeContext(context: AgentContext): Promise<void> {
  this.context = context;
  await this.actionExecutor.initialize(context);
  await this.dataValidator.initialize(context);
  
  // Initialiser le QueueManager
  await queueManager.initialize();
  
  // Tenter de traiter les actions en attente si connexion disponible
  const networkState = await checkNetworkConnectivity();
  if (networkState.isConnected && queueManager.getQueueSize() > 0) {
    await queueManager.processQueue((action, ctx) => 
      this.actionExecutor.execute(action, ctx)
    );
  }
  
  // ... reste du code
}
```

### Étape 3 : Gérer les erreurs réseau dans `_handleActionExecution()`

Modifier la méthode qui exécute les actions pour gérer les erreurs réseau :

```typescript
private async _handleActionExecution(
  action: AgentAction,
  confidence: number,
  userMessage: string
): Promise<{ message: string; actionResult?: AgentActionResult }> {
  if (!this.context) {
    throw new Error('Contexte non initialisé');
  }

  try {
    // Exécuter l'action
    const actionResult = await this.actionExecutor.execute(action, this.context);
    
    // ... reste du code
    return { message: responseMessage, actionResult };
  } catch (error) {
    // Vérifier si c'est une erreur réseau/API
    const isNetworkError = error instanceof APIError && 
      (error.status === 0 || // Erreur réseau
       error.status >= 500 || // Erreur serveur
       error.status === 408 || // Timeout
       error.status === 429); // Rate limit

    if (isNetworkError) {
      // Vérifier la connectivité
      const networkState = await checkNetworkConnectivity();
      
      if (!networkState.isConnected) {
        // Pas de réseau : ajouter à la queue
        await queueManager.enqueue(action, this.context, error.message);
        
        return {
          message: "Pas de réseau, je garde ça en mémoire et j'envoie dès que possible, mon frère."
        };
      } else {
        // Réseau disponible mais erreur API : retry via queue
        await queueManager.enqueue(action, this.context, error.message);
        
        // Tenter de traiter immédiatement
        const result = await queueManager.processQueue((act, ctx) =>
          this.actionExecutor.execute(act, ctx)
        );
        
        if (result.succeeded > 0) {
          return {
            message: `Action enregistrée après ${result.succeeded} tentative(s) réussie(s).`
          };
        } else {
          return {
            message: "Problème de connexion temporaire. L'action est en file d'attente et sera traitée dès que possible."
          };
        }
      }
    }
    
    // Autre type d'erreur : propager
    throw error;
  }
}
```

### Étape 4 : Ajouter un listener pour la reconnexion (optionnel)

Dans le constructeur ou une méthode d'initialisation :

```typescript
// Écouter les changements de connexion (si disponible via un événement ou polling)
// Exemple avec polling toutes les 30 secondes si pas de connexion
private startNetworkMonitoring(): void {
  setInterval(async () => {
    const networkState = await checkNetworkConnectivity();
    if (networkState.isConnected && queueManager.getQueueSize() > 0) {
      console.log('[ChatAgentService] Connexion rétablie, traitement de la queue...');
      await queueManager.processQueue((action, ctx) =>
        this.actionExecutor.execute(action, ctx)
      );
    }
  }, 30000); // Vérifier toutes les 30 secondes
}
```

### Étape 5 : Exposer la taille de la queue (pour UI)

Ajouter une méthode pour récupérer l'état de la queue :

```typescript
getQueueStatus(): { size: number; items: QueuedAction[] } {
  return {
    size: queueManager.getQueueSize(),
    items: queueManager.getQueue(),
  };
}
```

## 🎯 Messages Utilisateur

### Quand une action est mise en queue :
- **Pas de réseau** : "Pas de réseau, je garde ça en mémoire et j'envoie dès que possible, mon frère."
- **Erreur serveur/timeout** : "Problème de connexion temporaire. L'action est en file d'attente et sera traitée dès que possible."

### Quand la queue est traitée :
- **Succès** : "✅ {n} action(s) en attente ont été traitées avec succès."
- **Échec partiel** : "⚠️ {n} action(s) traitées, {m} en attente (réessai en cours)."

## 📊 Tests à Effectuer

1. **Mode offline** : Désactiver le réseau, envoyer une action, vérifier qu'elle est en queue
2. **Reconnexion** : Réactiver le réseau, vérifier que la queue se vide automatiquement
3. **Erreur serveur** : Simuler une erreur 500, vérifier que l'action est en queue
4. **Rate limiting** : Simuler un 429, vérifier le délai augmenté avant retry
5. **Limite de queue** : Ajouter 100+ actions, vérifier que les plus anciennes sont supprimées

## 🔄 État Actuel

- ✅ QueueManager créé et testé unitairement
- ✅ Retry handler amélioré (429, backoff exponentiel)
- ⏳ Intégration dans ChatAgentService (à compléter selon les étapes ci-dessus)

