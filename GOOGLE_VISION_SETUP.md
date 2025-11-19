# 🔧 Configuration Google Cloud Vision API

## 📋 **Guide Complet d'Activation**

Ce guide vous explique comment activer **gratuitement** l'OCR réel avec Google Cloud Vision API.

---

## 🎯 **Pourquoi Google Cloud Vision ?**

- ✅ **1000 requêtes gratuites/mois** (largement suffisant)
- ✅ **95-98% de précision** sur l'OCR
- ✅ **Support du français** et FCFA
- ✅ **Détection de structure** (tableaux)
- ✅ **Très rapide** (2-3 secondes)

---

## 🚀 **Étape 1 : Créer un Compte Google Cloud**

### **1.1 Inscription**

1. Aller sur : https://console.cloud.google.com
2. Se connecter avec votre compte Google
3. Accepter les conditions d'utilisation
4. (Optionnel) Entrer les infos de facturation
   - ⚠️ Aucun frais si vous restez sous 1000 requêtes/mois
   - Carte bancaire requise mais non débitée

### **1.2 Créer un Projet**

1. Cliquer sur "Select a project" (en haut)
2. Cliquer sur "New Project"
3. Nom du projet : `fermier-pro-ocr`
4. Cliquer sur "Create"
5. Attendre 10-20 secondes

---

## ⚙️ **Étape 2 : Activer l'API Vision**

### **2.1 Activer l'API**

1. Dans la console, aller sur :
   ```
   APIs & Services > Library
   ```
2. Rechercher : `Cloud Vision API`
3. Cliquer sur "Cloud Vision API"
4. Cliquer sur "Enable" (Activer)
5. Attendre 30 secondes

### **2.2 Créer une Clé API**

1. Aller sur :
   ```
   APIs & Services > Credentials
   ```
2. Cliquer sur "Create Credentials"
3. Choisir "API Key"
4. Copier la clé générée (ex: `AIzaSyD...`)
5. **⚠️ IMPORTANT** : Noter cette clé en sécurité

### **2.3 Restreindre la Clé (Sécurité)**

1. Cliquer sur "Restrict Key"
2. Dans "API restrictions" :
   - Choisir "Restrict key"
   - Cocher "Cloud Vision API"
3. Dans "Application restrictions" :
   - Choisir "None" (pour mobile)
   - Ou "Android apps" / "iOS apps" (recommandé)
4. Sauvegarder

---

## 📦 **Étape 3 : Installation dans l'App**

### **3.1 Installer expo-file-system**

```bash
npx expo install expo-file-system
```

### **3.2 Créer le Fichier de Configuration**

Créer `src/config/googleVision.ts` :

```typescript
/**
 * Configuration Google Cloud Vision API
 */

export const GOOGLE_VISION_CONFIG = {
  // ⚠️ REMPLACER PAR VOTRE CLÉ API
  apiKey: 'AIzaSyD...VOTRE_CLE_ICI',
  
  // URL de l'API
  apiUrl: 'https://vision.googleapis.com/v1/images:annotate',
  
  // Limite mensuelle (1000 gratuit)
  monthlyLimit: 1000,
};

/**
 * Vérifie si la clé API est configurée
 */
export function isVisionAPIConfigured(): boolean {
  return GOOGLE_VISION_CONFIG.apiKey !== '' && 
         !GOOGLE_VISION_CONFIG.apiKey.includes('VOTRE_CLE');
}
```

### **3.3 Créer le Service OCR**

Créer `src/services/ocrService.ts` :

```typescript
/**
 * Service d'OCR via Google Cloud Vision API
 */

import * as FileSystem from 'expo-file-system';
import { GOOGLE_VISION_CONFIG, isVisionAPIConfigured } from '../config/googleVision';

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Extrait le texte d'une image via Google Cloud Vision API
 */
export async function extractTextFromImage(imageUri: string): Promise<OCRResult> {
  // Vérifier la configuration
  if (!isVisionAPIConfigured()) {
    throw new Error('Google Vision API non configurée. Veuillez ajouter votre clé API.');
  }

  try {
    // Convertir l'image en base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Préparer la requête
    const requestBody = {
      requests: [
        {
          image: {
            content: base64,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };

    // Appeler l'API
    const response = await fetch(
      `${GOOGLE_VISION_CONFIG.apiUrl}?key=${GOOGLE_VISION_CONFIG.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Vérifier la réponse
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Vision API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Extraire le texte
    const textAnnotation = data.responses[0]?.fullTextAnnotation;
    
    if (!textAnnotation || !textAnnotation.text) {
      return { text: '', confidence: 0 };
    }

    return {
      text: textAnnotation.text,
      confidence: calculateAverageConfidence(textAnnotation),
    };
  } catch (error) {
    console.error('Erreur OCR:', error);
    throw error;
  }
}

/**
 * Calcule la confiance moyenne de la détection
 */
function calculateAverageConfidence(textAnnotation: any): number {
  const pages = textAnnotation.pages || [];
  
  if (pages.length === 0) return 0;
  
  let totalConfidence = 0;
  let count = 0;
  
  for (const page of pages) {
    for (const block of page.blocks || []) {
      if (block.confidence) {
        totalConfidence += block.confidence;
        count++;
      }
    }
  }
  
  return count > 0 ? totalConfidence / count : 0;
}

/**
 * Teste la connexion à l'API
 */
export async function testGoogleVisionAPI(): Promise<boolean> {
  if (!isVisionAPIConfigured()) {
    return false;
  }

  try {
    // Créer une image de test simple (1x1 pixel blanc en base64)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const response = await fetch(
      `${GOOGLE_VISION_CONFIG.apiUrl}?key=${GOOGLE_VISION_CONFIG.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: testImage },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Test API échoué:', error);
    return false;
  }
}
```

---

## 🔄 **Étape 4 : Modifier PriceScannerModal**

Dans `src/components/PriceScannerModal.tsx` :

### **4.1 Importer le Service**

```typescript
import { extractTextFromImage, isVisionAPIConfigured } from '../services/ocrService';
import * as FileSystem from 'expo-file-system';
```

### **4.2 Remplacer la Fonction extractTextFromImage**

Remplacer la simulation (lignes 113-145) par :

```typescript
/**
 * Extrait le texte de l'image via OCR
 */
const extractTextFromImageOCR = async (uri: string) => {
  try {
    // Vérifier si l'API est configurée
    if (!isVisionAPIConfigured()) {
      Alert.alert(
        'Configuration manquante',
        'L\'API Google Vision n\'est pas configurée.\n\nVeuillez consulter GOOGLE_VISION_SETUP.md',
        [{ text: 'OK' }]
      );
      setScanning(false);
      return;
    }

    // Appeler l'API
    const result = await extractTextFromImage(uri);

    if (!result.text) {
      Alert.alert(
        'Aucun texte détecté',
        'Impossible de détecter du texte dans l\'image.\n\nAssurez-vous que le texte est net et lisible.',
        [{ text: 'OK' }]
      );
      setScanning(false);
      return;
    }

    // Parser le texte
    const prices = parseTextToPrices(result.text);

    if (prices.length === 0) {
      Alert.alert(
        'Aucun prix détecté',
        'Aucun prix n\'a pu être identifié dans le texte.\n\nVérifiez le format du tableau.',
        [{ text: 'OK' }]
      );
      setScanning(false);
      return;
    }

    setExtractedPrices(prices);
    setScanning(false);

    Alert.alert(
      '✅ Scan réussi',
      `${prices.length} prix détecté(s)\nConfiance moyenne : ${Math.round(result.confidence * 100)}%\n\nVérifiez et corrigez si nécessaire.`,
      [{ text: 'OK' }]
    );
  } catch (error: any) {
    console.error('Erreur OCR:', error);
    Alert.alert(
      'Erreur OCR',
      error.message || 'Impossible d\'extraire le texte de l\'image',
      [{ text: 'OK' }]
    );
    setScanning(false);
  }
};
```

### **4.3 Appeler la Nouvelle Fonction**

Dans `processImage`, ligne 107, remplacer par :

```typescript
await extractTextFromImageOCR(manipulatedImage.uri);
```

---

## 🧪 **Étape 5 : Tester**

### **5.1 Tester la Configuration**

Dans `src/components/IngredientsComponent.tsx`, ajouter un bouton de test :

```typescript
import { testGoogleVisionAPI } from '../services/ocrService';

// Dans le composant :
const handleTestAPI = async () => {
  Alert.alert('Test en cours...', 'Connexion à Google Cloud Vision...');
  
  const isWorking = await testGoogleVisionAPI();
  
  if (isWorking) {
    Alert.alert(
      '✅ API Configurée',
      'La connexion à Google Cloud Vision fonctionne correctement !',
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert(
      '❌ Erreur de Configuration',
      'Impossible de se connecter à l\'API.\n\nVérifiez votre clé API.',
      [{ text: 'OK' }]
    );
  }
};
```

### **5.2 Test Réel**

1. Prendre une photo d'un tableau de prix
2. Cliquer sur 📸 dans Ingrédients
3. Attendre 2-5 secondes
4. Vérifier les résultats

---

## 📊 **Étape 6 : Monitoring**

### **6.1 Suivre la Consommation**

Dans Google Cloud Console :
```
APIs & Services > Dashboard > Cloud Vision API
```

Vous verrez :
- Nombre de requêtes aujourd'hui
- Nombre de requêtes ce mois
- Graphique d'utilisation

### **6.2 Alertes (Optionnel)**

Pour être notifié si vous approchez de la limite :

1. Aller sur "Billing" > "Budgets & alerts"
2. Créer un budget : 0 € (gratuit)
3. Alerte à 80% de 1000 requêtes
4. Recevoir un email d'avertissement

---

## 🔒 **Sécurité**

### **⚠️ IMPORTANT : Protection de la Clé API**

**NE JAMAIS** :
- ❌ Committer la clé dans Git
- ❌ La partager publiquement
- ❌ L'envoyer par email

**À FAIRE** :
- ✅ Utiliser des variables d'environnement
- ✅ Ajouter `.env` au `.gitignore`
- ✅ Restreindre la clé dans Google Cloud

### **Configuration Sécurisée**

Créer `.env` :
```bash
GOOGLE_VISION_API_KEY=AIzaSyD...VOTRE_CLE_ICI
```

Modifier `src/config/googleVision.ts` :
```typescript
import Constants from 'expo-constants';

export const GOOGLE_VISION_CONFIG = {
  apiKey: Constants.expoConfig?.extra?.googleVisionApiKey || '',
  apiUrl: 'https://vision.googleapis.com/v1/images:annotate',
  monthlyLimit: 1000,
};
```

Modifier `app.json` :
```json
{
  "expo": {
    "extra": {
      "googleVisionApiKey": process.env.GOOGLE_VISION_API_KEY
    }
  }
}
```

---

## 💰 **Tarification**

### **Gratuit**
- ✅ 0-1000 requêtes/mois : **GRATUIT**

### **Payant** (si dépassement)
- 1001-5 000 000 : **1,50 $ / 1000 requêtes**
- 5 000 001-20 000 000 : **0,60 $ / 1000 requêtes**

### **Estimation pour Fermier Pro**
```
Utilisateur moyen :
- 1 scan/semaine × 4 semaines = 4 requêtes/mois
- Coût : GRATUIT (très loin de 1000)

Utilisateur intensif :
- 5 scans/semaine × 4 semaines = 20 requêtes/mois
- Coût : GRATUIT

Limite théorique :
- 1000 requêtes ÷ 30 jours = 33 scans/jour
- Amplement suffisant !
```

---

## 🎯 **Alternatives (si Quota Dépassé)**

### **1. Firebase ML Kit** (Gratuit illimité)

**Installation** :
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/ml
```

**Avantages** :
- Gratuit sans limite
- Fonctionne offline
- Bonne précision (85-90%)

**Inconvénients** :
- Configuration Firebase requise
- Moins précis que Google Vision

### **2. Tesseract.js** (Open Source)

**Installation** :
```bash
npm install tesseract.js
```

**Avantages** :
- Gratuit et open source
- Fonctionne offline
- Pas de dépendance externe

**Inconvénients** :
- Moins précis (70-80%)
- Plus lent

### **3. Microsoft Azure Computer Vision**

**Gratuit** :
- 5000 requêtes/mois gratuit

**Avantages** :
- Plus généreux que Google
- Très précis

**Inconvénients** :
- Configuration plus complexe

---

## 📝 **Checklist Finale**

Avant la mise en production :

- [ ] Compte Google Cloud créé
- [ ] Projet `fermier-pro-ocr` créé
- [ ] API Cloud Vision activée
- [ ] Clé API créée et notée
- [ ] Clé API restreinte (sécurité)
- [ ] `expo-file-system` installé
- [ ] `src/config/googleVision.ts` créé
- [ ] `src/services/ocrService.ts` créé
- [ ] Clé API ajoutée dans `.env`
- [ ] `.env` ajouté au `.gitignore`
- [ ] `PriceScannerModal.tsx` modifié
- [ ] Test réussi avec photo
- [ ] Monitoring activé

---

## 🆘 **Dépannage**

### **Erreur : "API key not valid"**

**Solution** :
1. Vérifier que la clé est correcte
2. Vérifier que l'API est activée
3. Attendre 5 minutes (propagation)

### **Erreur : "Permission denied"**

**Solution** :
1. Vérifier les restrictions de la clé
2. Supprimer les restrictions "HTTP referrers"
3. Laisser "None" ou "Android/iOS apps"

### **Erreur : "Quota exceeded"**

**Solution** :
1. Vérifier la consommation dans la console
2. Attendre le prochain mois
3. Ou passer à Firebase ML Kit (gratuit illimité)

### **Texte mal détecté**

**Solution** :
1. Améliorer la qualité de la photo
2. Meilleur éclairage
3. Texte plus net
4. Cadrage plus précis

---

## 🎉 **Félicitations !**

Votre scanner de prix est maintenant :
- ✅ **Opérationnel** avec OCR réel
- ✅ **Gratuit** (jusqu'à 1000/mois)
- ✅ **Précis** (95-98%)
- ✅ **Sécurisé** (clé restreinte)

**Prêt pour la production !** 🚀

---

**Date** : 17 novembre 2024  
**Auteur** : Assistant IA  
**Support** : GOOGLE_VISION_SETUP.md

