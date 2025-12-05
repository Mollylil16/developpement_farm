# ADR-001: Repository Pattern

## Status
Accepted

## Date
21 Novembre 2025

## Context

L'application utilisait initialement des méthodes directes dans `database.ts` (7500+ lignes), rendant le code difficile à maintenir et tester. Il fallait une abstraction pour :

- Séparer la logique métier de l'accès aux données
- Faciliter les tests unitaires
- Permettre de changer de base de données facilement
- Réduire la complexité de `database.ts`

## Decision

Adopter le **Repository Pattern** pour tous les accès aux données.

Chaque entité métier a son propre repository qui étend `BaseRepository` :

```typescript
class AnimalRepository extends BaseRepository<Animal> {
  async findByProjet(projetId: string): Promise<Animal[]>
  async findActifs(): Promise<Animal[]>
}
```

## Consequences

### Avantages

- ✅ Code plus maintenable et organisé
- ✅ Tests unitaires facilités (mocking des repositories)
- ✅ Séparation claire des responsabilités
- ✅ Réduction de la taille de `database.ts`

### Inconvénients

- ⚠️ Plus de fichiers à maintenir
- ⚠️ Légère surcharge de code pour les opérations simples

### Impact

- **Migration** : Progressive, repository par repository
- **Tests** : Amélioration significative de la testabilité
- **Maintenance** : Réduction de la complexité globale

## Références

- [Repository Pattern Guide](../../guides/MIGRATION_REPOSITORIES.md)
- [BaseRepository](../../../src/database/repositories/BaseRepository.ts)

