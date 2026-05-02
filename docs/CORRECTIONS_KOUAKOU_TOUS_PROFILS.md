# Corrections : Kouakou accessible pour tous les profils

## Problème identifié

Kouakou ne fonctionnait pas pour tous les profils car :
1. **Backend** : `projectId` était obligatoire
2. **Frontend** : `projetActif` était requis pour initialiser l'agent
3. **Profils concernés** :
   - ✅ **Producer** : Fonctionne (a un projet)
   - ❌ **Buyer** : Ne fonctionnait pas (pas de projet)
   - ⚠️ **Veterinarian** : Fonctionnait seulement si `projetActif` défini
   - ⚠️ **Technician** : Fonctionnait seulement si `projetActif` défini

## Corrections apportées

### 1. Backend - Controller (`chat-agent.controller.ts`)

**Avant :**
```typescript
const projectId = body.projectId || body.projetId || req.user?.projetId;
if (!projectId) {
  throw new BadRequestException('projectId est requis');
}
```

**Après :**
```typescript
// projectId est optionnel - certains profils (buyer, veterinarian, technician) peuvent ne pas avoir de projet
const projectId = body.projectId || body.projetId || req.user?.projetId || null;
```

### 2. Backend - Service (`chat-agent.service.ts`)

**Modifications :**
- Interface `ChatAgentFunctionRequest` : `projectId: string | null`
- Méthode `executeFunctionCall` : Accepte `projectId: string | null`
- Méthode `buildSystemInstruction` : Gère `projectId: string | null`
- Suppression de la vérification obligatoire de `projectId`

**Prompt système adapté :**
- Si `projectId` est présent : Affiche le contexte du projet
- Si `projectId` est null : Affiche un message indiquant qu'il s'agit d'un profil sans projet

### 3. Frontend - Hook (`useChatAgent.ts`)

**Modifications :**
- Initialisation : Fonctionne même sans `projetActif`
- `conversationId` : Généré avec `userId` si pas de `projetActif`
- Historique : Pas de chargement persistant si pas de projet (pour l'instant)
- `sendMessage` : Fonctionne sans `projetActif`
- `remindersService` : Initialisé seulement si `projetActif` existe

**Avant :**
```typescript
if (!projetActif || !user) {
  return;
}
```

**Après :**
```typescript
if (!user) {
  return;
}
// Générer un conversationId basé sur userId si pas de projetActif
const conversationKey = projetActif?.id || user.id;
```

### 4. Frontend - Service (`ChatAgentService.ts`)

**Modifications :**
- `callBackendGemini` : Accepte `projetId` null
- Envoie `projectId: null` au backend si pas de projet

**Avant :**
```typescript
if (!this.context?.projetId) {
  throw new Error('Contexte projetId manquant');
}
```

**Après :**
```typescript
// projetId peut être null pour les profils sans projet
if (!this.context?.userId) {
  throw new Error('Contexte userId manquant');
}
```

### 5. Types (`chatAgent.ts`)

**Modification :**
```typescript
export interface AgentContext {
  projetId: string | null; // Peut être null pour profils sans projet
  userId: string;
  // ...
}
```

### 6. Prompt système (`systemPrompt.ts`)

**Modification :**
```typescript
CONTEXTE ACTUEL:
- Projet: ${context.projetId || 'Aucun projet actif (profil sans projet)'}
- Date: ${context.currentDate}
- Utilisateur: ${context.userName || 'Utilisateur'}
${context.projetId ? '' : '\n⚠️ Note: Tu es en mode conversationnel général. Certaines fonctions nécessitant un projet ne sont pas disponibles.'}
```

## Fonctions affectées

Les fonctions suivantes nécessitent un `projectId` et ne fonctionneront pas pour les profils sans projet :
- `create_expense`, `create_revenue` (finance)
- `get_ventes`, `analyze_ventes` (ventes)
- `get_cheptel_details`, `search_lot` (production)
- `get_gestations`, `get_mortalites` (reproduction/santé)
- `marketplace_sell_animal` (marketplace)
- Et toutes les autres fonctions liées à un projet spécifique

**Note :** Ces fonctions vérifieront elles-mêmes si `projectId` est null et retourneront une erreur appropriée.

## Fonctions disponibles pour tous les profils

- `answer_knowledge_question` : Questions de formation/connaissances
- `describe_capabilities` : Description des capacités
- Recherche en ligne (si implémentée)
- Conversations générales

## Tests à effectuer

1. ✅ **Producer** : Vérifier que tout fonctionne comme avant
2. ✅ **Buyer** : Vérifier que Kouakou répond aux questions générales
3. ✅ **Veterinarian** : Vérifier avec et sans projet actif
4. ✅ **Technician** : Vérifier avec et sans projet actif

## Prochaines étapes (optionnel)

1. Implémenter un système d'historique persistant pour les profils sans projet (basé sur `userId`)
2. Adapter certaines fonctions pour fonctionner sans projet (ex: marketplace pour buyer)
3. Améliorer les messages d'erreur quand une fonction nécessite un projet
