# Infrastructure Layer

Cette couche contient les implémentations concrètes des abstractions définies dans les domaines.

## Structure

```
infrastructure/
├── database/
│   ├── repositories/     # Implémentations concrètes des repositories
│   ├── schemas/          # Schémas SQL (déjà créé)
│   └── migrations/       # Migrations (déjà créé)
└── api/                  # Clients API externes (futur)
```

## Principe

Les repositories du domaine (interfaces) sont implémentés ici avec l'accès réel à la base de données.

Exemple :
- `domains/production/repositories/IAnimalRepository.ts` (interface)
- `infrastructure/database/repositories/AnimalRepositoryImpl.ts` (implémentation)

