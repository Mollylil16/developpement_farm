# ⚡ Démarrage Rapide - Scanner de Prix

## 🎯 **En 3 Étapes**

### **1️⃣ Tester le Mode Démo** (5 minutes)

```bash
# Redémarrer l'app
npx expo start --clear
```

Puis :
1. Ouvrir l'app sur votre téléphone
2. Aller dans **Nutrition** > **Calculateur** > **Ingrédients**
3. Cliquer sur **📸** (en haut à droite)
4. Cliquer sur **"🖼️ Choisir une photo"** ou **"📷 Prendre une photo"**
5. L'app affiche 4 prix de démonstration
6. Vérifier, corriger, importer !

✅ **Résultat** : Vous comprenez comment ça marche

---

### **2️⃣ Activer l'OCR Réel** (15 minutes) - OPTIONNEL

**Étape A : Google Cloud**
1. Aller sur https://console.cloud.google.com
2. Créer un projet `fermier-pro-ocr`
3. Activer **Cloud Vision API**
4. Créer une **clé API**
5. Copier la clé

**Étape B : Configuration**
1. Ouvrir `src/config/googleVision.ts` (le créer)
2. Coller ce code :

```typescript
export const GOOGLE_VISION_CONFIG = {
  apiKey: 'AIzaSy...VOTRE_CLE_ICI',
  apiUrl: 'https://vision.googleapis.com/v1/images:annotate',
  monthlyLimit: 1000,
};
```

**Étape C : Service OCR**
1. Créer `src/services/ocrService.ts`
2. Copier le code depuis `GOOGLE_VISION_SETUP.md` (section 3.3)

**Étape D : Modifier PriceScannerModal**
1. Ouvrir `src/components/PriceScannerModal.tsx`
2. Importer :
```typescript
import { extractTextFromImage } from '../services/ocrService';
```
3. Ligne 113, remplacer la simulation par un vrai appel OCR (voir `GOOGLE_VISION_SETUP.md`)

✅ **Résultat** : OCR réel opérationnel !

---

### **3️⃣ Tester avec une Vraie Photo** (2 minutes)

1. Prendre une photo d'un tableau de prix (au moulin ou imprimé)
2. Scanner avec l'app
3. Vérifier les prix détectés
4. Corriger si nécessaire
5. Importer !

✅ **Résultat** : Ingrédients importés automatiquement

---

## 📸 **Format de Tableau Recommandé**

Pour un meilleur résultat OCR, le tableau doit être :

```
TABLEAU DES PRIX

Maïs grain .................... 15 000 FCFA/sac
Tourteau de soja .............. 22 500 FCFA/sac
Son de blé .................... 10 000 FCFA/sac
CMV porc ...................... 1 500 FCFA/kg
Lysine ........................ 2 500 FCFA/kg
```

**Caractéristiques** :
- ✅ Texte imprimé (pas manuscrit)
- ✅ Bonne luminosité
- ✅ Fond clair, texte foncé
- ✅ Format ligne par ligne
- ✅ Prix en fin de ligne

---

## 🎨 **Exemple d'Utilisation**

### **Scénario : Mise à Jour Mensuelle des Prix**

**Sans Scanner** (Méthode Manuelle) :
```
1. Noter les 15 prix sur papier (5 min)
2. Ouvrir l'app (1 min)
3. Créer 15 ingrédients un par un (15 min)
4. Vérifier (2 min)
───────────────────────────────────
Total : 23 minutes 😩
```

**Avec Scanner** :
```
1. Photo du tableau (10 sec)
2. Scanner dans l'app (5 sec)
3. Vérifier 2-3 corrections (2 min)
4. Importer (5 sec)
───────────────────────────────────
Total : 3 minutes 🚀
```

**💪 Gain : 87% de temps économisé !**

---

## 🎯 **Checklist de Test**

Testez ces scénarios :

### **Test 1 : Mode Démo**
- [ ] Ouvrir le scanner
- [ ] Voir les instructions
- [ ] Cliquer "Choisir une photo"
- [ ] Voir 4 prix de démo
- [ ] Modifier un prix
- [ ] Changer une unité (KG ↔ SAC)
- [ ] Supprimer un prix
- [ ] Importer
- [ ] Vérifier dans la liste des ingrédients

### **Test 2 : Capture Photo**
- [ ] Ouvrir le scanner
- [ ] Cliquer "Prendre une photo"
- [ ] Accepter les permissions
- [ ] Prendre une photo
- [ ] Voir la photo dans le scanner

### **Test 3 : OCR Réel** (si activé)
- [ ] Scanner un vrai tableau
- [ ] Vérifier les prix détectés
- [ ] Confirmer la précision (>90%)
- [ ] Corriger si besoin
- [ ] Importer

---

## 🆘 **Problèmes Courants**

### **1. "Permission refusée" (caméra/galerie)**

**Solution** :
- Aller dans **Paramètres** du téléphone
- **Applications** > **Fermier Pro**
- Activer **Caméra** et **Stockage**

### **2. "Aucun prix détecté"**

**Causes possibles** :
- Photo floue ou sombre
- Texte manuscrit
- Format non standard

**Solution** :
- Reprendre la photo avec meilleur éclairage
- S'assurer que le texte est net
- Utiliser un tableau imprimé

### **3. "API key not valid" (OCR réel)**

**Solution** :
- Vérifier la clé dans `googleVision.ts`
- Vérifier que l'API est activée
- Attendre 5 minutes (propagation)

---

## 📚 **Documentation Complète**

Si vous voulez plus de détails :

1. **`SCANNER_PRIX_DOCUMENTATION.md`**
   - Architecture technique
   - Fonctionnalités détaillées
   - Cas d'usage

2. **`GOOGLE_VISION_SETUP.md`**
   - Configuration Google Cloud
   - Activation OCR réel
   - Sécurité

3. **`SCANNER_PRIX_RECAP.md`**
   - Récapitulatif complet
   - État d'avancement

---

## 🎉 **Résultat Attendu**

Après ces 3 étapes :
- ✅ Scanner fonctionnel
- ✅ Interface intuitive
- ✅ Import automatique
- ✅ Gain de temps massif

**Prêt à scanner ! 📸🚀**

---

**Temps total : 5 min (démo) ou 20 min (OCR réel)**  
**Difficulté : Facile 🟢**  
**Support : Documentation complète fournie**

---

**Bon scan ! 🎉**

