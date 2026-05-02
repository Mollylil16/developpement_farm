# 📄 Guide : Générer le Rapport PDF de Validation

## 🎯 Objectif

Générer un rapport PDF complet avec :
- ✅ Taux de succès
- ⚡ Métriques en temps réel
- 🔍 Preuves concrètes de performance
- ⚠️ Identification des problèmes éventuels

## 🚀 Utilisation

### Option 1 : Depuis un composant React Native

```typescript
import React from 'react';
import { Button, Alert } from 'react-native';
import { generateValidationPDF } from '../services/chatAgent/tests/runValidation';
import { useAppSelector } from '../store/hooks';
import { PerformanceMonitor } from '../services/chatAgent/monitoring/PerformanceMonitor';

export function ValidationReportButton() {
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);
  
  // Créer le monitor si vous l'utilisez
  const monitor = new PerformanceMonitor();

  const handleGenerateReport = async () => {
    try {
      if (!projetActif || !user) {
        Alert.alert('Erreur', 'Projet ou utilisateur non trouvé');
        return;
      }

      const context = {
        projetId: projetActif.id,
        userId: user.id,
        userName: user.nom || user.email,
        currentDate: new Date().toISOString().split('T')[0],
      };

      await generateValidationPDF(context, monitor);
      Alert.alert('Succès', 'Rapport PDF généré ! Vous pouvez le partager.');
    } catch (error: any) {
      Alert.alert('Erreur', `Impossible de générer le rapport: ${error.message}`);
    }
  };

  return (
    <Button 
      title="📄 Générer Rapport PDF" 
      onPress={handleGenerateReport} 
    />
  );
}
```

### Option 2 : Depuis un écran dédié

```typescript
import React, { useState } from 'react';
import { View, Button, ActivityIndicator, Alert } from 'react-native';
import { generateValidationPDF } from '../services/chatAgent/tests/runValidation';
import { useAppSelector } from '../store/hooks';

export function ValidationReportScreen() {
  const [loading, setLoading] = useState(false);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);

  const generateReport = async () => {
    if (!projetActif || !user) {
      Alert.alert('Erreur', 'Projet ou utilisateur non trouvé');
      return;
    }

    setLoading(true);
    try {
      const context = {
        projetId: projetActif.id,
        userId: user.id,
        userName: user.nom || user.email,
        currentDate: new Date().toISOString().split('T')[0],
      };

      await generateValidationPDF(context);
      Alert.alert('Succès', 'Rapport PDF généré et prêt à être partagé !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button
        title={loading ? "Génération..." : "📄 Générer Rapport PDF"}
        onPress={generateReport}
        disabled={loading}
      />
      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
}
```

### Option 3 : Avec monitoring en temps réel

```typescript
import { ChatAgentService } from '../services/chatAgent/ChatAgentService';
import { PerformanceMonitor } from '../services/chatAgent/monitoring/PerformanceMonitor';
import { generateValidationPDF } from '../services/chatAgent/tests/runValidation';

// Dans votre composant ou service
const monitor = new PerformanceMonitor();

// Après chaque interaction avec l'agent
monitor.recordInteraction(userMessage, response, responseTime);

// Quand vous voulez générer le rapport
const context = {
  projetId: 'votre-projet-id',
  userId: 'votre-user-id',
  userName: 'Nom Utilisateur',
  currentDate: new Date().toISOString().split('T')[0],
};

await generateValidationPDF(context, monitor);
```

## 📋 Contenu du Rapport PDF

Le PDF généré contient :

### 1. En-tête
- Titre du rapport
- Date de génération
- Projet et utilisateur

### 2. Statut Global
- Badge de statut (EXCELLENT / BON / À AMÉLIORER)
- Taux de succès global
- Message de statut

### 3. Métriques Globales
- Tests totaux / réussis / échoués
- Taux de succès
- Confiance moyenne
- Temps d'exécution moyen

### 4. Métriques en Temps Réel (si disponible)
- Messages traités
- Détections réussies
- Confiance moyenne
- Temps de réponse
- Taux de succès extraction
- Taux de succès actions

### 5. Preuves Concrètes
- Taux de succès par catégorie (Détection, Extraction, Robustesse, Cas limites)
- Graphiques de performance
- Exemples de tests réussis avec détails

### 6. Identification des Problèmes
- Liste des tests échoués
- Erreurs détaillées
- Recommandations d'amélioration

### 7. Détails des Tests
- Tableau complet de tous les tests
- Statut, confiance, temps d'exécution
- Erreurs si présentes

### 8. Architecture Technique
- Système multi-niveaux
- Modèles utilisés
- Base de connaissances

## 📤 Partage du Rapport

Une fois généré, le PDF peut être :
- 📧 Envoyé par email
- 💬 Partagé via WhatsApp, Telegram, etc.
- ☁️ Sauvegardé dans le cloud
- 📱 Enregistré sur l'appareil

## 🎯 Exemple de Résultat

Le PDF contiendra des sections comme :

```
✅ STATUT: EXCELLENT - Agent opérationnel et performant à 100%

📊 MÉTRIQUES GLOBALES:
  Tests Totaux: 50
  Tests Réussis: 48
  Taux de Succès: 96.00%
  Confiance Moyenne: 94.50%

✅ PREUVES CONCRÈTES:
  Détection d'Intention: 95.0%
  Extraction de Paramètres: 93.3%
  Robustesse: 100.0%
```

## ⚠️ Prérequis

Assurez-vous que les dépendances sont installées :

```bash
npx expo install expo-print expo-sharing
```

## 🔧 Personnalisation

Vous pouvez personnaliser le rapport en modifiant `ValidationReportPDF.ts` :
- Styles CSS
- Sections supplémentaires
- Formatage des données
- Graphiques personnalisés

