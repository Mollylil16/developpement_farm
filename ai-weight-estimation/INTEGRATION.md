# Guide d'Intégration - IA de Pesée

Ce document explique comment intégrer l'IA de pesée avec le backend NestJS et le frontend React Native.

## Architecture

```
┌─────────────────┐
│  React Native   │
│   (Mobile App)  │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  NestJS Backend │
│   (Port 3000)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  FastAPI Server │
│   (Port 8000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IA Pipeline    │
│  (Python)       │
└─────────────────┘
```

## Configuration

### 1. Backend NestJS

Le module `AiWeightModule` a été ajouté à `app.module.ts`.

**Variables d'environnement** (`.env` dans `backend/`):
```env
AI_API_URL=http://localhost:8000
```

**Endpoints disponibles**:
- `GET /ai-weight/health` - Vérification de santé
- `POST /ai-weight/predict` - Prédiction individuelle
- `POST /ai-weight/batch-predict` - Prédiction groupe
- `GET /ai-weight/models` - Informations sur les modèles

### 2. Service Python (FastAPI)

**Démarrer le serveur**:
```bash
cd ai-weight-estimation
python -m api.server
```

Ou avec uvicorn:
```bash
uvicorn api.server:app --host 0.0.0.0 --port 8000
```

**Configuration** (`config/api_config.yaml`):
```yaml
api:
  server:
    host: "0.0.0.0"
    port: 8000
```

### 3. Frontend React Native

**Service** (`src/services/aiWeightService.ts`):
```typescript
import aiWeightService from './services/aiWeightService';

// Prédiction individuelle
const result = await aiWeightService.predictWeight({
  image: base64Image,
  pig_id: 'uuid-123',
});

// Prédiction groupe
const batchResult = await aiWeightService.batchPredictWeight({
  image: base64Image,
  expected_pigs: ['uuid-1', 'uuid-2'],
});
```

**Composants disponibles**:
- `CameraWeightCapture` - Capture d'image pour pesée
- `WeightResultDisplay` - Affichage des résultats

## Format des Réponses

### Prédiction Individuelle

```json
{
  "success": true,
  "pig_id": "uuid-123",
  "detection": {
    "bbox": [100, 200, 300, 400],
    "confidence": 0.95
  },
  "weight_estimation": {
    "weight_kg": 25.3,
    "confidence": 0.94,
    "method": "ensemble",
    "interval": {
      "lower": 24.1,
      "upper": 26.5,
      "margin": 1.2
    }
  },
  "warnings": [],
  "processing_time_ms": 1200
}
```

### Prédiction Groupe

```json
{
  "success": true,
  "total_detected": 3,
  "predictions": [
    {
      "pig_id": "uuid-1",
      "name": "ELLA",
      "weight_kg": 25.3,
      "confidence": 0.94,
      "bbox": [100, 200, 300, 400],
      "interval": {
        "lower": 24.1,
        "upper": 26.5,
        "margin": 1.2
      }
    }
  ],
  "unidentified": ["uuid-4"],
  "processing_time_ms": 2500
}
```

## Format d'Affichage

Selon le README, le format d'affichage est:
```
PORC #001 | Nom: ELLA | Poids: 25.3kg ±1.2kg | Confiance: 94%
```

Le composant `WeightResultDisplay` formate automatiquement les résultats selon ce format.

## Dépendances

### Backend NestJS
- `@nestjs/axios` - Pour les requêtes HTTP vers le service Python

### Frontend React Native
- `expo-camera` - Pour la capture d'images
- `expo-file-system` - Pour la conversion base64 (optionnel)

### Service Python
- Voir `requirements.txt` dans `ai-weight-estimation/`

## Tests

### Tester le service Python
```bash
curl http://localhost:8000/api/health
```

### Tester via NestJS
```bash
curl http://localhost:3000/ai-weight/health
```

### Tester depuis React Native
```typescript
const health = await aiWeightService.checkHealth();
console.log(health);
```

## Dépannage

### Service IA non disponible
- Vérifier que le serveur Python est démarré sur le port 8000
- Vérifier la variable `AI_API_URL` dans `.env`

### Erreurs de permission caméra
- Vérifier les permissions dans `AndroidManifest.xml` (Android)
- Vérifier les permissions dans `Info.plist` (iOS)

### Erreurs de conversion base64
- Vérifier que l'image est valide
- Vérifier que `expo-file-system` est installé

