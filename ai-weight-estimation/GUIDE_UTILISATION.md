# Guide d'Utilisation - IA de Pesée Automatique

## 🎯 Objectif

L'IA permet aux utilisateurs de votre application de **peser automatiquement leurs animaux** en prenant simplement une photo. L'IA détecte le porc, l'identifie (code, nom) et estime son poids.

## 📋 Fonctionnement

### Scénario 1 : Premier pesage d'un animal

1. **L'utilisateur prend une photo** du porc
2. **L'IA détecte** le porc dans l'image
3. **L'IA ne peut pas l'identifier** (pas encore d'image de référence)
4. **L'utilisateur sélectionne** l'animal dans une liste proposée
5. **L'IA enregistre automatiquement** l'image du porc pour identification future
6. **L'IA retourne** : Code, Nom, Poids estimé

### Scénario 2 : Pesage d'un animal déjà enregistré

1. **L'utilisateur prend une photo** du porc
2. **L'IA détecte** le porc dans l'image
3. **L'IA identifie automatiquement** le porc (grâce à l'image de référence)
4. **L'IA récupère** le code et nom depuis le backend
5. **L'IA retourne** : Code, Nom, Poids estimé

## 🔧 Configuration

### 1. Modifier `config/api_config.yaml`

```yaml
backend:
  url: "http://localhost:3000"  # URL de votre backend NestJS
  # Si votre backend est sur un autre port ou serveur, modifiez cette URL
  # Exemple production: "https://api.votre-domaine.com"
```

### 2. Variables d'environnement (optionnel)

Si votre backend nécessite une authentification :

```bash
export BACKEND_API_KEY="votre_cle_api"
```

Ou créez un fichier `.env` dans `ai-weight-estimation/` :

```env
BACKEND_API_KEY=votre_cle_api
```

## 📱 Utilisation depuis l'application React Native

### Exemple de code

```typescript
import { aiWeightService } from './services/aiWeightService';

// Prendre une photo et peser un animal
async function peserAnimal(imageUri: string, projetId: string, userId: string) {
  try {
    // Convertir l'image en base64
    const base64Image = await convertImageToBase64(imageUri);
    
    // Appeler l'IA
    const result = await aiWeightService.batchPredictWeight({
      image: base64Image,
      projet_id: projetId,
      user_id: userId
    });
    
    if (result.success) {
      // Afficher les résultats
      result.predictions.forEach(prediction => {
        console.log(`
          Code: ${prediction.code}
          Nom: ${prediction.name}
          Poids: ${prediction.weight_kg} kg
          Confiance: ${(prediction.confidence * 100).toFixed(0)}%
        `);
      });
      
      // Si un porc n'est pas identifié, proposer la sélection
      result.predictions.forEach(prediction => {
        if (!prediction.identified && prediction.possible_animals) {
          // Afficher une liste de sélection à l'utilisateur
          showAnimalSelectionDialog(prediction.possible_animals);
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors de la pesée:', error);
  }
}

// Enregistrer un animal pour identification future
async function enregistrerAnimal(
  imageUri: string, 
  animalId: string, 
  projetId: string, 
  userId: string
) {
  try {
    const base64Image = await convertImageToBase64(imageUri);
    
    // Appeler l'IA avec l'ID de l'animal pour enregistrement
    await aiWeightService.predictWeight({
      image: base64Image,
      pig_id: animalId,  // Important : fournir l'ID pour enregistrement
      projet_id: projetId,
      user_id: userId,
      auto_register: true  // Enregistrer automatiquement
    });
    
    console.log('Animal enregistré avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
  }
}
```

## 📊 Format de réponse

### Porc identifié

```json
{
  "success": true,
  "predictions": [
    {
      "pig_id": "uuid-123",
      "code": "PORC003",
      "name": "Anna",
      "weight_kg": 25.3,
      "confidence": 0.94,
      "identified": true,
      "bbox": [100, 200, 300, 400],
      "weight_estimation": {
        "weight_kg": 25.3,
        "confidence": 0.94,
        "interval": {
          "lower": 24.1,
          "upper": 26.5,
          "margin": 1.2
        }
      }
    }
  ]
}
```

### Porc non identifié (avec suggestions)

```json
{
  "success": true,
  "predictions": [
    {
      "pig_id": null,
      "code": "NON_IDENTIFIE",
      "name": "",
      "weight_kg": 25.3,
      "confidence": 0.94,
      "identified": false,
      "possible_animals": [
        {
          "id": "uuid-123",
          "code": "PORC003",
          "name": "Anna",
          "categorie": "porc_croissance"
        },
        {
          "id": "uuid-456",
          "code": "PORC004",
          "name": "Max",
          "categorie": "porc_croissance"
        }
      ],
      "suggested_animal": {
        "animal_id": "uuid-123",
        "code": "PORC003",
        "name": "Anna",
        "similarity": 0.65
      }
    }
  ]
}
```

## 🚀 Démarrage

1. **Démarrer le backend NestJS** (port 3000)
2. **Démarrer le serveur Python** :
   ```bash
   cd ai-weight-estimation
   python -m api.server
   ```
3. **Vérifier la santé** :
   ```bash
   curl http://localhost:8000/api/health
   ```

## 💡 Conseils d'utilisation

1. **Première pesée** : Prenez une photo claire du porc, puis sélectionnez l'animal dans la liste proposée. L'IA l'enregistrera pour les prochaines fois.

2. **Photos optimales** :
   - Bon éclairage
   - Porc bien visible (pas trop loin, pas trop près)
   - Angle de vue latéral ou 3/4
   - Porc debout ou en mouvement normal

3. **Amélioration de l'identification** : Plus vous pesez un animal, plus l'IA devient précise dans son identification.

4. **Enregistrement manuel** : Si l'IA ne peut pas identifier un animal, vous pouvez manuellement associer la photo à un animal pour l'enregistrer.

## 🔍 Dépannage

### L'IA ne détecte pas de porc
- Vérifiez que la photo est claire
- Assurez-vous que le porc est bien visible
- Vérifiez que le modèle YOLOv8 est bien chargé

### L'IA ne peut pas identifier le porc
- C'est normal pour la première pesée
- Sélectionnez l'animal dans la liste proposée
- L'IA l'enregistrera pour les prochaines fois

### Les métadonnées (code, nom) ne sont pas récupérées
- Vérifiez que `projet_id` et `user_id` sont corrects
- Vérifiez que le backend est accessible
- Vérifiez les logs pour voir les erreurs

### L'estimation de poids est incorrecte
- Le modèle d'estimation de poids doit être entraîné avec vos données
- Utilisez des marqueurs ArUco pour améliorer la précision
- Vérifiez les conditions de capture (éclairage, angle, etc.)

