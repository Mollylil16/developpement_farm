# Explication des Deux Endpoints Kouakou

## Problème Identifié

Il existe **deux endpoints différents** pour Kouakou, ce qui crée de la confusion :

### 1. Endpoint `/api/kouakou/chat` (KouakouController)

**Fichiers :**
- `backend/src/kouakou/kouakou.controller.ts`
- `backend/src/kouakou/kouakou.service.ts`
- `backend/src/gemini/gemini.service.ts`

**Flux :**
```
Frontend → POST /api/kouakou/chat
  → KouakouController.chat()
  → KouakouService.processMessage()
  → GeminiService.chat() [SDK Google Generative AI]
  → Google Gemini API
```

**Caractéristiques :**
- ✅ Utilise le **SDK officiel** `@google/generative-ai`
- ✅ Simple et direct
- ✅ Gestion d'erreur basique
- ❌ Pas de fonction calling (tools)
- ❌ Pas de streaming
- ❌ Pas de validation stricte de `projectId`

**Utilisation actuelle :**
- ❌ **NON UTILISÉ** par le frontend actuellement
- Le frontend appelle `/kouakou/chat` (sans `/api/`)

---

### 2. Endpoint `/kouakou/chat` (ChatAgentController)

**Fichiers :**
- `backend/src/chat-agent/chat-agent.controller.ts`
- `backend/src/chat-agent/chat-agent.service.ts`

**Flux :**
```
Frontend → POST /kouakou/chat
  → ChatAgentController.chat()
  → ChatAgentService.handleFunctionCallingMessage()
  → Appel direct à l'API REST Gemini
  → Google Gemini API
```

**Caractéristiques :**
- ✅ **Appel direct** à l'API REST Gemini (`https://generativelanguage.googleapis.com/...`)
- ✅ Support **Function Calling** (tools) - permet d'exécuter des actions métier
- ✅ Support **Streaming** (`/kouakou/chat/stream`)
- ✅ Validation stricte de `projectId` (requis)
- ✅ Gestion avancée des erreurs
- ✅ Rate limiting (KouakouRateLimitGuard)
- ❌ Plus complexe
- ❌ Nécessite `projectId` dans le body

**Utilisation actuelle :**
- ✅ **UTILISÉ** par le frontend dans `ChatAgentService.callBackendGemini()`
- Le frontend appelle `/kouakou/chat` (ligne 814 de `ChatAgentService.ts`)

---

## Problème Actuel

### Incohérence dans le Log

Le frontend appelle `/kouakou/chat` mais le log dit :
```typescript
logger.debug(`[Gemini] Appel backend /api/kouakou/chat avec message: ...`);
```

**Correction nécessaire :** Le log doit dire `/kouakou/chat` et non `/api/kouakou/chat`.

### Erreur 400 "projectId est requis"

Le frontend envoie maintenant `projectId` et `projetId` dans le body, ce qui devrait résoudre l'erreur.

---

## Recommandation

### Option 1 : Unifier les Endpoints (Recommandé)

**Supprimer** `/api/kouakou/chat` et **garder uniquement** `/kouakou/chat` car :
- Il est déjà utilisé par le frontend
- Il supporte function calling (essentiel pour Kouakou)
- Il a une meilleure gestion d'erreur
- Il supporte le streaming

**Actions :**
1. Supprimer `backend/src/kouakou/` (controller + service)
2. Corriger le log dans `ChatAgentService.ts` pour dire `/kouakou/chat`
3. S'assurer que tous les appels utilisent `/kouakou/chat`

### Option 2 : Garder les Deux Endpoints

Si on veut garder les deux :
- `/api/kouakou/chat` → Simple, sans function calling (pour tests)
- `/kouakou/chat` → Complet, avec function calling (pour production)

**Actions :**
1. Documenter clairement la différence
2. Corriger le log pour refléter l'endpoint réellement appelé
3. S'assurer que le frontend utilise le bon endpoint

---

## Résumé

| Critère | `/api/kouakou/chat` | `/kouakou/chat` |
|---------|---------------------|-----------------|
| **Utilisé par frontend** | ❌ Non | ✅ Oui |
| **Appel Gemini** | SDK (`@google/generative-ai`) | API REST directe |
| **Function Calling** | ❌ Non | ✅ Oui |
| **Streaming** | ❌ Non | ✅ Oui |
| **Validation projectId** | ⚠️ Basique | ✅ Stricte |
| **Rate Limiting** | ❌ Non | ✅ Oui |
| **Complexité** | Simple | Avancée |

**Conclusion :** Le frontend utilise `/kouakou/chat` qui fait appel à l'API Gemini via des appels REST directs avec support de function calling.
