# 🌍 Système Multilingue - Fermier Pro

## 📋 Vue d'ensemble

Fermier Pro supporte maintenant **deux langues** :
- 🇫🇷 **Français** (langue par défaut)
- 🇬🇧 **English**

Le changement de langue est accessible via **Paramètres > Application > Langue**.

---

## 🚀 Installation

### Étape 1 : Installer les dépendances

```bash
npx expo install i18n-js expo-localization
```

### Étape 2 : Redémarrer le serveur

```bash
npx expo start --clear
```

---

## ✅ Ce qui a été implémenté

### 1. **Service i18n** (`src/services/i18n.ts`)
- Configuration de i18n-js
- Chargement automatique de la langue système
- Sauvegarde de la préférence utilisateur
- Fonctions utilitaires pour la traduction

### 2. **Contexte de langue** (`src/contexts/LanguageContext.tsx`)
- Provider React pour gérer la langue globalement
- Hook `useLanguage()` pour accéder à la langue et la changer
- Hook `useTranslation()` pour obtenir la fonction de traduction

### 3. **Fichiers de traductions**
- **`src/locales/fr.json`** : Toutes les traductions françaises
- **`src/locales/en.json`** : Toutes les traductions anglaises

### 4. **Sélecteur de langue dans Paramètres**
- Interface élégante avec drapeaux 🇫🇷 🇬🇧
- Sélection par simple clic
- Indicateur visuel de la langue active (✓)
- Sauvegarde automatique de la préférence

### 5. **Intégration dans App.tsx**
- `LanguageProvider` wrappé autour de l'application
- Initialisation automatique au démarrage

---

## 📖 Comment utiliser les traductions

### Dans un composant fonctionnel

```typescript
import { useTranslation } from '../contexts/LanguageContext';

function MonComposant() {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('dashboard.title')}</Text>
      <Text>{t('common.save')}</Text>
    </View>
  );
}
```

### Avec paramètres/variables

```typescript
// Dans le fichier JSON
{
  "welcome_user": "Bienvenue {{name}} !",
  "animals_count": "Vous avez {{count}} animaux"
}

// Dans le code
<Text>{t('welcome_user', { name: 'Jean' })}</Text>
<Text>{t('animals_count', { count: 25 })}</Text>
```

### Vérifier la langue actuelle

```typescript
const { language } = useLanguage();

if (language === 'fr') {
  // Logique spécifique au français
}
```

### Changer la langue programmatiquement

```typescript
const { setLanguage } = useLanguage();

await setLanguage('en'); // ou 'fr'
```

---

## 📁 Structure des fichiers de traduction

### Organisation par catégories

```json
{
  "common": {
    "yes": "Oui",
    "no": "Non",
    "save": "Enregistrer"
  },
  "navigation": {
    "dashboard": "Tableau de bord",
    "production": "Production"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "greeting_morning": "Bonjour 👋"
  },
  "errors": {
    "generic": "Une erreur est survenue",
    "network": "Erreur de connexion"
  }
}
```

### Catégories disponibles

- **`common`** : Mots/actions communs (Oui, Non, Enregistrer, etc.)
- **`navigation`** : Noms des sections de navigation
- **`dashboard`** : Traductions pour le tableau de bord
- **`production`** : Traductions pour la production
- **`reproduction`** : Traductions pour la reproduction
- **`finance`** : Traductions pour les finances
- **`nutrition`** : Traductions pour la nutrition
- **`health`** : Traductions pour la santé
- **`reports`** : Traductions pour les rapports
- **`settings`** : Traductions pour les paramètres
- **`errors`** : Messages d'erreur
- **`success`** : Messages de succès
- **`confirmation`** : Messages de confirmation
- **`validation`** : Messages de validation
- **`pdf`** : Traductions pour les exports PDF

---

## 🔄 Prochaines étapes

### Écrans à traduire

#### 1. Dashboard (`src/screens/DashboardScreen.tsx`)

**Textes à remplacer** :
```typescript
// Avant
<Text>Bonjour 👋</Text>
<Text>Tableau de bord</Text>

// Après
<Text>{t('dashboard.greeting_morning')}</Text>
<Text>{t('dashboard.title')}</Text>
```

#### 2. Production (`src/screens/ProductionScreen.tsx`)

**Textes à remplacer** :
```typescript
// Avant
<Text>Production</Text>
<Text>Cheptel</Text>

// Après
<Text>{t('production.title')}</Text>
<Text>{t('production.livestock')}</Text>
```

#### 3. Finance (`src/screens/FinanceScreen.tsx`)

**Textes à remplacer** :
```typescript
// Avant
<Text>Finance</Text>
<Text>Charges fixes</Text>

// Après
<Text>{t('finance.title')}</Text>
<Text>{t('finance.fixed_charges')}</Text>
```

#### 4. Reproduction (`src/screens/ReproductionScreen.tsx`)

**Textes à remplacer** :
```typescript
// Avant
<Text>Reproduction</Text>
<Text>Gestations</Text>

// Après
<Text>{t('reproduction.title')}</Text>
<Text>{t('reproduction.gestations')}</Text>
```

#### 5. Rapports (`src/screens/RapportsScreen.tsx`)

**Textes à remplacer** :
```typescript
// Avant
<Text>Rapports</Text>
<Text>Indicateurs de performance</Text>

// Après
<Text>{t('reports.title')}</Text>
<Text>{t('reports.performance')}</Text>
```

### Composants à traduire

#### Boutons (`src/components/Button.tsx`)
```typescript
// Si le bouton a des labels par défaut
{t('common.save')}
{t('common.cancel')}
```

#### Formulaires
```typescript
// Labels de champs
<Text>{t('production.animal_name')}</Text>
<Text>{t('production.birth_date')}</Text>
```

#### Messages d'alerte
```typescript
Alert.alert(
  t('common.error'),
  t('errors.generic')
);

Alert.alert(
  t('common.success'),
  t('success.saved')
);
```

### Export PDF multilingue

Modifier les templates PDF pour utiliser les traductions :

```typescript
// Dans dashboardPDF.ts
import { t } from '../services/i18n';

const header = `
  <h1>${t('pdf.dashboard_title')}</h1>
  <p>${t('pdf.dashboard_subtitle')}</p>
`;
```

---

## 🎯 Liste de vérification (Checklist)

### ✅ Infrastructure (Complété)
- [x] Installer i18n-js et expo-localization
- [x] Créer le service i18n
- [x] Créer le contexte de langue
- [x] Créer les fichiers de traductions (fr.json, en.json)
- [x] Ajouter le sélecteur de langue dans Paramètres
- [x] Intégrer le LanguageProvider dans App.tsx

### ⏳ Traduction des écrans (À faire)
- [ ] DashboardScreen
- [ ] ProductionScreen
- [ ] ReproductionScreen
- [ ] FinanceScreen
- [ ] NutritionScreen
- [ ] SanteScreen
- [ ] RapportsScreen
- [ ] ParametresScreen (déjà partiellement traduit)

### ⏳ Traduction des composants (À faire)
- [ ] Widgets (OverviewWidget, FinanceWidget, etc.)
- [ ] Formulaires (ProductionAnimalFormModal, etc.)
- [ ] Listes (ProductionAnimalsListComponent, etc.)
- [ ] Boutons et actions
- [ ] Messages d'alerte et de confirmation
- [ ] Messages de validation

### ⏳ Export PDF multilingue (À faire)
- [ ] dashboardPDF.ts
- [ ] financePDF.ts
- [ ] rapportsPDF.ts

---

## 💡 Bonnes pratiques

### 1. **Toujours utiliser les clés de traduction**

❌ **À éviter** :
```typescript
<Text>Bonjour</Text>
<Text>Hello</Text>
```

✅ **À faire** :
```typescript
<Text>{t('dashboard.greeting_morning')}</Text>
```

### 2. **Organiser les traductions par contexte**

Groupez les traductions par écran ou fonctionnalité pour une meilleure maintenabilité.

### 3. **Utiliser des clés descriptives**

❌ **Mauvais** :
```json
{
  "text1": "Bonjour",
  "msg": "Erreur"
}
```

✅ **Bon** :
```json
{
  "dashboard.greeting_morning": "Bonjour",
  "errors.generic": "Erreur"
}
```

### 4. **Ajouter des commentaires pour le contexte**

Pour les traducteurs futurs, ajoutez des commentaires dans les fichiers JSON si nécessaire :

```json
{
  // Section pour les animaux
  "animal_male": "Mâle",
  "animal_female": "Femelle"
}
```

### 5. **Tester dans les deux langues**

Avant de valider une fonctionnalité, testez-la en français ET en anglais pour :
- Vérifier que toutes les traductions sont présentes
- S'assurer que l'UI s'adapte bien (certains textes peuvent être plus longs)
- Valider la cohérence des termes

---

## 🐛 Dépannage

### Erreur : "i18n-js not found"

```bash
npx expo install i18n-js expo-localization
npx expo start --clear
```

### Les traductions ne s'affichent pas

1. Vérifier que la clé existe dans les deux fichiers JSON (fr.json et en.json)
2. Vérifier l'import : `import { useTranslation } from '../contexts/LanguageContext';`
3. Vérifier l'utilisation : `const { t } = useTranslation();`
4. Vérifier la syntaxe : `{t('key.subkey')}`

### La langue ne change pas

1. Vérifier que le `LanguageProvider` wraps l'application dans App.tsx
2. Vérifier que AsyncStorage est accessible
3. Redémarrer l'application

### Les PDFs ne sont pas traduits

Les templates PDF doivent importer et utiliser la fonction `t` :

```typescript
import { t } from '../services/i18n';

const content = `<h1>${t('pdf.title')}</h1>`;
```

---

## 📊 Statistiques

### Traductions disponibles
- **Français** : ~200 clés
- **English** : ~200 clés

### Couverture
- Infrastructure : 100% ✅
- Paramètres : 80% 🔄
- Dashboard : 0% ⏳
- Production : 0% ⏳
- Reproduction : 0% ⏳
- Finance : 0% ⏳
- Autres : 0% ⏳

---

## 🎊 Avantages

- ✅ **Accessibilité internationale** : Ouverture à un public anglophone
- ✅ **Expérience utilisateur améliorée** : Interface dans la langue préférée
- ✅ **Professionnalisme** : Démontre la qualité de l'application
- ✅ **Extensible** : Facile d'ajouter d'autres langues (espagnol, arabe, etc.)
- ✅ **Maintenable** : Traductions centralisées dans des fichiers JSON
- ✅ **Performant** : Pas d'impact sur les performances

---

**Date de création** : 17 novembre 2024  
**Version** : 1.0  
**Statut** : Infrastructure ✅ | Traductions en cours ⏳  
**Langues supportées** : Français 🇫🇷, English 🇬🇧

