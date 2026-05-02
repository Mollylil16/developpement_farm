# Analyse en profondeur du profil vétérinaire

## Objectif
Vérifier si le profil vétérinaire récupère correctement les informations sanitaires, rendez-vous et toutes autres données auxquelles il devrait avoir accès sur la base des permissions accordées par le producteur.

## Date d'analyse
2026-01-23

---

## 1. Architecture actuelle

### 1.1 Backend - Vérification des permissions

#### ✅ Points positifs
- **`SanteService.checkProjetOwnership()`** vérifie correctement les permissions :
  - Vérifie si l'utilisateur est propriétaire du projet
  - Sinon, vérifie s'il est collaborateur actif avec `permission_sante = true` OU `permission_gestion_complete = true`
  - Lève une `ForbiddenException` si les permissions ne sont pas accordées

```typescript
// backend/src/sante/sante.service.ts:69-104
private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
  // ✅ Vérifie propriétaire
  if (proprietaireId === normalizedUserId) {
    return;
  }
  
  // ✅ Vérifie collaborateur avec permission_sante ou permission_gestion_complete
  const collabResult = await this.databaseService.query(
    `SELECT id, permission_sante, permission_gestion_complete FROM collaborations 
     WHERE projet_id = $1 
     AND (user_id = $2 OR profile_id LIKE $3)
     AND statut = 'actif'`,
    [projetId, normalizedUserId, `%${normalizedUserId}%`]
  );
  
  if (collabResult.rows.length > 0) {
    const collab = collabResult.rows[0];
    if (collab.permission_sante === true || collab.permission_gestion_complete === true) {
      return;
    }
  }
  
  throw new ForbiddenException('Vous n\'avez pas accès à ce projet ou les permissions nécessaires');
}
```

- **Tous les endpoints sanitaires** appellent `checkProjetOwnership()` avant de retourner les données :
  - `/sante/visites-veterinaires`
  - `/sante/vaccinations`
  - `/sante/maladies`
  - `/sante/traitements`
  - etc.

#### ⚠️ Points d'attention
- Les endpoints retournent une erreur 403 si les permissions ne sont pas accordées
- Le frontend doit gérer ces erreurs correctement

---

### 1.2 Frontend - Hook `useVetData`

#### ❌ PROBLÈME PRINCIPAL IDENTIFIÉ

**Le hook `useVetData` ne filtre PAS les projets selon les permissions avant de faire les appels API.**

```typescript
// src/hooks/useVetData.ts:76-103
const activeCollaborations = allCollaborations.filter(
  (c) => c.user_id === vetUserId && c.role === 'veterinaire' && c.statut === 'actif'
);
const collaborationProjectIds = activeCollaborations.map((c) => c.projet_id);

// ❌ PROBLÈME: Ne vérifie pas permission_sante ou permission_gestion_complete
const accessibleProjectIds = new Set([
  ...vetClients.map((c) => c.farmId),
  ...collaborationProjectIds, // ❌ Inclut TOUS les projets collaboratifs, même sans permission_sante
]);

// ❌ PROBLÈME: Fait des appels API pour TOUS les projets, même ceux sans permission
for (const project of accessibleProjects) {
  const visites = await apiClient.get<any[]>(`/sante/visites-veterinaires`, {
    params: { projet_id: project.id },
  });
  // ❌ Cet appel échouera avec 403 si permission_sante = false
  allVisites.push(...visites);
}
```

#### Conséquences
1. **Appels API inutiles** : Le frontend fait des appels pour des projets où le vétérinaire n'a pas la permission `sante`
2. **Erreurs 403 non gérées** : Les appels échouent silencieusement ou affichent des erreurs
3. **Données manquantes** : Si un appel échoue, les données de ce projet ne sont pas chargées
4. **Performance dégradée** : Multiples appels API qui échouent ralentissent le chargement

---

### 1.3 Frontend - Dashboard vétérinaire

#### ✅ Points positifs
- Le dashboard utilise `useVetData` pour charger les données
- Affiche correctement les consultations du jour et à venir
- Affiche les clients (fermes) avec statistiques
- Affiche les alertes sanitaires

#### ⚠️ Points d'attention
- Le dashboard dépend entièrement de `useVetData` qui a le problème identifié ci-dessus
- Si `useVetData` ne charge pas correctement les données, le dashboard sera incomplet

---

### 1.4 Frontend - Autres écrans vétérinaires

#### ConsultationsScreen
- ✅ Utilise `useVetData` pour charger les consultations
- ❌ Hérite du même problème de permissions

#### MyClientsScreen
- ✅ Utilise `useVetData` pour charger les clients
- ❌ Hérite du même problème de permissions

---

## 2. Problèmes identifiés

### 2.1 Problème critique : Filtrage des permissions dans `useVetData`

**Fichier** : `src/hooks/useVetData.ts`

**Ligne** : 76-103

**Description** :
Le hook récupère toutes les collaborations actives du vétérinaire mais ne vérifie pas si la permission `sante` ou `permission_gestion_complete` est accordée avant de faire les appels API.

**Impact** :
- Appels API inutiles pour des projets sans permission
- Erreurs 403 non gérées
- Données manquantes ou incomplètes
- Performance dégradée

**Solution proposée** :
```typescript
// Filtrer les collaborations selon les permissions
const activeCollaborations = allCollaborations.filter(
  (c) => 
    c.user_id === vetUserId && 
    c.role === 'veterinaire' && 
    c.statut === 'actif' &&
    (c.permission_sante === true || c.permission_gestion_complete === true) // ✅ Ajouter cette vérification
);
```

---

### 2.2 Problème : Gestion des erreurs 403

**Fichier** : `src/hooks/useVetData.ts`

**Ligne** : 98-103

**Description** :
Les appels API qui échouent avec 403 ne sont pas gérés correctement. Le code continue avec un tableau vide au lieu de logger l'erreur ou de la gérer.

**Impact** :
- Erreurs silencieuses
- Données manquantes sans explication
- Difficulté à déboguer

**Solution proposée** :
```typescript
// Gérer les erreurs 403 correctement
for (const project of accessibleProjects) {
  try {
    const visites = await apiClient.get<any[]>(`/sante/visites-veterinaires`, {
      params: { projet_id: project.id },
    });
    allVisites.push(...visites);
  } catch (error: any) {
    if (error.status === 403) {
      // Permission refusée - logger mais continuer
      logger.warn(`[useVetData] Permission refusée pour projet ${project.id}`);
    } else {
      // Autre erreur - logger et continuer
      logger.error(`[useVetData] Erreur chargement visites pour projet ${project.id}:`, error);
    }
  }
}
```

---

### 2.3 Problème : Récupération des permissions depuis l'API

**Fichier** : `src/hooks/useVetData.ts`

**Ligne** : 67-75

**Description** :
Le hook récupère les collaborations depuis `/collaborations/invitations` mais cette réponse peut ne pas inclure les permissions détaillées (`permission_sante`, `permission_gestion_complete`).

**Impact** :
- Impossible de filtrer selon les permissions si elles ne sont pas dans la réponse
- Doit faire des appels supplémentaires pour obtenir les permissions

**Solution proposée** :
1. Vérifier que l'endpoint `/collaborations/invitations` retourne les permissions
2. Sinon, utiliser `/collaborations?projet_id=...` pour chaque projet pour obtenir les permissions
3. Ou créer un endpoint dédié `/collaborations/veterinarian/accessible-projects` qui retourne uniquement les projets avec permission_sante

---

### 2.4 Problème : Endpoint `/collaborations/invitations` peut ne pas retourner les permissions

**Fichier** : `src/hooks/useVetData.ts`

**Ligne** : 67-70

**Description** :
L'endpoint `/collaborations/invitations` peut ne pas retourner les colonnes de permissions (`permission_sante`, `permission_gestion_complete`).

**Vérification nécessaire** :
- Vérifier la réponse de l'endpoint backend
- S'assurer que les permissions sont incluses dans la réponse

---

## 3. Solutions proposées

### 3.1 Solution immédiate : Filtrer les collaborations selon les permissions

**Fichier** : `src/hooks/useVetData.ts`

**Modification** :
```typescript
// Filtrer les collaborations selon les permissions
const activeCollaborations = allCollaborations.filter(
  (c) => 
    c.user_id === vetUserId && 
    c.role === 'veterinaire' && 
    c.statut === 'actif' &&
    (c.permission_sante === true || c.permission_gestion_complete === true) // ✅ Ajouter
);
```

**Avantages** :
- Évite les appels API inutiles
- Améliore les performances
- Réduit les erreurs 403

**Inconvénients** :
- Nécessite que l'endpoint `/collaborations/invitations` retourne les permissions

---

### 3.2 Solution robuste : Vérifier les permissions avant chaque appel API

**Fichier** : `src/hooks/useVetData.ts`

**Modification** :
```typescript
// Pour chaque projet, vérifier les permissions avant de faire l'appel
for (const project of accessibleProjects) {
  // Vérifier si le vétérinaire a la permission pour ce projet
  const collaboration = activeCollaborations.find(c => c.projet_id === project.id);
  if (!collaboration || (!collaboration.permission_sante && !collaboration.permission_gestion_complete)) {
    // Pas de permission - ignorer ce projet
    continue;
  }
  
  try {
    const visites = await apiClient.get<any[]>(`/sante/visites-veterinaires`, {
      params: { projet_id: project.id },
    });
    allVisites.push(...visites);
  } catch (error: any) {
    // Gérer les erreurs
    logger.warn(`[useVetData] Erreur chargement visites pour projet ${project.id}:`, error);
  }
}
```

**Avantages** :
- Plus robuste
- Gère les cas où les permissions ne sont pas dans la réponse initiale
- Évite les appels API inutiles

---

### 3.3 Solution optimale : Endpoint backend dédié

**Backend** : Créer un nouvel endpoint `/collaborations/veterinarian/accessible-projects`

**Fonctionnalité** :
- Retourne uniquement les projets où le vétérinaire a `permission_sante = true` ou `permission_gestion_complete = true`
- Inclut les permissions dans la réponse
- Optimisé pour les vétérinaires

**Avantages** :
- Une seule requête au lieu de multiples
- Retourne directement les projets accessibles
- Plus performant

**Frontend** : Utiliser cet endpoint dans `useVetData`

```typescript
// Récupérer uniquement les projets accessibles avec permissions
const accessibleProjectsResponse = await apiClient.get<Array<{
  projet_id: string;
  projet_nom: string;
  permission_sante: boolean;
  permission_gestion_complete: boolean;
}>>('/collaborations/veterinarian/accessible-projects', {
  params: { userId: vetUserId },
});

const accessibleProjects = accessibleProjectsResponse.map(p => ({
  id: p.projet_id,
  nom: p.projet_nom,
}));
```

---

## 4. Vérifications supplémentaires nécessaires

### 4.1 Vérifier l'endpoint `/collaborations/invitations`

**Action** : Vérifier si l'endpoint retourne les colonnes `permission_sante` et `permission_gestion_complete`

**Fichier backend** : `backend/src/collaborations/collaborations.controller.ts`

**Test** : Faire un appel API et vérifier la réponse

---

### 4.2 Vérifier les autres écrans vétérinaires

**Écrans à vérifier** :
- `ConsultationsScreen` ✅ (utilise `useVetData`)
- `MyClientsScreen` ✅ (utilise `useVetData`)
- `VeterinaireComponent` (à vérifier)
- Autres écrans qui accèdent aux données sanitaires

**Action** : Vérifier que tous les écrans utilisent correctement les permissions

---

### 4.3 Vérifier les autres types de données

**Données à vérifier** :
- ✅ Visites vétérinaires (via `useVetData`)
- ✅ Maladies (via `useVetData` - healthAlerts)
- ⚠️ Vaccinations (à vérifier si accessible depuis le dashboard)
- ⚠️ Traitements (à vérifier si accessible depuis le dashboard)
- ⚠️ Planifications (chargées dans `useVetData` mais à vérifier les permissions)

---

## 5. Plan d'action recommandé

### Phase 1 : Correction immédiate (Priorité HAUTE)
1. ✅ Filtrer les collaborations selon `permission_sante` dans `useVetData`
2. ✅ Ajouter gestion d'erreurs pour les appels API qui échouent
3. ✅ Logger les erreurs pour le debugging

### Phase 2 : Vérifications (Priorité MOYENNE)
1. ⚠️ Vérifier que l'endpoint `/collaborations/invitations` retourne les permissions
2. ⚠️ Tester avec un vétérinaire ayant des permissions partielles
3. ⚠️ Vérifier tous les écrans vétérinaires

### Phase 3 : Optimisation (Priorité BASSE)
1. 💡 Créer endpoint backend dédié `/collaborations/veterinarian/accessible-projects`
2. 💡 Optimiser les appels API (batch requests)
3. 💡 Ajouter cache pour les permissions

---

## 6. Résumé des problèmes

| Problème | Fichier | Ligne | Priorité | Statut |
|----------|---------|---------|-----------|--------|
| Ne filtre pas les collaborations selon permissions | `src/hooks/useVetData.ts` | 76-103 | 🔴 HAUTE | ❌ Non corrigé |
| Gestion d'erreurs 403 insuffisante | `src/hooks/useVetData.ts` | 98-103 | 🟡 MOYENNE | ❌ Non corrigé |
| Endpoint peut ne pas retourner permissions | `src/hooks/useVetData.ts` | 67-75 | 🟡 MOYENNE | ⚠️ À vérifier |
| Autres écrans héritent du problème | `ConsultationsScreen`, `MyClientsScreen` | - | 🟡 MOYENNE | ⚠️ À vérifier |

---

## 7. Conclusion

### Points positifs ✅
- Le backend vérifie correctement les permissions via `checkProjetOwnership()`
- Tous les endpoints sanitaires sont protégés
- Le dashboard vétérinaire est bien structuré

### Points à corriger ❌
- **CRITIQUE** : Le hook `useVetData` ne filtre pas les projets selon les permissions avant de faire les appels API
- Les erreurs 403 ne sont pas gérées correctement
- L'endpoint `/collaborations/invitations` peut ne pas retourner les permissions

### Recommandation
**Corriger immédiatement** le hook `useVetData` pour filtrer les collaborations selon les permissions avant de faire les appels API. Cela évitera les appels inutiles et les erreurs 403.

---

## 8. Fichiers à modifier

1. **`src/hooks/useVetData.ts`** (PRIORITÉ HAUTE)
   - Filtrer les collaborations selon `permission_sante` ou `permission_gestion_complete`
   - Ajouter gestion d'erreurs pour les appels API
   - Logger les erreurs

2. **`backend/src/collaborations/collaborations.controller.ts`** (À vérifier)
   - Vérifier que l'endpoint `/collaborations/invitations` retourne les permissions

3. **`backend/src/collaborations/collaborations.controller.ts`** (OPTIONNEL - Phase 3)
   - Créer endpoint `/collaborations/veterinarian/accessible-projects`

---

## 9. Tests à effectuer

1. ✅ Tester avec un vétérinaire ayant `permission_sante = true` sur un projet
2. ✅ Tester avec un vétérinaire ayant `permission_sante = false` sur un projet
3. ✅ Tester avec un vétérinaire ayant `permission_gestion_complete = true` sur un projet
4. ✅ Vérifier que les données sont correctement filtrées selon les permissions
5. ✅ Vérifier que les erreurs 403 sont gérées correctement
6. ✅ Vérifier les performances (moins d'appels API inutiles)

---

**Document créé le** : 2026-01-23  
**Dernière mise à jour** : 2026-01-23
