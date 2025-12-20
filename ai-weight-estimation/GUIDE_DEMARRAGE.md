# Guide de Démarrage - IA de Pesée Automatique

## 🚀 Installation

### 1. Prérequis

- Python 3.8 ou supérieur
- pip
- Git

### 2. Installation des dépendances

```bash
cd ai-weight-estimation
pip install -r requirements.txt
```

### 3. Structure des dossiers

La structure de base est déjà créée. Vérifiez que tous les dossiers existent :

```
ai-weight-estimation/
├── models/          # Modèles pré-entraînés
├── data/            # Données d'entraînement
├── training/        # Scripts d'entraînement
├── inference/       # Code d'inférence
├── api/             # API FastAPI
└── config/          # Configuration
```

## 📊 Préparation des Données

### 1. Organiser les données

```bash
python scripts/prepare_data.py
```

Cela créera :
- Les templates d'annotations
- Les fichiers CSV d'exemple
- La structure YOLO

### 2. Ajouter vos images

Placez vos images de porcs dans :
- `data/images/train/` pour l'entraînement
- `data/images/val/` pour la validation

### 3. Annoter les images

Vous devez créer 3 types d'annotations :

#### a) Détection (YOLO)
Format : Fichiers `.txt` avec une ligne par objet
```
class_id x_center y_center width height
```
Toutes les coordonnées sont normalisées (0-1).

#### b) Ré-identification (CSV)
Fichier : `data/annotations/train_reid.csv`
Colonnes : `image_path, bbox_x1, bbox_y1, bbox_x2, bbox_y2, pig_id, code, name`

Exemple :
```csv
image_path,bbox_x1,bbox_y1,bbox_x2,bbox_y2,pig_id,code,name
train/pig001.jpg,100,150,400,450,PORC001,PORC001,ELLA
```

#### c) Estimation de poids (CSV)
Fichier : `data/annotations/train_weights.csv`
Colonnes : `image_path, bbox_x1, bbox_y1, bbox_x2, bbox_y2, weight_kg`

Exemple :
```csv
image_path,bbox_x1,bbox_y1,bbox_x2,bbox_y2,weight_kg
train/pig001.jpg,100,150,400,450,25.5
```

## 🎓 Entraînement des Modèles

### 1. Détection (YOLOv8)

```bash
python training/train_detection.py
```

Le modèle sera sauvegardé dans `models/detection/yolov8n_pig.pt`

### 2. Ré-identification

```bash
python training/train_reid.py
```

Le modèle sera sauvegardé dans `models/reid/pig_reid_resnet50.pt`

### 3. Estimation de poids

```bash
python training/train_weight_estimation.py
```

Le modèle sera sauvegardé dans `models/weight/weight_estimation_cnn.pt`

## 🧪 Test du Pipeline

### Test simple

```bash
python scripts/test_pipeline.py
```

### Test avec votre propre image

```python
from inference.pipeline import WeightEstimationPipeline

# Initialiser
pipeline = WeightEstimationPipeline()

# Traiter une image
result = pipeline.process_image("path/to/your/image.jpg", mode='group')

# Afficher les résultats
print(pipeline.format_output(result))
```

## 🌐 API FastAPI

### Démarrer le serveur

```bash
cd api
python main.py
```

L'API sera accessible sur `http://localhost:8000`

### Endpoints disponibles

- `POST /api/weight-estimation/image` - Traiter une image
- `POST /api/weight-estimation/video` - Traiter une vidéo
- `POST /api/pigs/register` - Enregistrer un nouveau porc

### Exemple d'utilisation (curl)

```bash
curl -X POST "http://localhost:8000/api/weight-estimation/image" \
  -F "file=@path/to/image.jpg" \
  -F "mode=group"
```

## 📱 Intégration avec React Native

### 1. Installer les dépendances

Dans votre projet React Native :

```bash
npm install react-native-image-picker react-native-camera
```

### 2. Créer un service API

```typescript
// src/services/weightEstimationService.ts
import apiClient from './api/apiClient';

export async function estimateWeightFromImage(
  imageUri: string,
  mode: 'individual' | 'group' = 'group'
) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  formData.append('mode', mode);

  const response = await apiClient.post('/api/weight-estimation/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
```

### 3. Utiliser dans un composant

```typescript
import { estimateWeightFromImage } from '../services/weightEstimationService';
import { launchImageLibrary } from 'react-native-image-picker';

const handleWeightEstimation = async () => {
  const result = await launchImageLibrary({ mediaType: 'photo' });
  
  if (result.assets && result.assets[0]) {
    const estimation = await estimateWeightFromImage(
      result.assets[0].uri!,
      'group'
    );
    
    console.log('Résultats:', estimation.formatted_output);
  }
};
```

## 🎯 Prochaines Étapes

1. **Collecter des données** : Plus vous avez d'images annotées, meilleur sera le modèle
2. **Entraîner les modèles** : Commencez avec un petit dataset, puis augmentez
3. **Valider les résultats** : Testez sur des images de validation
4. **Optimiser** : Ajustez les hyperparamètres selon vos résultats
5. **Déployer** : Intégrez dans votre application mobile

## 📚 Ressources

- [Documentation YOLOv8](https://docs.ultralytics.com/)
- [PyTorch Documentation](https://pytorch.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## ⚠️ Notes Importantes

- La précision dépend fortement de la qualité et de la quantité des données d'entraînement
- Pour une marge d'erreur < 0.5%, vous aurez besoin d'un dataset conséquent (minimum 1000+ images)
- Les modèles pré-entraînés sur COCO peuvent être utilisés comme point de départ
- L'entraînement peut prendre plusieurs heures selon votre hardware

## 🐛 Dépannage

### Erreur : "Model not found"
- Vérifiez que les modèles sont bien entraînés et dans les bons dossiers
- Utilisez les chemins relatifs depuis le dossier `ai-weight-estimation`

### Erreur : "CUDA out of memory"
- Réduisez la taille du batch dans `config/config.yaml`
- Utilisez un modèle plus petit (yolov8n au lieu de yolov8m)

### Erreur : "No module named 'ultralytics'"
- Réinstallez les dépendances : `pip install -r requirements.txt`

