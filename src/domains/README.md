# Domain-Driven Design (DDD) Architecture

Cette structure suit les principes du Domain-Driven Design pour séparer clairement les domaines métier.

## Structure

```
domains/
├── production/
│   ├── entities/          # Entités métier (Animal, Gestation, etc.)
│   ├── repositories/      # Interfaces des repositories (abstractions)
│   ├── services/          # Services métier (logique de domaine)
│   └── useCases/          # Cas d'usage (orchestration)
├── finance/
│   ├── entities/
│   ├── repositories/
│   ├── services/
│   └── useCases/
└── sante/
    ├── entities/
    ├── repositories/
    ├── services/
    └── useCases/
```

## Principes

1. **Entities** : Objets métier avec identité (Animal, Projet, etc.)
2. **Repositories** : Interfaces abstraites pour l'accès aux données
3. **Services** : Logique métier complexe qui ne peut pas être dans une entité
4. **Use Cases** : Orchestration des opérations métier (CreateAnimal, CalculateCosts, etc.)

## Séparation des responsabilités

- **domains/** : Logique métier pure (indépendante de l'infrastructure)
- **infrastructure/** : Implémentations concrètes (database, api, etc.)
- **presentation/** : UI (screens, components, Redux slices)

## Migration progressive

Les slices Redux actuels seront progressivement refactorés pour :
1. Extraire la logique métier vers les use cases
2. Garder uniquement l'état UI dans les slices
3. Utiliser les repositories via les interfaces du domaine

