# Database Schemas

Ce dossier contient les définitions de schémas SQL organisées par domaine métier.

## Structure

```
schemas/
├── core/
│   ├── users.schema.ts
│   └── projets.schema.ts
├── finance/
│   ├── charges_fixes.schema.ts
│   ├── depenses_ponctuelles.schema.ts
│   └── revenus.schema.ts
├── production/
│   ├── animaux.schema.ts
│   ├── pesees.schema.ts
│   ├── gestations.schema.ts
│   ├── sevrages.schema.ts
│   └── mortalites.schema.ts
├── nutrition/
│   ├── ingredients.schema.ts
│   ├── rations.schema.ts
│   ├── stocks_aliments.schema.ts
│   └── stocks_mouvements.schema.ts
├── sante/
│   ├── calendrier_vaccinations.schema.ts
│   ├── vaccinations.schema.ts
│   ├── maladies.schema.ts
│   ├── traitements.schema.ts
│   ├── visites_veterinaires.schema.ts
│   └── rappels_vaccinations.schema.ts
├── collaboration/
│   └── collaborations.schema.ts
└── index.ts
```

## Usage

Chaque fichier de schéma exporte une fonction `createTable(db)` qui crée la table correspondante.

```typescript
import { createUsersTable } from './schemas/core/users.schema';
import { createProjetsTable } from './schemas/core/projets.schema';

await createUsersTable(db);
await createProjetsTable(db);
```

## Migration

Les schémas sont extraits de `src/services/database.ts` pour améliorer la maintenabilité et réduire la taille du fichier principal.

