# Synchronisation avec le Backend - Guide

## Vue d'ensemble

Le système d'IA de pesée peut maintenant **automatiquement récupérer le code, nom et poids des porcs** depuis votre base de données backend NestJS. Le système :

1. **Détecte** les porcs dans l'image avec YOLOv8
2. **Identifie** chaque porc via le système Re-ID (ré-identification visuelle)
3. **Récupère** automatiquement le code et nom depuis le backend
4. **Estime** le poids avec le modèle CNN

## Configuration

### 1. Fichier de configuration (`config/api_config.yaml`)

Ajoutez la section suivante :

```yaml
# Configuration backend NestJS pour synchronisation
backend:
  url: "http://localhost:3000"  # URL du backend NestJS
  api_key: null  # Clé API optionnelle (depuis .env)
  default_projet_id: null  # ID du projet par défaut (optionnel)
  default_user_id: null  # ID de l'utilisateur par défaut (optionnel)
  sync_on_startup: true  # Synchroniser les animaux au démarrage
  sync_interval_minutes: 60  # Intervalle de synchronisation automatique
```

### 2. Variables d'environnement (optionnel)

Si vous utilisez une clé API pour l'authentification :

```env
BACKEND_API_KEY=votre_cle_api
```

## Fonctionnement

### Synchronisation automatique

Au démarrage du serveur Python, le système :

1. Charge tous les animaux depuis l'API backend (`/production/animaux`)
2. Enregistre chaque animal dans le système Re-ID avec ses métadonnées :
   - `code` : Code de l'animal
   - `name` : Nom de l'animal
   - `animal_id` : ID unique dans la base de données
   - Autres métadonnées (sexe, race, etc.)

### Processus de détection

Lorsqu'une image est traitée :

1. **Détection** : YOLOv8 détecte tous les porcs dans l'image
2. **Ré-identification** : Le système Re-ID essaie d'identifier chaque porc détecté
3. **Récupération métadonnées** : Si un porc est identifié, ses métadonnées (code, nom) sont récupérées depuis le backend
4. **Estimation poids** : Le poids est estimé avec le modèle CNN
5. **Résultat** : Retourne pour chaque porc :
   - Code
   - Nom
   - Poids estimé
   - Confiance

## Utilisation via l'API

### Prédiction individuelle

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image",
    "projet_id": "uuid-du-projet",
    "user_id": "uuid-de-l-utilisateur"
  }'
```

### Prédiction groupe

```bash
curl -X POST http://localhost:8000/api/batch-predict \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image",
    "projet_id": "uuid-du-projet",
    "user_id": "uuid-de-l-utilisateur"
  }'
```

## Format de réponse

### Prédiction individuelle

```json
{
  "success": true,
  "pig_id": "uuid-123",
  "code": "PORC001",
  "name": "ELLA",
  "detection": {
    "bbox": [100, 200, 300, 400],
    "confidence": 0.95
  },
  "weight_estimation": {
    "weight_kg": 25.3,
    "confidence": 0.94,
    "method": "cnn",
    "interval": {
      "lower": 24.1,
      "upper": 26.5,
      "margin": 1.2
    }
  }
}
```

### Prédiction groupe

```json
{
  "success": true,
  "total_detected": 3,
  "predictions": [
    {
      "pig_id": "uuid-1",
      "code": "PORC001",
      "name": "ELLA",
      "weight_kg": 25.3,
      "confidence": 0.94,
      "bbox": [100, 200, 300, 400],
      "interval": {
        "lower": 24.1,
        "upper": 26.5,
        "margin": 1.2
      }
    },
    {
      "pig_id": "uuid-2",
      "code": "PORC002",
      "name": "MAX",
      "weight_kg": 28.7,
      "confidence": 0.92,
      "bbox": [400, 200, 600, 400],
      "interval": {
        "lower": 27.2,
        "upper": 30.2,
        "margin": 1.5
      }
    }
  ]
}
```

## Format d'affichage

Le système formate automatiquement les résultats selon :

```
PORC #PORC001 | Nom: ELLA | Poids: 25.3kg ±1.2kg | Confiance: 94%
```

## Synchronisation manuelle

Vous pouvez forcer une synchronisation depuis le backend :

```python
from inference.backend_sync import BackendSync
from inference.reid import PigReID

# Initialiser
sync = BackendSync()
reid = PigReID()

# Synchroniser
count = sync.sync_animals_to_reid(reid, projet_id="uuid", user_id="uuid")
print(f"{count} animaux synchronisés")
```

## Notes importantes

1. **Première détection** : Lors de la première détection d'un animal, le système Re-ID doit avoir une image de référence. Si l'animal n'a pas encore été enregistré avec une image, le système récupérera quand même ses métadonnées (code, nom) depuis le backend, mais l'identification visuelle ne sera pas possible.

2. **Entraînement Re-ID** : Pour une identification visuelle précise, il faut entraîner le modèle Re-ID avec des images de chaque animal. Le système peut fonctionner sans cela, mais l'identification sera moins précise.

3. **Synchronisation** : La synchronisation se fait automatiquement au démarrage et peut être déclenchée manuellement ou à intervalles réguliers.

4. **Performance** : La synchronisation initiale peut prendre quelques secondes si vous avez beaucoup d'animaux. Les synchronisations suivantes sont plus rapides car seuls les animaux modifiés sont mis à jour.

## Dépannage

### Les animaux ne sont pas synchronisés

- Vérifiez que le backend NestJS est accessible à l'URL configurée
- Vérifiez les logs pour voir les erreurs de synchronisation
- Vérifiez que `projet_id` et `user_id` sont corrects

### Les métadonnées (code, nom) ne sont pas récupérées

- Vérifiez que l'animal existe dans la base de données backend
- Vérifiez que l'API `/production/animaux/{animal_id}` fonctionne
- Vérifiez les logs pour voir les erreurs de récupération

### L'identification visuelle ne fonctionne pas

- Le système Re-ID nécessite des images d'entraînement pour chaque animal
- Si un animal n'a pas encore été enregistré avec une image, l'identification visuelle ne sera pas possible
- Les métadonnées (code, nom) seront quand même récupérées depuis le backend si l'animal est dans la base de données

