# 🎯 Guide de Qualité du Code - Fermier Pro

## 🚀 Démarrage Rapide

```bash
# 1. Vérifier les types TypeScript
npm run type-check

# 2. Vérifier le linting
npm run lint

# 3. Lancer les tests
npm test

# 4. Tout vérifier en une commande
npm run lint && npm run type-check && npm test
```

---

## 📋 Scripts Disponibles

| Script | Commande | Description |
|--------|----------|-------------|
| **Tests** | `npm test` | Lance tous les tests |
| | `npm run test:watch` | Tests en mode watch |
| | `npm run test:coverage` | Tests avec rapport de coverage |
| **Linting** | `npm run lint` | Vérifie les erreurs ESLint |
| | `npm run lint:fix` | Corrige automatiquement |
| **Types** | `npm run type-check` | Vérifie les types TypeScript |
| **Format** | `npx prettier --write "src/**/*.{ts,tsx}"` | Formate le code |

---

## 📚 Documentation

- 📘 **[README_TESTS.md](./README_TESTS.md)** - Guide complet des tests
- 📗 **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Résumé du nettoyage effectué
- 📙 **[CODE_CLEANUP_REPORT.md](./CODE_CLEANUP_REPORT.md)** - Rapport technique détaillé
- 📕 **[INSTALLATION_COMPLETE.md](./INSTALLATION_COMPLETE.md)** - Installation et configuration

---

## ✅ Status Actuel

### Configuration
- ✅ Jest configuré
- ✅ React Testing Library prêt
- ✅ ESLint actif
- ✅ Prettier configuré
- ✅ TypeScript strict mode

### Code
- ✅ 12+ erreurs TypeScript corrigées (~20%)
- ✅ Code formaté uniformément
- ✅ 3 tests d'exemple créés
- ⚠️ ~48 erreurs TypeScript restantes
- ⏳ Coverage à améliorer

---

## 🔍 Workflow Recommandé

### Avant de Coder
```bash
# Mettre à jour les dépendances
npm install

# Vérifier l'état actuel
npm run type-check
npm run lint
```

### Pendant le Développement
```bash
# En parallèle dans 2 terminaux:
npm run test:watch          # Terminal 1: Tests
npm run type-check -- -w    # Terminal 2: Types
```

### Avant de Commit
```bash
# Vérification complète
npm run lint:fix
npm run type-check
npm test
npx prettier --write "src/**/*.{ts,tsx}"
```

---

## 🎨 Standards de Code

### Formatage (Prettier)
- **Indentation:** 2 espaces
- **Quotes:** Simple quotes
- **Ligne max:** 100 caractères
- **Semi-colons:** Obligatoires
- **Trailing comma:** ES5

### Linting (ESLint)
- **TypeScript:** Strict
- **React Hooks:** Règles activées
- **Unused vars:** Warning
- **Console logs:** Warning (sauf warn/error)

### TypeScript
- **Strict mode:** Activé
- **No implicit any:** Warn
- **Explicit types:** Encouragés

---

## 🧪 Écrire des Tests

### Structure de Base

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MonComposant from '../MonComposant';

describe('MonComposant', () => {
  it('devrait faire X', () => {
    // Arrange
    const props = { value: 10 };
    
    // Act
    const { getByText } = render(<MonComposant {...props} />);
    
    // Assert
    expect(getByText('10')).toBeTruthy();
  });
});
```

### Couverture Minimale

Tester au minimum:
- ✅ Le rendu du composant
- ✅ Les interactions utilisateur
- ✅ Les cas limites (null, undefined, vide)
- ✅ Les états d'erreur

---

## 🐛 Debugging

### Erreurs TypeScript

```bash
# Voir toutes les erreurs
npm run type-check

# Filtrer par fichier
npm run type-check 2>&1 | Select-String "MonFichier"

# Analyser avec script personnalisé
node scripts/analyze-errors.js
```

### Erreurs ESLint

```bash
# Voir les erreurs
npm run lint

# Corriger automatiquement
npm run lint:fix

# Par fichier
npx eslint src/components/MonComposant.tsx
```

### Tests qui Échouent

```bash
# Mode verbose
npm test -- --verbose

# Voir les logs
npm test -- --silent=false

# Test spécifique
npm test -- MonComposant.test.tsx
```

---

## 📊 Objectifs de Qualité

### Coverage
- **Statements:** 70%
- **Branches:** 60%
- **Functions:** 70%
- **Lines:** 70%

### Types
- **Erreurs TypeScript:** 0
- **Any explicites:** Minimiser
- **Types stricts:** Préférer

### Performance
- **Bundle size:** Optimiser
- **Re-renders:** Minimiser
- **Memory leaks:** Aucune

---

## 🔧 Configuration des Outils

### Jest (`jest.config.js`)
- Preset: `jest-expo`
- Transform: Babel + TypeScript
- Coverage: 70% global
- Mocks: react-native-reanimated

### ESLint (`.eslintrc.js`)
- Parser: @typescript-eslint
- Extends: recommended + prettier
- Plugins: react, react-hooks, react-native

### Prettier (`.prettierrc.js`)
- Style: Single quotes, 2 spaces
- Print width: 100
- End of line: auto

---

## 🚨 Erreurs Communes et Solutions

### 1. "Cannot find module"
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### 2. "Transform failed"
```bash
# Nettoyer le cache
npx expo start --clear
```

### 3. "Type error in test"
```bash
# Vérifier les mocks dans jest.setup.js
# Ajouter @ts-ignore si nécessaire
```

### 4. "Prettier conflicts with ESLint"
```bash
# Désactiver les règles conflictuelles
npm run lint:fix
```

---

## 📈 Prochaines Étapes

1. **Court terme** (1-2 jours)
   - [ ] Corriger les ~48 erreurs TypeScript restantes
   - [ ] Lancer `npm run lint:fix`
   - [ ] Écrire 5-10 tests additionnels

2. **Moyen terme** (1 semaine)
   - [ ] Atteindre 50% de coverage
   - [ ] Refactoriser le code dupliqué
   - [ ] Optimiser les performances

3. **Long terme** (1 mois)
   - [ ] 70%+ coverage
   - [ ] 0 erreurs TypeScript
   - [ ] CI/CD avec tests automatiques
   - [ ] Documentation API complète

---

## 💡 Conseils

### Performance
- Utilisez `React.memo()` pour les composants lourds
- `useMemo()` et `useCallback()` pour les calculs coûteux
- Profiler avec React DevTools

### Maintenabilité
- Commentaires clairs et concis
- Noms de variables descriptifs
- Fonctions courtes (< 50 lignes)
- Composants simples (< 200 lignes)

### Sécurité
- Valider toutes les entrées utilisateur
- Sanitizer les données avant affichage
- Pas de secrets dans le code

---

## 🎓 Ressources

### Documentation
- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react-native)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [TypeScript](https://www.typescriptlang.org/)

### Guides
- [Testing Best Practices](https://testingjavascript.com/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [React Patterns](https://reactpatterns.com/)

---

## ❓ FAQ

**Q: Les tests sont-ils obligatoires?**  
R: Pour les composants critiques, oui. Visez au moins 50% de coverage.

**Q: Que faire avec les erreurs TypeScript?**  
R: Corrigez-les une par une. Utilisez `@ts-ignore` en dernier recours.

**Q: Prettier casse mon code?**  
R: Non, il le formate. Vérifiez `.prettierrc.js` pour ajuster.

**Q: Comment tester les hooks Redux?**  
R: Utilisez `renderHook` de React Testing Library.

**Q: Coverage 100% nécessaire?**  
R: Non, 70% est un bon objectif. Focalisez sur le code critique.

---

## 📞 Support

En cas de problème:
1. Vérifiez cette documentation
2. Lisez README_TESTS.md
3. Consultez les logs d'erreur
4. Cherchez sur Stack Overflow
5. Demandez à l'équipe

---

**Version:** 1.0.0  
**Date:** 21 Novembre 2025  
**Status:** ✅ Actif et Maintenu

