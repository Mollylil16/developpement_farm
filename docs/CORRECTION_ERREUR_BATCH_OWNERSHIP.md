# Correction de l'erreur `Cette bande ne vous appartient pas`

## Problème identifié

L'erreur `ForbiddenException: Cette bande ne vous appartient pas` se produisait lors de l'appel à `getPigsByBatch`. La méthode `checkBatchOwnership` utilisait une approche en deux étapes (récupération puis comparaison) qui pouvait échouer à cause de problèmes de normalisation ou de comparaison d'IDs.

## Analyse

**Fichier concerné :**
- `backend/src/batches/batch-pigs.service.ts` (méthode `checkBatchOwnership`)

**Problème :**
La méthode récupérait d'abord le `proprietaire_id` du projet, puis comparait manuellement avec le `userId`. Cette approche était sujette aux erreurs de normalisation et ne permettait pas de distinguer facilement entre "bande non trouvée" et "bande ne vous appartient pas".

## Solution appliquée

### 1. Amélioration de la méthode `checkBatchOwnership`

**Avant :**
```typescript
private async checkBatchOwnership(batchId: string, userId: string): Promise<void> {
  try {
    const result = await this.db.query(
      `SELECT b.projet_id, p.proprietaire_id 
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1`,
      [batchId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    // Normaliser les IDs pour la comparaison
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (proprietaireId !== normalizedUserId) {
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }
  } catch (error) {
    throw error;
  }
}
```

**Après :**
```typescript
private async checkBatchOwnership(batchId: string, userId: string): Promise<void> {
  try {
    // Vérifier directement dans la requête SQL (comme checkProjetOwnership dans marketplace)
    const result = await this.db.query(
      `SELECT b.id 
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1 AND p.proprietaire_id = $2`,
      [batchId, userId],
    );
    if (result.rows.length === 0) {
      // Vérifier si la bande existe pour donner un message d'erreur plus précis
      const batchCheck = await this.db.query(
        `SELECT b.id, b.projet_id FROM batches b WHERE b.id = $1`,
        [batchId],
      );
      if (batchCheck.rows.length === 0) {
        throw new NotFoundException('Bande non trouvée');
      }
      
      // Vérifier le proprietaire_id du projet pour le débogage
      const projetCheck = await this.db.query(
        `SELECT id, proprietaire_id FROM projets WHERE id = $1`,
        [batchCheck.rows[0].projet_id],
      );
      if (projetCheck.rows.length > 0) {
        const proprietaireId = String(projetCheck.rows[0].proprietaire_id || '').trim();
        const normalizedUserId = String(userId || '').trim();
        this.logger.warn(
          `[checkBatchOwnership] Bande ${batchId} appartient au projet ${batchCheck.rows[0].projet_id}, ` +
          `proprietaire_id=${proprietaireId}, userId=${normalizedUserId}, match=${proprietaireId === normalizedUserId}`
        );
      }
      
      // La bande existe mais n'appartient pas à l'utilisateur
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }
  } catch (error) {
    // Si c'est déjà une exception NestJS, la relancer telle quelle
    if (error instanceof NotFoundException || error instanceof ForbiddenException) {
      throw error;
    }
    // Sinon, logger l'erreur et relancer
    this.logger.error(`[checkBatchOwnership] Erreur inattendue:`, error);
    throw error;
  }
}
```

### 2. Ajout du logger

**Changement :**
- Import de `Logger` depuis `@nestjs/common`
- Ajout de `private readonly logger = new Logger(BatchPigsService.name);` dans le service

## Améliorations

1. **Vérification directe dans SQL** : La vérification se fait maintenant directement dans la requête SQL avec `WHERE b.id = $1 AND p.proprietaire_id = $2`, ce qui est plus fiable et évite les problèmes de normalisation
2. **Messages d'erreur plus précis** : Distinction claire entre "bande non trouvée" et "bande ne vous appartient pas"
3. **Logs de débogage** : Ajout de logs pour diagnostiquer les problèmes de propriété (affiche le `proprietaire_id` du projet, le `userId`, et si ils correspondent)
4. **Gestion d'erreur améliorée** : Meilleure gestion des exceptions NestJS vs erreurs inattendues

## Impact

- **Avant** : L'erreur pouvait se produire à cause de problèmes de normalisation ou de comparaison d'IDs
- **Après** : 
  - La vérification est plus fiable (faite directement dans SQL)
  - Les logs permettent de diagnostiquer facilement les problèmes
  - Les messages d'erreur sont plus précis

## Fichiers modifiés

- `backend/src/batches/batch-pigs.service.ts` :
  - Ajout de `Logger` dans les imports
  - Ajout de `private readonly logger` dans le service
  - Amélioration de la méthode `checkBatchOwnership`

## Tests recommandés

1. Tester avec une bande qui appartient à l'utilisateur (devrait fonctionner)
2. Tester avec une bande qui n'appartient pas à l'utilisateur (devrait retourner `ForbiddenException`)
3. Tester avec une bande inexistante (devrait retourner `NotFoundException`)
4. Vérifier les logs pour diagnostiquer les problèmes de propriété

## Notes

- Cette approche est alignée avec `checkProjetOwnership` dans `marketplace.service.ts` et `marketplace-unified.service.ts`
- Les logs de débogage aideront à identifier si le problème vient d'un `proprietaire_id` incorrect dans la base de données
- Si le problème persiste, vérifier que le `proprietaire_id` du projet correspond bien au `userId` de l'utilisateur connecté

