# Amélioration du prompt Gemini pour profils Vétérinaire et Technicien

## Objectif

Rendre Kouakou plus pointu sur la **nutrition** et le **suivi sanitaire** pour les profils vétérinaire et technicien.

## Modifications apportées

### 1. Ajout de `activeRole` au contexte

**Frontend :**
- `src/types/chatAgent.ts` : Ajout de `activeRole?: 'producer' | 'buyer' | 'veterinarian' | 'technician'` dans `AgentContext`
- `src/hooks/useChatAgent.ts` : 
  - Import de `useRole` pour récupérer `activeRole`
  - Ajout de `activeRole` au contexte `AgentContext`
- `src/services/chatAgent/ChatAgentService.ts` : Envoi de `activeRole` au backend dans la requête

**Backend :**
- `backend/src/chat-agent/chat-agent.controller.ts` : Accepte `activeRole` dans le body de la requête
- `backend/src/chat-agent/chat-agent.service.ts` :
  - Interface `ChatAgentFunctionRequest` : Ajout de `activeRole?`
  - `handleFunctionCallingMessage` et `streamResponse` : Acceptent `activeRole` dans l'objet `user`
  - `buildSystemPrompt` : Accepte `activeRole` en paramètre
  - `buildSystemInstruction` : Accepte `activeRole` et génère des sections spécialisées

### 2. Sections spécialisées dans le prompt

#### Mode Vétérinaire 🩺

**Expertise Nutrition (Priorité haute) :**
- Calculs précis de besoins énergétiques, protéiques, minéraux selon stade
- Composition alimentaire optimale (proportions d'ingrédients)
- Détection et correction des déficiences nutritionnelles
- Alimentation selon stade physiologique (gestation, allaitement, sevrage)
- Optimisation ration/coût sans compromettre la santé
- Utilisation optimale des ressources locales

**Expertise Suivi Sanitaire (Priorité haute) :**
- Programmes de vaccination (calendriers, rappels, compatibilités)
- Diagnostics différentiels (symptômes → maladies → tests)
- Traitements thérapeutiques (posologies, durées, interactions)
- Prophylaxie (hygiène, biosécurité, quarantaine)
- Surveillance épidémiologique (détection précoce, isolement)
- Bilan sanitaire (analyse mortalités, causes, tendances)
- Santé reproductive (fertilité, avortements, métrites, mammites)
- Parasitologie (détection et traitement)

**Conseils Vétérinaires :**
- Recommander consultation en cas de doute
- Prioriser la prévention
- Expliquer les mécanismes pathologiques
- Proposer des alternatives thérapeutiques
- Insister sur le suivi post-traitement

**Actions Prioritaires :**
1. Nutrition : `propose_composition_alimentaire`, `calculate_consommation_moyenne`
2. Santé : `create_vaccination`, `create_traitement`, `create_maladie`, `get_mortalites`, `analyze_causes_mortalite`
3. Suivi : `get_cheptel_details`, `get_gestations`, `get_porcelets`

#### Mode Technicien 🔧

**Expertise Nutrition Pratique (Priorité haute) :**
- Préparation des rations (quantités précises, mélanges, distribution)
- Suivi de consommation (mesure quotidienne, détection d'anomalies)
- Gestion des stocks (rotation, conservation, détection contamination)
- Adaptation selon performance (ajustement selon croissance)
- Alimentation des porcelets (sevrage progressif, compléments)
- Optimisation coûts (substitution sans perte de qualité)
- Utilisation d'ingrédients locaux

**Expertise Suivi Sanitaire Pratique (Priorité haute) :**
- Observation quotidienne (détection précoce de signes anormaux)
- Application des traitements (respect posologies, voies d'administration)
- Suivi des vaccinations (calendrier, technique, conservation)
- Hygiène et biosécurité (nettoyage, désinfection, quarantaine)
- Enregistrement sanitaire (traçabilité)
- Alerte précoce (signalement immédiat au vétérinaire)
- Soins aux porcelets (détection problèmes)

**Conseils Techniques :**
- Prioriser observation et action préventive
- Documenter systématiquement
- Communiquer clairement avec le vétérinaire
- Respecter strictement les protocoles

**Actions Prioritaires :**
1. Nutrition : `propose_composition_alimentaire`, `calculate_consommation_moyenne`, `get_stock_status`
2. Santé : `create_vaccination`, `create_traitement`, `create_maladie`, `update_weighing`, `update_vaccination`
3. Suivi : `get_cheptel_details`, `get_gestations`, `get_porcelets`, `get_mortalites`

## Résultat attendu

Pour les profils **vétérinaire** et **technicien**, Kouakou sera maintenant :
- ✅ Plus pointu sur la nutrition (calculs précis, rations équilibrées, déficiences)
- ✅ Plus pointu sur le suivi sanitaire (diagnostics, traitements, prophylaxie)
- ✅ Plus orienté vers les actions prioritaires (nutrition et santé)
- ✅ Plus adapté au contexte professionnel (conseils vétérinaires vs conseils techniques)

## Tests à effectuer

1. **Vétérinaire** :
   - Demander une composition alimentaire pour truie gestante
   - Demander un diagnostic différentiel pour symptômes
   - Demander un programme de vaccination
   - Vérifier que les conseils sont orientés vétérinaire

2. **Technicien** :
   - Demander comment préparer une ration
   - Demander comment détecter des signes anormaux
   - Demander comment appliquer un traitement
   - Vérifier que les conseils sont orientés pratique technique

## Fichiers modifiés

- `src/types/chatAgent.ts`
- `src/hooks/useChatAgent.ts`
- `src/services/chatAgent/ChatAgentService.ts`
- `backend/src/chat-agent/chat-agent.controller.ts`
- `backend/src/chat-agent/chat-agent.service.ts`
