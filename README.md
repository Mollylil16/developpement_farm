# Fermier Pro - Application Mobile pour Éleveurs Porcins

## 📱 Description

Fermier Pro est une application mobile complète conçue pour aider les éleveurs porcins à mieux gérer leur ferme. L'application offre des outils avancés pour le planning de reproduction, la gestion nutritionnelle, le suivi financier et l'analyse de performance.

## 🚀 Fonctionnalités Principales

### 🐷 Gestion des Porcs
- Suivi individuel de chaque porc
- Numérotation et identification
- Suivi du poids et de la croissance
- Gestion des généalogies (père/mère)

### 🤱 Reproduction
- Planning des gestations
- Calcul automatique des dates de mise bas
- Suivi des sevrages
- Alertes pour les événements importants

### 🍽️ Nutrition
- Calculateur de rations personnalisées
- Gestion des ingrédients et coûts
- Recommandations nutritionnelles
- Suivi des coûts d'alimentation

### 💰 Finance
- Suivi des recettes et dépenses
- Calcul de la marge brute
- Prévisions de cash-flow
- Rapports financiers détaillés

### 📊 Rapports & Analytics
- Graphiques de croissance
- Indicateurs de performance
- Recommandations d'optimisation
- Export des rapports

## 🛠️ Technologies Utilisées

- **React Native** - Framework mobile cross-platform
- **TypeScript** - Langage de programmation typé
- **Redux Toolkit** - Gestion d'état globale
- **React Navigation** - Navigation entre écrans
- **SQLite** - Base de données locale
- **React Native Chart Kit** - Graphiques et visualisations
- **React Native Calendars** - Composants calendrier
- **React Native Vector Icons** - Icônes

## 📦 Installation

### Prérequis
- Node.js (version 16 ou supérieure)
- React Native CLI
- Android Studio (pour Android)
- Xcode (pour iOS)

### Étapes d'installation

1. **Cloner le projet**
   ```bash
   git clone https://github.com/votre-repo/fermier-pro.git
   cd fermier-pro
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Installation iOS (macOS uniquement)**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Lancer l'application**
   
   Pour Android :
   ```bash
   npm run android
   ```
   
   Pour iOS :
   ```bash
   npm run ios
   ```

## 🏗️ Architecture du Projet

```
src/
├── components/          # Composants réutilisables
├── screens/            # Écrans de l'application
│   ├── DashboardScreen.tsx
│   ├── ReproductionScreen.tsx
│   ├── NutritionScreen.tsx
│   ├── FinanceScreen.tsx
│   └── ReportsScreen.tsx
├── store/              # Gestion d'état Redux
│   ├── store.ts
│   └── slices/
│       ├── porcsSlice.ts
│       ├── reproductionSlice.ts
│       ├── nutritionSlice.ts
│       └── financeSlice.ts
├── services/           # Services et API
│   └── database.ts
├── utils/              # Utilitaires et calculs
│   └── calculs.ts
└── types/              # Définitions TypeScript
    └── index.ts
```

## 🧮 Calculs Agricoles Intégrés

L'application inclut des calculs spécialisés pour l'élevage porcin :

- **Rations quotidiennes** : Calcul basé sur le poids corporel (3% par défaut)
- **Gain de poids quotidien** : Suivi de la croissance
- **Indice de consommation** : Efficacité alimentaire
- **Dates de mise bas** : Calcul automatique (114 jours après sautage)
- **Âge de sevrage optimal** : Recommandations (28 jours)
- **Poids cibles** : Selon l'âge et la race
- **Coûts de production** : Par kg de poids vif
- **Marges brutes** : Calcul de rentabilité

## 📱 Écrans de l'Application

### 🏠 Dashboard
- Vue d'ensemble de l'élevage
- Statistiques clés
- Graphiques de performance
- Actions rapides
- Alertes importantes

### 🤱 Reproduction
- Liste des gestations en cours
- Ajout de nouvelles gestations
- Suivi des sevrages
- Calendrier des événements

### 🍽️ Nutrition
- Catalogue des rations
- Calculateur de rations
- Création de nouvelles rations
- Suivi des coûts alimentaires

### 💰 Finance
- Résumé financier mensuel
- Graphiques de recettes/dépenses
- Ajout de transactions
- Historique des mouvements

### 📊 Rapports
- Indicateurs de performance
- Graphiques de croissance
- Analyse financière
- Recommandations d'optimisation

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine du projet :

```env
# Configuration de la base de données
DB_NAME=FermierPro.db
DB_VERSION=1

# Configuration des calculs
DEFAULT_FEEDING_PERCENTAGE=3
DEFAULT_WEANING_AGE=28
GESTATION_DURATION=114
```

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests avec couverture
npm run test:coverage
```

## 📦 Build et Déploiement

### Build Android
```bash
npm run build:android
```

### Build iOS
```bash
npm run build:ios
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@fermier-pro.com
- 🐛 Issues : [GitHub Issues](https://github.com/votre-repo/fermier-pro/issues)
- 📖 Documentation : [Wiki du projet](https://github.com/votre-repo/fermier-pro/wiki)

## 🗺️ Roadmap

### Version 1.1
- [ ] Synchronisation cloud
- [ ] Notifications push
- [ ] Mode hors ligne amélioré
- [ ] Export PDF des rapports

### Version 1.2
- [ ] Intégration capteurs IoT
- [ ] IA pour recommandations
- [ ] Multi-fermes
- [ ] API REST

### Version 2.0
- [ ] Version web
- [ ] Intégration ERP
- [ ] Marketplace
- [ ] Communauté éleveurs

---

**Fermier Pro** - Simplifiez la gestion de votre élevage porcin ! 🐷✨
