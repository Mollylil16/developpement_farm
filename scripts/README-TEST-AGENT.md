# Test de l'Agent Conversationnel depuis le Shell

## Utilisation

Exécutez simplement :

```bash
npm run test:agent
```

ou

```bash
npx ts-node scripts/test-agent-shell.ts
```

## Ce que fait le script

1. **Initialise l'agent** avec votre clé OpenAI
2. **Exécute des tests réels** sur l'agent avec différents types de messages :
   - Détection d'intention
   - Extraction de paramètres
   - Robustesse aux variations
   - Cas limites
3. **Collecte les métriques** de performance en temps réel
4. **Génère automatiquement** un rapport HTML dans `reports/rapport-validation-YYYY-MM-DD.html`

## Convertir le HTML en PDF

1. Ouvrez le fichier HTML dans votre navigateur
2. Utilisez **Ctrl+P** (ou **Cmd+P** sur Mac)
3. Choisissez **"Enregistrer en PDF"**
4. Le PDF est prêt à être partagé avec votre collaborateur !

## Résultats

Le script affiche :
- ✅ Résumé des tests (total, réussis, échoués)
- 📊 Taux de succès global
- ⏱️ Temps moyen d'exécution
- 📄 Chemin du fichier HTML généré

Le rapport HTML contient :
- Statut global (EXCELLENT / BON / À MONITORER)
- Métriques détaillées
- Preuves concrètes de performance
- Identification des problèmes éventuels
- Architecture technique

## Note

Ce script teste l'agent **réellement** avec OpenAI. Assurez-vous d'avoir :
- Une connexion Internet
- Une clé OpenAI valide dans `src/config/openaiConfig.ts`
- Les dépendances installées (`npm install`)

