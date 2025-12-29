# Plan d'Amélioration - Détection d'Intention Kouakou

**Date :** 27 décembre 2025  
**Objectif :** Booster la détection d'intention avec 5 améliorations majeures

---

## 📋 Améliorations à Implémenter

### 1. ✅ Ajouter 500 exemples RAG pour intentions locales (ivoirien, élevage porcin)
- **Fichier :** `src/services/chatAgent/core/INTENT_KNOWLEDGE_BASE_LOCAL.ts`
- **Contenu :** 500 exemples spécifiques au contexte ivoirien et élevage porcin
- **Intégration :** Fusionner avec `INTENT_KNOWLEDGE_BASE_COMPLETE`

### 2. ✅ Étendre FastPath pour multi-intentions
- **Fichier :** `src/services/chatAgent/core/FastPathDetector.ts`
- **Fonctionnalité :** Détecter plusieurs intentions dans un même message
- **Exemple :** "j'ai vendu 5 porcs à 800000 et pesé P001 à 45kg" → 2 intentions

### 3. ✅ Optimiser prompts OpenAI avec 10 few-shot par intent clé
- **Fichier :** `src/services/chatAgent/core/OpenAIIntentService.ts`
- **Fonctionnalité :** Ajouter 10 exemples few-shot pour chaque intent principal
- **Intents clés :** create_revenu, create_depense, create_pesee, get_statistics, etc.

### 4. ✅ Améliorer ConversationContext pour anaphora
- **Fichier :** `src/services/chatAgent/core/ConversationContext.ts`
- **Fonctionnalité :** Résolution d'anaphores ("il", "le même", "celui-là", etc.)
- **Exemple :** "j'ai vendu 5 porcs" puis "il fait 45kg" → comprendre "il" = le porc vendu

### 5. ✅ Ajouter metrics de précision dans tests et monitoring
- **Fichiers :** 
  - `src/services/chatAgent/monitoring/PerformanceMonitor.ts`
  - `src/services/chatAgent/tests/AgentValidationTest.ts`
- **Métriques :** Précision, Rappel, F1-score par intent

---

## 🎯 Résultats Attendus

- **Précision de détection :** ≥ 95% (actuellement ~85%)
- **Temps de réponse :** < 500ms pour FastPath
- **Couverture multi-intentions :** 100% des cas détectés
- **Résolution anaphora :** ≥ 90% des références résolues

---

## 📝 Structure des Fichiers

```
src/services/chatAgent/
├── core/
│   ├── INTENT_KNOWLEDGE_BASE_LOCAL.ts (NOUVEAU - 500 exemples)
│   ├── FastPathDetector.ts (MODIFIÉ - multi-intentions)
│   ├── OpenAIIntentService.ts (MODIFIÉ - few-shot prompts)
│   └── ConversationContext.ts (MODIFIÉ - anaphora)
├── monitoring/
│   └── PerformanceMonitor.ts (MODIFIÉ - metrics précision)
└── tests/
    └── AgentValidationTest.ts (MODIFIÉ - tests précision)
```

---

## ✅ Checklist d'Implémentation

- [ ] 1. Créer INTENT_KNOWLEDGE_BASE_LOCAL.ts avec 500 exemples
- [ ] 2. Modifier IntentRAG.ts pour intégrer les nouveaux exemples
- [ ] 3. Étendre FastPathDetector pour multi-intentions
- [ ] 4. Optimiser OpenAIIntentService avec few-shot prompts
- [ ] 5. Améliorer ConversationContext pour anaphora
- [ ] 6. Ajouter metrics de précision dans PerformanceMonitor
- [ ] 7. Mettre à jour les tests avec metrics de précision
- [ ] 8. Créer tests unitaires pour chaque amélioration
- [ ] 9. Documenter les changements
- [ ] 10. Valider avec tests d'intégration

