# Agent Conversationnel Intelligent

## Vue d'ensemble

L'agent conversationnel est un assistant intelligent intégré à l'application pour aider les éleveurs de porcs dans la gestion complète de leur exploitation.

## Fonctionnalités

### 1. Gestion des Données Commerciales
- Enregistrement de ventes (acheteur, nombre de porcs, poids, prix)
- Génération de factures/reçus
- Suivi des créances clients
- Analyse des tendances de vente

### 2. Gestion des Dépenses
- Enregistrement de dépenses (alimentation, médicaments, infrastructure, etc.)
- Calculs automatiques (coût par porc, ratio alimentaire)
- Prévisions de trésorerie

### 3. Suivi Vétérinaire
- Enregistrement de visites vétérinaires
- Gestion des vaccinations avec rappels automatiques
- Suivi des traitements
- Enregistrement de maladies

### 4. Rappels Proactifs
- Vaccinations (rappel 3 jours avant)
- Traitements (rappel 1 jour avant la fin)
- Sevrage (rappel à 18 jours)
- Gestations (rappel à 7, 3 et 1 jour avant la mise bas)

### 5. Assistance Intelligente
- Réponses aux questions sur l'exploitation
- Analyses de données
- Suggestions personnalisées
- Alertes sanitaires et financières

## Architecture

```
src/services/chatAgent/
├── ChatAgentService.ts          # Service principal
├── AgentActionExecutor.ts       # Exécution des actions
├── ChatAgentAPI.ts              # Communication avec l'IA
├── VoiceService.ts               # Reconnaissance et synthèse vocale
├── ProactiveRemindersService.ts  # Rappels proactifs
└── index.ts                      # Exports
```

## Utilisation

### Dans un composant React

```typescript
import { useChatAgent } from '../hooks/useChatAgent';

function MyComponent() {
  const {
    messages,
    isLoading,
    sendMessage,
    toggleVoice,
  } = useChatAgent();

  return (
    <View>
      {/* Interface de chat */}
    </View>
  );
}
```

### Configuration

Pour utiliser une vraie API d'IA, configurez les variables d'environnement :

```typescript
const config: AgentConfig = {
  apiKey: 'your-api-key',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  language: 'fr-CI',
  enableVoice: true,
};
```

## Langue et Ton

L'agent parle en **français ivoirien** avec :
- Expressions locales naturelles
- Ton chaleureux et respectueux
- Unités locales (FCFA, sacs, kg)
- Jamais condescendant

## Sécurité

- Validation obligatoire pour les suppressions
- Confirmation pour les modifications importantes
- Disclaimer vétérinaire systématique
- Protection des données (RGPD)

## Évolutivité

### Phase 1 (Actuelle)
- Interactions texte et voix
- Gestion complète des données
- Rappels et analyses de base

### Phase 2 (Future)
- Analyse d'images
- Diagnostic visuel
- Analyses prédictives avancées
- Données météo et prix du marché en temps réel

