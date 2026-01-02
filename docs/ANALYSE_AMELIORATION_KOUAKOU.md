# Analyse et Amélioration de Kouakou

## 📋 Résumé Exécutif

Kouakou comprend mieux les instructions mais rencontre encore des difficultés à implémenter certaines tâches, notamment :
- **Création** de dépenses/revenus (fonctionne mais peut être amélioré)
- **Modification** de dépenses/revenus (partiellement fonctionnel)
- **Suppression** de dépenses/revenus (non implémenté)

## 🔍 Problèmes Identifiés

### 1. Actions de Suppression Manquantes

**Problème :** Aucune action `delete_revenu` ou `delete_depense` n'est définie dans le système.

**Impact :** Kouakou ne peut pas supprimer des revenus ou dépenses même si l'utilisateur le demande.

**Fichiers concernés :**
- `src/services/chatAgent/AgentActionExecutor.ts` - Pas de case pour `delete_revenu`/`delete_depense`
- `src/services/chatAgent/prompts/systemPrompt.ts` - Pas d'action définie dans `ACTIONS_SCHEMA`
- `src/services/chatAgent/actions/finance/RevenuActions.ts` - Pas de méthode `deleteRevenu`
- `src/services/chatAgent/actions/finance/DepenseActions.ts` - Pas de méthode `deleteDepense`

### 2. Base de Connaissances Limitée pour Modifications/Suppressions

**Problème :** La base de connaissances (`INTENT_KNOWLEDGE_BASE_LOCAL.ts`) contient beaucoup d'exemples pour `create_revenu` (80 exemples) mais :
- Seulement quelques exemples pour `update_revenu`
- Aucun exemple pour `delete_revenu` ou `delete_depense`
- Pas d'exemples pour identifier les éléments à modifier/supprimer ("la dernière vente", "celle d'hier", etc.)

**Impact :** Kouakou a du mal à :
- Détecter l'intention de modification/suppression
- Identifier quel élément modifier/supprimer
- Extraire les paramètres nécessaires (ID, références temporelles, etc.)

### 3. Extraction de Paramètres pour Modifications

**Problème :** L'extracteur de paramètres (`EnhancedParameterExtractor.ts`) ne gère pas bien :
- Les références implicites ("la dernière dépense", "celle de 50000", "la vente d'hier")
- L'identification d'ID depuis des descriptions
- Les modifications partielles ("change juste le montant")

**Impact :** Kouakou demande souvent des clarifications même quand l'utilisateur a fourni suffisamment d'informations.

### 4. Prompt Système Incomplet

**Problème :** Le prompt système (`systemPrompt.ts`) :
- Ne mentionne pas explicitement les actions `update_revenu`, `update_depense`, `delete_revenu`, `delete_depense`
- N'a pas d'exemples pour ces actions
- Ne guide pas sur comment identifier les éléments à modifier/supprimer

**Impact :** Le LLM ne comprend pas bien ces intentions et peut les confondre avec d'autres actions.

### 5. Validation des Actions de Modification

**Problème :** Le `DataValidator` ne valide pas spécifiquement les actions de modification/suppression :
- Pas de validation pour vérifier que l'ID existe
- Pas de validation pour les modifications partielles
- Pas de gestion des erreurs spécifiques (élément introuvable, etc.)

## 💡 Recommandations d'Amélioration

### 1. Ajouter les Actions de Suppression

#### 1.1. Ajouter dans `systemPrompt.ts`

```typescript
// Dans ACTIONS_SCHEMA
delete_revenu: {
  description: 'Supprimer un revenu (vente)',
  params: {
    id: 'string (obligatoire: ID du revenu)',
    revenu_id: 'string (synonyme de id)',
    // Ou identification par description
    description: 'string (optionnel: "la dernière vente", "celle d\'hier", etc.)',
    date: 'string (optionnel: pour identifier une vente par date)',
  },
  keywords: ['supprimer vente', 'effacer revenu', 'retirer vente', 'annuler vente', 'enlever vente'],
  requiresConfirmation: true, // Toujours demander confirmation pour suppression
},
delete_depense: {
  description: 'Supprimer une dépense',
  params: {
    id: 'string (obligatoire: ID de la dépense)',
    depense_id: 'string (synonyme de id)',
    // Ou identification par description
    description: 'string (optionnel: "la dernière dépense", "celle de 50000", etc.)',
    date: 'string (optionnel: pour identifier une dépense par date)',
  },
  keywords: ['supprimer dépense', 'effacer dépense', 'retirer dépense', 'annuler dépense', 'enlever dépense'],
  requiresConfirmation: true,
},
```

#### 1.2. Ajouter dans `AgentActionExecutor.ts`

```typescript
case 'delete_revenu':
  return await RevenuActions.deleteRevenu(action.params, context);

case 'delete_depense':
  return await DepenseActions.deleteDepense(action.params, context);
```

#### 1.3. Implémenter dans `RevenuActions.ts`

```typescript
/**
 * Supprime un revenu (vente)
 */
static async deleteRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
  const paramsTyped = params as Record<string, unknown>;
  
  // Identifier le revenu à supprimer
  let revenuId = paramsTyped.id || paramsTyped.revenu_id;
  
  // Si pas d'ID direct, chercher par description/date
  if (!revenuId || typeof revenuId !== 'string') {
    revenuId = await this.findRevenuByDescription(paramsTyped, context);
  }
  
  if (!revenuId) {
    throw new Error('Impossible d\'identifier le revenu à supprimer. Peux-tu préciser l\'ID ou la description ?');
  }
  
  // Supprimer via l'API
  await apiClient.delete(`/finance/revenus/${revenuId}`);
  
  return {
    success: true,
    message: '✅ Revenu supprimé avec succès !',
  };
}

/**
 * Trouve un revenu par description/date
 */
private static async findRevenuByDescription(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<string | null> {
  // Récupérer les revenus récents
  const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
    params: { projet_id: context.projetId },
  });
  
  // Filtrer par date si fournie
  if (params.date && typeof params.date === 'string') {
    const revenusParDate = revenus.filter(r => r.date === params.date);
    if (revenusParDate.length === 1) {
      return revenusParDate[0].id;
    }
  }
  
  // Chercher "dernière", "première", etc.
  const description = params.description as string;
  if (description) {
    const normalized = description.toLowerCase();
    if (normalized.includes('dernier') || normalized.includes('dernière')) {
      // Trier par date décroissante
      const sorted = revenus.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return sorted[0]?.id || null;
    }
    if (normalized.includes('premier') || normalized.includes('première')) {
      const sorted = revenus.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      return sorted[0]?.id || null;
    }
  }
  
  return null;
}
```

### 2. Enrichir la Base de Connaissances

#### 2.1. Ajouter des Exemples dans `INTENT_KNOWLEDGE_BASE_LOCAL.ts`

```typescript
// ========== MODIFICATION REVENUS (update_revenu) - 30 exemples ==========
{ text: 'modifier la vente [ID]', action: 'update_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'changer le montant de la vente [ID] a [MONTANT]', action: 'update_revenu', params: { id: '[ID]', montant: '[MONTANT]' }, confidence: 0.98 },
{ text: 'corriger la vente [ID]', action: 'update_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'mettre a jour la vente [ID]', action: 'update_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'modifier la derniere vente', action: 'update_revenu', params: { description: 'dernière' }, confidence: 0.9 },
{ text: 'changer le montant de la vente d hier', action: 'update_revenu', params: { date: 'hier' }, confidence: 0.9 },
{ text: 'corriger la vente de [DATE]', action: 'update_revenu', params: { date: '[DATE]' }, confidence: 0.9 },
// ... 23 autres exemples

// ========== SUPPRESSION REVENUS (delete_revenu) - 30 exemples ==========
{ text: 'supprimer la vente [ID]', action: 'delete_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'effacer la vente [ID]', action: 'delete_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'retirer la vente [ID]', action: 'delete_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'annuler la vente [ID]', action: 'delete_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'enlever la vente [ID]', action: 'delete_revenu', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'supprimer la derniere vente', action: 'delete_revenu', params: { description: 'dernière' }, confidence: 0.9 },
{ text: 'effacer la vente d hier', action: 'delete_revenu', params: { date: 'hier' }, confidence: 0.9 },
{ text: 'retirer la vente de [DATE]', action: 'delete_revenu', params: { date: '[DATE]' }, confidence: 0.9 },
// ... 22 autres exemples

// ========== MODIFICATION DEPENSES (update_depense) - 30 exemples ==========
{ text: 'modifier la depense [ID]', action: 'update_depense', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'changer le montant de la depense [ID] a [MONTANT]', action: 'update_depense', params: { id: '[ID]', montant: '[MONTANT]' }, confidence: 0.98 },
// ... 28 autres exemples

// ========== SUPPRESSION DEPENSES (delete_depense) - 30 exemples ==========
{ text: 'supprimer la depense [ID]', action: 'delete_depense', params: { id: '[ID]' }, confidence: 0.95 },
{ text: 'effacer la depense [ID]', action: 'delete_depense', params: { id: '[ID]' }, confidence: 0.95 },
// ... 28 autres exemples
```

### 3. Améliorer l'Extraction de Paramètres

#### 3.1. Ajouter dans `EnhancedParameterExtractor.ts`

```typescript
/**
 * Améliore l'extraction pour les modifications de revenus/dépenses
 */
private enhanceUpdateParams(params: ExtractedParams, text: string, actionType: string): ExtractedParams {
  const normalized = text.toLowerCase();
  
  // Extraire l'ID si présent
  if (!params.id && !params.revenu_id && !params.depense_id) {
    // Patterns: "vente abc123", "revenu xyz", "dépense 456"
    const idPatterns = [
      /(?:vente|revenu|depense|dépense)\s+([a-z0-9_-]+)/i,
      /(?:id|identifiant)\s*[:=]?\s*([a-z0-9_-]+)/i,
    ];
    
    for (const pattern of idPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        if (actionType.includes('revenu')) {
          params.revenu_id = match[1].trim();
        } else if (actionType.includes('depense')) {
          params.depense_id = match[1].trim();
        } else {
          params.id = match[1].trim();
        }
        break;
      }
    }
  }
  
  // Extraire les références temporelles
  if (!params.date && !params.description) {
    const timeRefs = {
      'dernier': 'dernière',
      'dernière': 'dernière',
      'premier': 'première',
      'première': 'première',
      'hier': 'hier',
      'aujourd\'hui': 'aujourd\'hui',
      'aujourd hui': 'aujourd\'hui',
    };
    
    for (const [key, value] of Object.entries(timeRefs)) {
      if (normalized.includes(key)) {
        params.description = value;
        break;
      }
    }
  }
  
  // Extraire les modifications partielles
  if (!params.montant && !params.date && !params.categorie) {
    // Patterns: "change juste le montant", "modifier seulement la date"
    if (normalized.includes('juste') || normalized.includes('seulement') || normalized.includes('uniquement')) {
      if (normalized.includes('montant') || normalized.includes('prix')) {
        // Extraire le nouveau montant
        const montant = MontantExtractor.extract(text);
        if (montant) {
          params.montant = montant;
        }
      }
      if (normalized.includes('date')) {
        const date = DateExtractor.extract(text);
        if (date) {
          params.date = date;
        }
      }
    }
  }
  
  return params;
}
```

### 4. Enrichir le Prompt Système

#### 4.1. Ajouter des Exemples Concrets

```typescript
// Dans EXAMPLES
{
  user: 'modifier la vente abc123, mettre le montant à 900 000',
  response: {
    action: 'update_revenu',
    params: {
      id: 'abc123',
      montant: 900000,
    },
    message: 'Je vais modifier la vente abc123 avec le nouveau montant de 900 000 FCFA.',
    confidence: 0.95,
  },
},
{
  user: 'supprimer la dernière dépense',
  response: {
    action: 'delete_depense',
    params: {
      description: 'dernière',
    },
    message: 'Je vais supprimer la dernière dépense. Tu confirmes ?',
    confidence: 0.9,
    requiresConfirmation: true,
  },
},
```

### 5. Améliorer la Base de Connaissances (TrainingKnowledgeBase)

#### 5.1. Ajouter des Sujets sur la Gestion des Finances

```typescript
{
  id: 'gestion_finances',
  title: 'Gestion des revenus et dépenses',
  keywords: ['modifier', 'supprimer', 'corriger', 'changer', 'mettre à jour', 'revenu', 'dépense', 'vente'],
  category: 'finance',
  content: `**Comment modifier ou supprimer des revenus/dépenses :**

📝 **Modifier un revenu/dépense :**
- Tu peux dire : "modifier la vente [ID]" ou "changer le montant de la dépense [ID]"
- Kouakou peut identifier par ID, date, ou description ("la dernière vente")
- Tu peux modifier : montant, date, catégorie, commentaire

🗑️ **Supprimer un revenu/dépense :**
- Tu peux dire : "supprimer la vente [ID]" ou "effacer la dépense d'hier"
- Kouakou demandera toujours confirmation avant de supprimer
- La suppression est irréversible

💡 **Astuces :**
- Si tu ne connais pas l'ID, utilise des références : "la dernière", "celle d'hier", "la vente de 500000"
- Tu peux modifier partiellement : "change juste le montant à 900000"
- Kouakou peut chercher par date : "modifier la vente du 15/01/2025"`
},
```

## 📊 Plan d'Implémentation

### Phase 1 : Actions de Suppression (Priorité Haute)
1. ✅ Ajouter `delete_revenu` et `delete_depense` dans `systemPrompt.ts`
2. ✅ Implémenter `deleteRevenu` dans `RevenuActions.ts`
3. ✅ Implémenter `deleteDepense` dans `DepenseActions.ts`
4. ✅ Ajouter les cases dans `AgentActionExecutor.ts`
5. ✅ Ajouter la validation dans `DataValidator.ts`

### Phase 2 : Enrichissement Base de Connaissances (Priorité Haute)
1. ✅ Ajouter 30 exemples pour `update_revenu` dans `INTENT_KNOWLEDGE_BASE_LOCAL.ts`
2. ✅ Ajouter 30 exemples pour `delete_revenu`
3. ✅ Ajouter 30 exemples pour `update_depense`
4. ✅ Ajouter 30 exemples pour `delete_depense`
5. ✅ Ajouter le sujet "gestion_finances" dans `TrainingKnowledgeBase.ts`

### Phase 3 : Amélioration Extraction (Priorité Moyenne)
1. ✅ Implémenter `enhanceUpdateParams` dans `EnhancedParameterExtractor.ts`
2. ✅ Ajouter la recherche par description/date dans `RevenuActions` et `DepenseActions`
3. ✅ Améliorer la gestion des références implicites

### Phase 4 : Amélioration Prompt (Priorité Moyenne)
1. ✅ Ajouter des exemples concrets dans `systemPrompt.ts`
2. ✅ Améliorer les instructions pour les modifications/suppressions
3. ✅ Ajouter des guides pour identifier les éléments

### Phase 5 : Tests et Validation (Priorité Basse)
1. ✅ Tester les nouvelles actions avec différents scénarios
2. ✅ Valider l'extraction de paramètres
3. ✅ Vérifier les messages de confirmation
4. ✅ Tester les cas d'erreur (ID introuvable, etc.)

## 🎯 Métriques de Succès

- **Taux de détection d'intention** : > 90% pour modifications/suppressions
- **Taux de succès d'exécution** : > 85% sans clarification
- **Temps de réponse** : < 2 secondes pour actions simples
- **Satisfaction utilisateur** : Réduction des demandes de clarification de 40%

## 📝 Notes Techniques

- Les actions de suppression nécessitent toujours une confirmation
- La recherche par description/date peut retourner plusieurs résultats → demander clarification
- Les modifications partielles doivent préserver les valeurs existantes
- Les erreurs doivent être claires et suggérer des solutions

