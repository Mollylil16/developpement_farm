# Tests End-to-End (E2E)

## 📋 Structure

```
e2e/
├── README.md (ce fichier)
├── setup/
│   ├── setup.ts          # Configuration E2E
│   └── fixtures.ts       # Données de test
├── flows/
│   ├── onboarding.e2e.ts      # Flux d'onboarding
│   ├── production.e2e.ts       # Flux de production
│   ├── finance.e2e.ts          # Flux financier
│   └── marketplace.e2e.ts       # Flux marketplace
└── helpers/
    ├── navigation.ts     # Helpers de navigation
    └── assertions.ts     # Helpers d'assertions
```

## 🎯 Objectif

5% de la couverture totale via les tests E2E pour les flux critiques de l'application.

## 🚀 Configuration

### Option 1: Detox (Recommandé pour React Native)

```bash
npm install --save-dev detox
npm install --save-dev jest-circus
```

### Option 2: Maestro (Alternative plus simple)

```bash
# Installation via Homebrew (macOS) ou téléchargement
brew install maestro
```

## 📝 Flux à Tester (Priorité)

### P0 - Flux Critiques
1. **Onboarding**
   - Création de compte
   - Sélection de profil
   - Création du premier projet

2. **Production**
   - Ajout d'un animal
   - Enregistrement d'une pesée
   - Enregistrement d'une gestation

3. **Finance**
   - Création d'une dépense
   - Création d'un revenu
   - Visualisation du bilan

### P1 - Flux Secondaires
4. **Marketplace**
   - Création d'une annonce
   - Réponse à une offre
   - Finalisation d'une transaction

5. **Santé**
   - Enregistrement d'une vaccination
   - Enregistrement d'une maladie
   - Visualisation des alertes

## 🔧 Commandes

```bash
# Exécuter tous les tests E2E
npm run test:e2e

# Exécuter un flux spécifique
npm run test:e2e -- flows/onboarding.e2e.ts
```

## 📊 Métriques

- **Objectif**: 5% de la couverture totale
- **Flux critiques**: 100% de couverture E2E
- **Temps d'exécution**: < 10 minutes pour la suite complète

