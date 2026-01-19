# Analyse : Gemini ne garde pas l'historique des conversations

## Problème signalé
Gemini ne conserve pas l'historique des conversations. L'assistant redemande des informations déjà fournies et ne se souvient pas des messages précédents.

## Diagnostic effectué

### Architecture actuelle

1. **Frontend (`useChatAgent.ts`)** :
   - Charge l'historique depuis le backend via `loadConversationHistory()`
   - Stocke l'historique dans `conversationHistoryRef.current` (format `ConversationHistoryEntry[]`)
   - Met à jour `conversationHistoryRef` avec `pushHistory()` après chaque message

2. **ChatAgentService (`ChatAgentService.ts`)** :
   - Charge l'historique via `loadHistory()` lors de l'initialisation
   - Stocke l'historique dans `this.conversationHistory` (format `ChatMessage[]`)
   - Utilise `this.conversationHistory.slice(-10)` pour construire le contexte Gemini (ligne 223)

3. **Backend (`chat-agent.service.ts`)** :
   - Reçoit `history` dans la requête `ChatAgentFunctionRequest`
   - Construit `conversation` avec `[...sanitizedHistory]` (ligne 1489)
   - Envoie toute la conversation à Gemini via `callGemini()` (ligne 1502)

### Problèmes identifiés

#### ❌ **PROBLÈME 1 : Double gestion de l'historique (désynchronisation)**

**Symptôme :**
- `useChatAgent` utilise `conversationHistoryRef` 
- `ChatAgentService` utilise `this.conversationHistory`
- **Désynchronisation** : Les deux ne sont pas synchronisés en temps réel

**Code concerné :**
```typescript
// useChatAgent.ts - ligne 140-151
const pushHistory = useCallback((role: 'user' | 'model', text: string) => {
  conversationHistoryRef.current = [
    ...conversationHistoryRef.current,
    { role, parts: [{ text }] },
  ];
}, []);

// ChatAgentService.ts - ligne 223
const conversationContext = this.conversationHistory.slice(-10).map((msg) => ({
  role: msg.role === 'user' ? 'user' : 'model',
  content: msg.content,
}));
```

**Impact :**
- L'historique mis à jour dans `conversationHistoryRef` n'est **pas** utilisé par `ChatAgentService`
- `ChatAgentService.sendMessage()` utilise `this.conversationHistory` qui peut être obsolète

#### ❌ **PROBLÈME 2 : Historique limité à 10 messages**

**Symptôme :**
- `ChatAgentService.sendMessage()` utilise `.slice(-10)` (ligne 223)
- Seulement les 10 derniers messages sont envoyés à Gemini
- L'historique complet (potentiellement 100+ messages) est ignoré

**Code concerné :**
```typescript
// ChatAgentService.ts - ligne 223
const conversationContext = this.conversationHistory.slice(-10).map(...);
```

**Impact :**
- Si la conversation dépasse 10 messages, les premiers sont oubliés
- Gemini ne peut pas faire référence à des informations mentionnées plus tôt

#### ❌ **PROBLÈME 3 : Historique non envoyé correctement au backend**

**Symptôme :**
- `ChatAgentService.callBackendGemini()` construit `conversationContext` depuis `this.conversationHistory`
- Mais `this.conversationHistory` peut ne pas être synchronisé avec `conversationHistoryRef`
- L'historique envoyé peut être incomplet ou obsolète

**Code concerné :**
```typescript
// ChatAgentService.ts - ligne 229-232
const geminiResponse = await this.callBackendGemini(
  userMessage,
  systemPrompt,
  conversationContext  // ← Construit depuis this.conversationHistory.slice(-10)
);
```

**Impact :**
- Gemini reçoit un historique incomplet ou incorrect
- Le contexte conversationnel est perdu

---

## Solutions proposées

### ✅ **Solution 1 : Utiliser conversationHistoryRef directement (RECOMMANDÉE)**

**Objectif :** Utiliser directement `conversationHistoryRef` depuis le hook, sans passer par `ChatAgentService.conversationHistory`.

**Avantages :**
- Source unique de vérité
- Pas de désynchronisation
- Historique complet disponible

**Implémentation :**
1. Modifier `ChatAgentService.sendMessage()` pour accepter l'historique en paramètre
2. Passer `conversationHistoryRef.current` depuis `useChatAgent.sendMessage()`
3. Utiliser cet historique directement dans `callBackendGemini()`

**Code proposé :**
```typescript
// ChatAgentService.ts
async sendMessage(message: string, conversationHistory?: ConversationHistoryEntry[]): Promise<ChatMessage> {
  // ... code existant ...
  
  // Utiliser l'historique passé en paramètre ou fallback sur this.conversationHistory
  const historyToUse = conversationHistory || this.conversationHistory.slice(-10).map(...);
  
  const geminiResponse = await this.callBackendGemini(
    userMessage,
    systemPrompt,
    historyToUse
  );
  
  // ... reste du code ...
}

// useChatAgent.ts
const assistantMessage = await chatAgentServiceRef.current.sendMessage(
  trimmedContent,
  conversationHistoryRef.current  // ← Passer l'historique directement
);
```

### ✅ **Solution 2 : Augmenter la limite de l'historique**

**Objectif :** Envoyer plus que 10 messages à Gemini pour conserver un contexte plus large.

**Avantages :**
- Simple à implémenter
- Conserve plus de contexte
- Compatible avec les limites de Gemini (typiquement 30-50 messages)

**Implémentation :**
```typescript
// ChatAgentService.ts - ligne 223
// Au lieu de .slice(-10), utiliser .slice(-30) ou -50
const conversationContext = this.conversationHistory.slice(-30).map((msg) => ({
  role: msg.role === 'user' ? 'user' : 'model',
  content: msg.content,
}));
```

**Limite Gemini :**
- Gemini 2.0-flash supporte jusqu'à ~30K tokens de contexte
- Un message moyen = ~100-200 tokens
- Limite pratique : **~50-100 messages** selon leur longueur

### ✅ **Solution 3 : Cache mémoire avec AsyncStorage (OPTIONNEL)**

**Objectif :** Sauvegarder l'historique localement pour éviter de le perdre entre les sessions.

**Avantages :**
- Persistance même après fermeture de l'app
- Réduction des appels API pour charger l'historique
- Meilleure expérience utilisateur

**Implémentation :**
```typescript
// ConversationStorage.ts - ajouter sauvegarde locale
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_CACHE_KEY = '@kouakou_conversation_history_';

export async function saveConversationHistoryToCache(
  projetId: string,
  conversationId: string,
  history: ConversationHistoryEntry[]
): Promise<void> {
  const key = `${HISTORY_CACHE_KEY}${projetId}_${conversationId}`;
  await AsyncStorage.setItem(key, JSON.stringify(history));
}

export async function loadConversationHistoryFromCache(
  projetId: string,
  conversationId: string
): Promise<ConversationHistoryEntry[] | null> {
  const key = `${HISTORY_CACHE_KEY}${projetId}_${conversationId}`;
  const cached = await AsyncStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
}
```

---

## Solution recommandée : Combinaison Solution 1 + Solution 2

### Étape 1 : Utiliser conversationHistoryRef directement

Modifier `ChatAgentService.sendMessage()` pour accepter l'historique en paramètre :

```typescript
async sendMessage(
  message: string,
  externalHistory?: Array<{ role: string; content: string }>
): Promise<ChatMessage> {
  // ... code existant jusqu'à ligne 222 ...
  
  // Utiliser l'historique externe si fourni, sinon fallback sur this.conversationHistory
  let conversationContext: Array<{ role: string; content: string }>;
  
  if (externalHistory && externalHistory.length > 0) {
    // Utiliser l'historique externe (depuis useChatAgent)
    conversationContext = externalHistory.map((entry) => ({
      role: entry.role === 'user' ? 'user' : 'model',
      content: typeof entry === 'string' ? entry : entry.content || '',
    }));
  } else {
    // Fallback sur l'historique interne (limité à 30 messages)
    conversationContext = this.conversationHistory.slice(-30).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.content,
    }));
  }
  
  // Ajouter le message utilisateur actuel à l'historique
  conversationContext.push({
    role: 'user',
    content: userMessage,
  });
  
  // ... reste du code (appel Gemini) ...
}
```

### Étape 2 : Passer l'historique depuis useChatAgent

```typescript
// useChatAgent.ts - ligne 372
const assistantMessage = await chatAgentServiceRef.current.sendMessage(
  trimmedContent,
  conversationHistoryRef.current.map(entry => ({
    role: entry.role,
    content: entry.parts[0]?.text || '',
  }))
);
```

### Étape 3 : Augmenter la limite de messages

Modifier `.slice(-10)` en `.slice(-30)` ou `.slice(-50)` selon les besoins.

---

## Tests à effectuer

1. ✅ **Test historique simple** :
   - Envoyer "Je m'appelle Jean"
   - Envoyer "Quel est mon nom ?"
   - **Attendu** : Gemini répond "Jean" sans redemander

2. ✅ **Test historique long** :
   - Envoyer 20+ messages
   - Demander des informations des premiers messages
   - **Attendu** : Gemini se souvient des premiers messages

3. ✅ **Test persistance** :
   - Fermer et rouvrir l'app
   - Vérifier que l'historique est conservé
   - **Attendu** : Les messages précédents sont toujours présents

4. ✅ **Test synchronisation** :
   - Vérifier que `conversationHistoryRef` et `ChatAgentService.conversationHistory` sont synchronisés
   - **Attendu** : Aucune désynchronisation

---

## Résumé

| Problème | Cause | Solution | Impact |
|----------|-------|----------|--------|
| Désynchronisation | Double gestion `conversationHistoryRef` vs `this.conversationHistory` | Passer l'historique en paramètre | ✅ Historique unifié |
| Limite 10 messages | `.slice(-10)` trop restrictif | Augmenter à `.slice(-30)` ou `.slice(-50)` | ✅ Plus de contexte |
| Historique obsolète | `ChatAgentService` n'utilise pas `conversationHistoryRef` | Utiliser l'historique externe | ✅ Historique à jour |

**Résultat attendu :** Gemini devrait maintenant conserver l'historique des conversations correctement. 🎯
