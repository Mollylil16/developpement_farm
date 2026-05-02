# Test de GeminiConversationalAgent

## ⚠️ Limitations

Ce script de test ne peut pas être exécuté directement dans un environnement Node.js pur car :

1. `GeminiConversationalAgent` utilise `AgentActionExecutor`
2. `AgentActionExecutor` utilise `apiClient` 
3. `apiClient` utilise `AsyncStorage` de React Native
4. React Native ne peut pas être exécuté dans Node.js

## Comment tester l'agent

### Option 1 : Dans l'application React Native (Recommandé)

1. Démarrez l'application Expo :
   ```bash
   npm start
   ```

2. Ouvrez l'écran de chat (ChatAgentScreen)

3. Testez manuellement les scénarios suivants :
   - **Conversation simple** : "salut kouakou"
   - **Action complète** : "j'ai vendu un porc à Jean pour 50000 hier"
   - **Action incomplète** : "j'ai fait une vente" (vérifier la clarification)
   - **Question technique** : "comment prévenir la peste porcine ?"
   - **Multi-tour** : "liste mes animaux" puis "pèse le premier"

### Option 2 : Tests unitaires (à créer)

Créez des tests Jest qui mockent `apiClient` et `AsyncStorage` pour tester l'agent en isolation.

### Option 3 : Script simplifié (sans exécution d'actions)

Un script qui teste uniquement la génération de prompts et la structure des réponses sans exécuter les actions réelles.

## Scénarios de test

Le script `test-conversational-agent.ts` contient les scénarios de test suivants :

1. **Conversation simple** : Vérifie que l'agent répond naturellement
2. **Action complète** : Vérifie l'exécution avec tous les paramètres
3. **Action incomplète** : Vérifie la clarification naturelle
4. **Question technique** : Vérifie l'utilisation de `repondre_question_elevage`
5. **Multi-tour** : Vérifie le maintien du contexte conversationnel

## Comparaison Ancien vs Nouveau

- **Ancien système (ChatAgentService)** : Classification séparée, extraction séparée, clarification manuelle, réponses templates
- **Nouveau système (GeminiConversationalAgent)** : Function calling natif, extraction automatique, clarification naturelle, réponses conversationnelles

