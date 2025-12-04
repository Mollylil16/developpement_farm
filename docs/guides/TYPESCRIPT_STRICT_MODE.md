# 🔒 TypeScript Strict Mode - Élimination des `any`

Guide pour éliminer progressivement l'utilisation de `any` et améliorer la sécurité des types.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [État actuel](#état-actuel)
3. [Stratégie de migration](#stratégie-de-migration)
4. [Types utilitaires](#types-utilitaires)
5. [Patterns de remplacement](#patterns-de-remplacement)
6. [Bonnes pratiques](#bonnes-pratiques)

---

## Introduction

### Problème

- ❌ **764 occurrences** de `any` dans 210 fichiers
- ❌ Perte des bénéfices TypeScript (autocomplétion, vérification de types)
- ❌ Risque d'erreurs à l'exécution
- ❌ Difficulté de maintenance

### Objectif

- ✅ Éliminer progressivement tous les `any`
- ✅ Utiliser des types stricts et précis
- ✅ Améliorer la sécurité des types
- ✅ Meilleure expérience développeur

### Configuration actuelle

Le strict mode est **déjà activé** dans `tsconfig.json` :
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

## État actuel

### Répartition des `any`

1. **Catch blocks** (~60%) : `catch (error: any)`
2. **Paramètres de fonction** (~20%) : `function fn(param: any)`
3. **Retours de fonction** (~10%) : `function fn(): any`
4. **Types génériques** (~5%) : `Array<any>`, `Record<string, any>`
5. **Autres** (~5%) : Variables, propriétés d'objets, etc.

### Fichiers les plus affectés

- `src/services/database.ts` : 32 occurrences
- `src/store/slices/*.ts` : ~100 occurrences
- `src/components/*.tsx` : ~200 occurrences
- `src/database/repositories/*.ts` : ~50 occurrences

---

## Stratégie de migration

### Phase 1 : Types utilitaires (Priorité P0)

Créer des types utilitaires pour remplacer les `any` courants :

- ✅ `ErrorLike` : Pour les erreurs dans catch blocks
- ✅ `UnknownObject` : Pour les objets dynamiques
- ✅ `JSONValue` : Pour les valeurs JSON
- ✅ `SQLiteRow` : Pour les résultats de requêtes

### Phase 2 : Catch blocks (Priorité P0)

Remplacer tous les `catch (error: any)` par `catch (error: unknown)` :

```typescript
// Avant
try {
  // ...
} catch (error: any) {
  console.error(error.message);
}

// Après
try {
  // ...
} catch (error: unknown) {
  console.error(getErrorMessage(error));
}
```

### Phase 3 : Paramètres de fonction (Priorité P1)

Remplacer les paramètres `any` par des types précis :

```typescript
// Avant
function processData(data: any) {
  return data.value;
}

// Après
function processData(data: { value: number }) {
  return data.value;
}
```

### Phase 4 : Retours de fonction (Priorité P1)

Remplacer les retours `any` par des types précis :

```typescript
// Avant
function getData(): any {
  return { value: 123 };
}

// Après
function getData(): { value: number } {
  return { value: 123 };
}
```

### Phase 5 : Types génériques (Priorité P2)

Remplacer `Array<any>` et `Record<string, any>` :

```typescript
// Avant
const items: Array<any> = [];
const data: Record<string, any> = {};

// Après
const items: unknown[] = [];
const data: Record<string, unknown> = {};
// Ou mieux, avec des types précis
const items: Item[] = [];
const data: Record<string, string | number> = {};
```

---

## Types utilitaires

### ErrorLike

Pour les erreurs dans catch blocks :

```typescript
import { ErrorLike, getErrorMessage } from '../types/common';

try {
  // ...
} catch (error: unknown) {
  const message = getErrorMessage(error);
  console.error(message);
}
```

### UnknownObject

Pour les objets avec propriétés inconnues :

```typescript
import { UnknownObject } from '../types/common';

function processObject(obj: UnknownObject): void {
  if (typeof obj.value === 'string') {
    console.log(obj.value);
  }
}
```

### JSONValue

Pour les valeurs JSON :

```typescript
import { JSONValue } from '../types/common';

function parseJSON(json: string): JSONValue {
  return JSON.parse(json);
}
```

### SQLiteRow

Pour les résultats de requêtes SQLite :

```typescript
import { SQLiteRow } from '../types/common';

async function queryData(): Promise<SQLiteRow[]> {
  return await db.getAllAsync<SQLiteRow>('SELECT * FROM table');
}
```

---

## Patterns de remplacement

### Pattern 1 : Catch blocks

**Avant :**
```typescript
try {
  await someOperation();
} catch (error: any) {
  console.error(error.message);
  throw error;
}
```

**Après :**
```typescript
import { getErrorMessage, toError } from '../types/common';

try {
  await someOperation();
} catch (error: unknown) {
  const message = getErrorMessage(error);
  console.error(message);
  throw toError(error);
}
```

### Pattern 2 : Paramètres dynamiques

**Avant :**
```typescript
function handleEvent(event: any) {
  console.log(event.type, event.data);
}
```

**Après :**
```typescript
interface Event {
  type: string;
  data: unknown;
}

function handleEvent(event: Event) {
  console.log(event.type, event.data);
}
```

### Pattern 3 : Retours dynamiques

**Avant :**
```typescript
function fetchData(): any {
  return { value: 123, name: 'test' };
}
```

**Après :**
```typescript
interface Data {
  value: number;
  name: string;
}

function fetchData(): Data {
  return { value: 123, name: 'test' };
}
```

### Pattern 4 : Tableaux dynamiques

**Avant :**
```typescript
const items: any[] = [];
items.push({ id: 1, name: 'test' });
```

**Après :**
```typescript
interface Item {
  id: number;
  name: string;
}

const items: Item[] = [];
items.push({ id: 1, name: 'test' });
```

### Pattern 5 : Objets dynamiques

**Avant :**
```typescript
const config: Record<string, any> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
};
```

**Après :**
```typescript
interface Config {
  apiUrl: string;
  timeout: number;
}

const config: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
};
```

---

## Bonnes pratiques

### ✅ À faire

1. **Toujours utiliser `unknown` au lieu de `any`**
   - `unknown` force la vérification de type
   - `any` désactive complètement TypeScript

2. **Créer des interfaces pour les objets**
   - Même pour les objets simples
   - Facilite la maintenance et l'autocomplétion

3. **Utiliser les types utilitaires**
   - `ErrorLike` pour les erreurs
   - `UnknownObject` pour les objets dynamiques
   - `JSONValue` pour les JSON

4. **Typer les retours de fonction**
   - Même si le type est complexe
   - Utiliser `Promise<T>` pour les async

### ❌ À éviter

1. **Ne pas utiliser `any` comme solution de contournement**
   - Chercher le type correct
   - Utiliser `unknown` si nécessaire

2. **Ne pas ignorer les erreurs TypeScript**
   - Corriger les erreurs au lieu de les masquer
   - Utiliser `@ts-expect-error` seulement si vraiment nécessaire

3. **Ne pas utiliser `any` pour "gagner du temps"**
   - Le temps gagné maintenant sera perdu en maintenance
   - Les erreurs de type seront découvertes à l'exécution

---

## Migration progressive

### Étape 1 : Identifier les `any`

```bash
# Compter les occurrences
grep -r ":\s*any\b" src --count

# Lister les fichiers avec le plus de `any`
grep -r ":\s*any\b" src | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

### Étape 2 : Prioriser les fichiers

1. **Fichiers critiques** (services, repositories)
2. **Fichiers fréquemment modifiés** (components, hooks)
3. **Fichiers de test** (moins critique)

### Étape 3 : Remplacer progressivement

1. Commencer par les catch blocks (le plus simple)
2. Puis les paramètres de fonction
3. Enfin les retours et types génériques

### Étape 4 : Vérifier

```bash
# Vérifier qu'il n'y a plus d'erreurs TypeScript
npm run type-check

# Vérifier que les tests passent
npm test
```

---

## Exemples concrets

### Exemple 1 : Database Service

**Avant :**
```typescript
try {
  await db.execAsync(sql);
} catch (error: any) {
  console.error('Error:', error.message);
}
```

**Après :**
```typescript
import { getErrorMessage } from '../types/common';

try {
  await db.execAsync(sql);
} catch (error: unknown) {
  console.error('Error:', getErrorMessage(error));
}
```

### Exemple 2 : Repository

**Avant :**
```typescript
async query(sql: string, params: any[]): Promise<any[]> {
  return await this.db.getAllAsync(sql, params);
}
```

**Après :**
```typescript
import { SQLiteRow } from '../types/common';

async query<T = SQLiteRow>(sql: string, params: unknown[]): Promise<T[]> {
  return await this.db.getAllAsync<T>(sql, params);
}
```

### Exemple 3 : Component Props

**Avant :**
```typescript
interface Props {
  data: any;
  onUpdate: (value: any) => void;
}
```

**Après :**
```typescript
interface Data {
  id: string;
  value: number;
}

interface Props {
  data: Data;
  onUpdate: (value: Data) => void;
}
```

---

## Outils et scripts

### Script de détection

Créer un script pour identifier les `any` :

```typescript
// scripts/find-any.ts
import { readFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.{ts,tsx}');
const anyPattern = /:\s*any\b|any\s*\[|Array<any>|Record<string,\s*any>/g;

files.forEach(file => {
  const content = readFileSync(file, 'utf-8');
  const matches = content.match(anyPattern);
  if (matches) {
    console.log(`${file}: ${matches.length} occurrences`);
  }
});
```

### ESLint Rule

Ajouter une règle ESLint pour interdire `any` :

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

---

## Références

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [TypeScript Unknown vs Any](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [Types utilitaires](../../src/types/common.ts)

---

**Dernière mise à jour:** 21 Novembre 2025

