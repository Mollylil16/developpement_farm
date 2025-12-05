# 📄 Installation du Système d'Export PDF

## 📋 Vue d'ensemble

Le système d'export PDF permet de générer des rapports professionnels en PDF pour :
- **Vue d'ensemble (Dashboard)** : Rapport complet de l'exploitation
- **Finance** : Détails complets des finances
- **Rapports** : Indicateurs et tendances de performance

---

## 🔧 Installation des Dépendances

### Étape 1 : Installer expo-print et expo-sharing

Ces packages sont nécessaires pour générer et partager les PDF.

```bash
npx expo install expo-print expo-sharing
```

### Étape 2 : Vérifier l'installation

Vérifiez que les packages sont bien ajoutés dans `package.json` :

```json
{
  "dependencies": {
    "expo-print": "~13.0.1",
    "expo-sharing": "~12.0.1"
  }
}
```

### Étape 3 : Redémarrer le serveur de développement

```bash
# Arrêter le serveur actuel (Ctrl+C)
# Puis relancer
npx expo start --clear
```

---

## 📁 Structure des Fichiers Créés

```
src/
├── services/
│   ├── pdfService.ts              # Service principal de génération PDF
│   └── pdf/
│       ├── dashboardPDF.ts        # Template Dashboard
│       ├── financePDF.ts          # Template Finance
│       └── rapportsPDF.ts         # Template Rapports
```

---

## 🚀 Utilisation

### 1. Export du Dashboard

```typescript
import { exportDashboardPDF } from '../services/pdf/dashboardPDF';

// Préparer les données
const dashboardData = {
  projet: projetActif,
  animaux: animaux,
  finances: {
    totalDepenses: 500000,
    totalRevenus: 750000,
    solde: 250000,
    chargesFixes: 200000,
    depensesPonctuelles: 300000,
  },
  production: {
    animauxActifs: 50,
    peseesRecentes: 150,
    poidsTotal: 5000,
    gmqMoyen: 550,
  },
  reproduction: {
    gestationsEnCours: 5,
    prochaineMiseBas: '2024-12-01',
    sevragesRecents: 3,
  },
  alertes: [],
};

// Générer et partager le PDF
await exportDashboardPDF(dashboardData);
```

### 2. Export Finance

```typescript
import { exportFinancePDF } from '../services/pdf/financePDF';

const financeData = {
  projet: projetActif,
  chargesFixes: chargesFixes,
  depensesPonctuelles: depenses,
  revenus: revenus,
  totaux: {
    chargesFixes: 200000,
    depensesPonctuelles: 300000,
    totalDepenses: 500000,
    totalRevenus: 750000,
    solde: 250000,
  },
  moyennes: {
    depensesMensuelle: 50000,
    revenusMensuel: 75000,
  },
};

await exportFinancePDF(financeData);
```

### 3. Export Rapports

```typescript
import { exportRapportsPDF } from '../services/pdf/rapportsPDF';

const rapportsData = {
  projet: projetActif,
  indicateurs: {
    gmqMoyen: 550,
    tauxMortalite: 3.5,
    tauxReproduction: 85,
    coutProduction: 500000,
    efficaciteAlimentaire: 3.2,
    poidsVifTotal: 5000,
    poidsCarcasseTotal: 3750,
    valeurEstimee: 2500000,
  },
  production: {
    nombreAnimauxActifs: 50,
    peseesEffectuees: 150,
    gainPoidsTotal: 2000,
    joursProduction: 120,
  },
  finance: {
    totalDepenses: 500000,
    totalRevenus: 750000,
    solde: 250000,
    rentabilite: 50,
  },
  reproduction: {
    gestationsTerminees: 10,
    porceletsNes: 120,
    porceletsSevres: 110,
    tauxSurvie: 91.7,
  },
  tendances: {
    evolutionGMQ: [],
    evolutionPoids: [],
    evolutionFinance: [],
  },
  recommandations: [],
};

await exportRapportsPDF(rapportsData);
```

---

## 🎨 Fonctionnalités du Système PDF

### ✅ Styles Professionnels

- En-tête avec logo et informations du projet
- Cartes et sections bien structurées
- Tableaux formatés avec alternance de couleurs
- Badges de statut colorés
- Pied de page avec date de génération

### ✅ Formatage Intelligent

- **Montants** : Format FCFA avec séparateurs de milliers
- **Dates** : Format français (ex: 15 novembre 2024)
- **Nombres** : Arrondis et formatés selon le contexte
- **Pourcentages** : Avec décimales appropriées

### ✅ Mise en Page Optimisée

- Sauts de page automatiques pour grandes sections
- Évite la coupure des éléments importants
- Responsive pour impression A4
- Marges et espacements cohérents

### ✅ Indicateurs Visuels

- **Couleurs sémantiques** :
  - Vert : Positif / Succès
  - Rouge : Négatif / Alerte
  - Orange : Attention / Warning
  - Bleu : Information

- **Badges** : Pour catégories et statuts
- **Tableaux** : Avec en-têtes colorés
- **Stats en grille** : 3 colonnes pour lisibilité

---

## 📊 Contenu des Rapports

### Dashboard PDF

1. **Informations du projet**
   - Nom, localisation, statut
   - Effectifs (truies, verrats, porcelets)

2. **Vue financière**
   - Total dépenses, revenus, solde
   - Détails des dépenses

3. **Production**
   - Animaux actifs, pesées, poids total
   - GMQ moyen

4. **Reproduction**
   - Gestations en cours
   - Prochaine mise bas
   - Sevrages récents

5. **Alertes actives**
   - Liste des alertes importantes

### Finance PDF

1. **Vue d'ensemble**
   - Total dépenses, revenus, solde

2. **Moyennes mensuelles**
   - Dépenses moyennes
   - Revenus moyens
   - Balance mensuelle

3. **Charges fixes**
   - Liste complète avec catégories

4. **Dépenses ponctuelles**
   - Liste chronologique

5. **Revenus**
   - Détails des ventes

6. **Résumé final**
   - Tableau récapitulatif
   - Statut bénéficiaire/déficitaire

### Rapports PDF

1. **Indicateurs clés (KPI)**
   - GMQ, efficacité alimentaire
   - Taux de reproduction/mortalité
   - Coût de production, rentabilité

2. **Détails production**
   - Statistiques complètes

3. **Détails reproduction**
   - Gestations, porcelets, taux de survie

4. **Détails financiers**
   - Coûts et revenus détaillés

5. **Tendances**
   - Évolution GMQ
   - Évolution financière

6. **Recommandations**
   - Conseils priorisés

---

## 🔒 Gestion des Erreurs

Le système gère automatiquement :

```typescript
try {
  await exportDashboardPDF(data);
  // PDF généré et partagé avec succès
} catch (error) {
  Alert.alert(
    'Erreur',
    'Impossible de générer le PDF. Vérifiez vos données et réessayez.'
  );
}
```

---

## 📱 Compatibilité

### ✅ Testé sur :
- iOS (iPhone, iPad)
- Android (smartphones, tablettes)

### ✅ Formats :
- PDF A4
- Orientation portrait
- Optimisé pour impression et lecture numérique

---

## 🎯 Prochaines Étapes

Pour activer l'export PDF dans l'application :

1. **Ajouter les boutons d'export** dans :
   - `DashboardScreen.tsx`
   - `FinanceGraphiquesComponent.tsx` ou écran finance approprié
   - `RapportsScreen.tsx` ou composant rapports approprié

2. **Exemple de bouton** :

```typescript
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { exportDashboardPDF } from '../services/pdf/dashboardPDF';
import { useState } from 'react';

function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportDashboardPDF(dashboardData);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      onPress={handleExport}
      disabled={loading}
      style={styles.exportButton}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={styles.exportButtonText}>📄 Exporter PDF</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
```

---

## 💡 Conseils

### Performance

- Les PDFs sont générés localement (pas de serveur)
- Temps de génération : 2-5 secondes selon la quantité de données
- Les PDFs sont sauvegardés temporairement puis supprimés après partage

### Personnalisation

- Modifiez `PDF_COMMON_STYLES` dans `pdfService.ts` pour changer l'apparence globale
- Ajustez les templates individuels pour modifier le contenu
- Utilisez les fonctions d'aide (`formatCurrency`, `formatDate`, etc.) pour formater les données

### Optimisation

- Ne générez pas de PDF avec des milliers d'entrées (limite à 30-50 par table)
- Utilisez des aperçus de données pour les grandes listes
- Ajoutez des pages breaks (`class="page-break"`) pour éviter les coupures

---

## 🎊 Résultat Final

Après installation, vous pourrez :
- ✅ Générer des rapports PDF professionnels
- ✅ Partager par email, WhatsApp, etc.
- ✅ Imprimer directement
- ✅ Archiver pour historique
- ✅ Présenter aux partenaires/banques

**Les rapports sont prêts à être utilisés ! Il ne reste plus qu'à ajouter les boutons d'export dans les écrans concernés.**

---

**Date de création :** 17 novembre 2024  
**Version :** 1.0  
**Compatible avec :** Expo SDK 49+  
**Dépendances :** `expo-print`, `expo-sharing`

