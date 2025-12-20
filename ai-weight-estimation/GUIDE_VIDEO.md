# Guide - Traitement Vidéo pour la Pesée IA

## 🎥 Support Vidéo

L'IA peut maintenant traiter des **vidéos** pour peser automatiquement tous les porcs qui apparaissent dans la vidéo, même avec des mouvements multiples.

## 🔄 Comment ça fonctionne

### 1. **Détection Frame par Frame**
- L'IA analyse chaque frame de la vidéo (ou toutes les N frames pour performance)
- Détecte tous les porcs présents dans chaque frame

### 2. **Tracking Multi-Objets**
- Utilise un système de **tracking** pour suivre chaque porc individuellement
- Même si les porcs bougent, se croisent, ou sortent/rentrent du champ, l'IA les suit
- Chaque porc reçoit un **track_id** unique qui persiste dans toute la vidéo

### 3. **Identification des Porcs**
- Pour chaque porc suivi, l'IA essaie de l'identifier (code, nom)
- Si le porc est déjà enregistré, l'IA le reconnaît automatiquement
- Si non identifié, l'IA propose une liste d'animaux possibles

### 4. **Estimation de Poids**
- Pour chaque frame où un porc est détecté, l'IA estime son poids
- Les poids sont agrégés sur toute la vidéo pour donner une estimation moyenne plus précise
- Réduit les erreurs dues aux angles, mouvements, etc.

### 5. **Résultats Finaux**
- Pour chaque porc suivi dans la vidéo :
  - Code et nom (si identifié)
  - Poids moyen estimé
  - Poids min/max observés
  - Nombre de détections
  - Durée de présence dans la vidéo

## 📊 Format de Réponse Vidéo

```json
{
  "success": true,
  "mode": "video",
  "total_frames_processed": 1500,
  "total_tracks": 5,
  "pigs": [
    {
      "track_id": 0,
      "pig_id": "uuid-123",
      "code": "PORC003",
      "name": "Anna",
      "weight_kg": 25.3,
      "weight_min": 24.8,
      "weight_max": 25.7,
      "weight_std": 0.3,
      "detections_count": 45,
      "duration_seconds": 12.5,
      "identified": true
    },
    {
      "track_id": 1,
      "pig_id": null,
      "code": "TRACK_1",
      "name": "",
      "weight_kg": 28.1,
      "weight_min": 27.5,
      "weight_max": 28.6,
      "weight_std": 0.4,
      "detections_count": 38,
      "duration_seconds": 10.2,
      "identified": false
    }
  ],
  "summary": {
    "total_pigs": 5,
    "total_weight_kg": 125.5,
    "average_weight_kg": 25.1,
    "min_weight_kg": 22.3,
    "max_weight_kg": 28.6
  }
}
```

## 🚀 Utilisation

### Depuis l'API

```python
# Traiter une vidéo
result = pipeline.predict_video(
    video_path="chemin/vers/video.mp4",
    projet_id="uuid-projet",
    user_id="uuid-user",
    frame_skip=5,  # Traiter 1 frame sur 6 (pour performance)
    output_path="chemin/vers/video_annotee.mp4"  # Optionnel
)
```

### Depuis React Native

```typescript
// L'utilisateur enregistre une vidéo
const videoUri = await recordVideo();

// Convertir la vidéo en base64 ou l'envoyer directement
const formData = new FormData();
formData.append('video', {
  uri: videoUri,
  type: 'video/mp4',
  name: 'pesee.mp4',
});

// Envoyer à l'API backend NestJS qui appelle l'IA
const response = await apiClient.post('/ai-weight/video-predict', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  params: {
    projet_id: projetId,
    user_id: userId,
  },
});
```

## ⚙️ Configuration

Dans `config/api_config.yaml` :

```yaml
inference:
  tracking:
    max_age: 30        # Frames avant de perdre une track
    min_hits: 3        # Frames minimum pour confirmer une track
    iou_threshold: 0.3  # Seuil IoU pour associer les détections
  video:
    frame_skip: 5      # Traiter 1 frame sur 6 (par défaut)
    fps: 30            # FPS de la vidéo
```

## 💡 Avantages du Traitement Vidéo

1. **Précision améliorée** : Plusieurs estimations de poids sont moyennées
2. **Robustesse** : Les erreurs d'une frame sont compensées par les autres
3. **Suivi continu** : Même si un porc bouge, il est suivi
4. **Pesée de groupe** : Plusieurs porcs peuvent être pesés en même temps
5. **Automatisation** : Pas besoin de prendre plusieurs photos

## 🎯 Cas d'Usage

### Scénario 1 : Pesée d'un groupe de porcs
- L'utilisateur filme un groupe de porcs qui bougent
- L'IA détecte, suit et pèse chaque porc individuellement
- Résultat : Liste de tous les porcs avec leurs poids

### Scénario 2 : Pesée continue
- L'utilisateur filme pendant plusieurs minutes
- Les porcs entrent et sortent du champ de vision
- L'IA suit chaque porc et pèse ceux qui sont présents assez longtemps

### Scénario 3 : Amélioration de précision
- Pour un porc spécifique, l'utilisateur filme plusieurs secondes
- L'IA fait plusieurs estimations et calcule la moyenne
- Résultat plus précis qu'une seule photo

## 🔧 Entraînement avec Vidéos

### Pour améliorer la détection
- Vous pouvez utiliser des vidéos pour extraire des frames d'entraînement
- Plus de données = meilleure détection

### Pour améliorer le tracking
- Le système de tracking s'améliore avec l'usage
- Plus vous utilisez le système, plus il devient précis

## 📝 Notes Importantes

1. **Performance** : Traiter toutes les frames peut être lent. Utilisez `frame_skip` pour accélérer.

2. **Mémoire** : Les vidéos longues peuvent consommer beaucoup de mémoire. Traitez par segments si nécessaire.

3. **Qualité** : Une vidéo de bonne qualité (résolution, éclairage) donne de meilleurs résultats.

4. **Durée minimale** : Pour une identification fiable, un porc doit être visible au moins 3 frames (selon `min_hits`).

