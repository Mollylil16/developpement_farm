"""
Serveur FastAPI pour l'IA de pesée - Selon spécifications README
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal
import uvicorn
import yaml
import base64
import cv2
import numpy as np
from pathlib import Path
import sys
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Ajouter le répertoire parent au path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from inference.predict import WeightEstimationPipeline
except ImportError:
    # Fallback vers l'ancien pipeline si predict.py n'existe pas encore
    from inference.pipeline import WeightEstimationPipeline

# Charger la configuration
with open("config/api_config.yaml", 'r') as f:
    api_config = yaml.safe_load(f)

app = FastAPI(
    title="IA de Pesée Automatique des Porcs",
    version="3.0.1",
    description="API pour l'estimation automatique du poids des porcs par vision par ordinateur"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=api_config['api']['cors']['allowed_origins'],
    allow_credentials=True,
    allow_methods=api_config['api']['cors']['allowed_methods'],
    allow_headers=api_config['api']['cors']['allowed_headers'],
)

# Initialiser le pipeline (chargé une seule fois)
pipeline = None

@app.on_event("startup")
async def startup_event():
    """Initialise le pipeline au démarrage"""
    global pipeline
    print("Initialisation du pipeline d'IA...")
    try:
        pipeline = WeightEstimationPipeline()
        print("✅ Pipeline initialisé avec succès!")
        
        # Synchroniser les animaux depuis le backend si configuré
        if pipeline.backend_sync and api_config.get('backend', {}).get('sync_on_startup', True):
            try:
                projet_id = api_config.get('backend', {}).get('default_projet_id')
                user_id = api_config.get('backend', {}).get('default_user_id')
                if pipeline.reid:
                    count = pipeline.backend_sync.sync_animals_to_reid(
                        pipeline.reid, projet_id, user_id
                    )
                    print(f"✅ {count} animaux synchronisés depuis le backend")
            except Exception as e:
                print(f"⚠️  Erreur lors de la synchronisation initiale: {e}")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        raise

# Modèles Pydantic pour validation
class PredictRequest(BaseModel):
    image: str = Field(..., description="Image encodée en base64")
    pig_id: Optional[str] = Field(None, description="ID du porc (mode individuel) - si fourni, enregistre automatiquement le porc")
    metadata: Optional[Dict] = Field(None, description="Métadonnées (race, âge, conditions)")
    projet_id: Optional[str] = Field(..., description="ID du projet (obligatoire pour identification)")
    user_id: Optional[str] = Field(..., description="ID de l'utilisateur (obligatoire pour identification)")
    auto_register: Optional[bool] = Field(True, description="Enregistrer automatiquement le porc si pig_id fourni")

class BatchPredictRequest(BaseModel):
    image: str = Field(..., description="Image encodée en base64")
    expected_pigs: Optional[List[str]] = Field(None, description="IDs des porcs attendus")
    metadata: Optional[Dict] = Field(None, description="Métadonnées")
    projet_id: Optional[str] = Field(None, description="ID du projet (pour synchronisation backend)")
    user_id: Optional[str] = Field(None, description="ID de l'utilisateur (pour synchronisation backend)")

# Fonction helper pour décoder base64
def decode_base64_image(base64_string: str) -> np.ndarray:
    """Décode une image base64 en numpy array"""
    try:
        # Enlever le préfixe si présent
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Impossible de décoder l'image")
        
        return image
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur décodage image: {str(e)}")

# Endpoints

@app.get("/")
async def root():
    """Endpoint racine"""
    return {
        "service": "IA de Pesée Automatique des Porcs",
        "version": "3.0.1",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    """
    Vérification de santé du service
    
    Returns:
        Status du service et des modèles
    """
    global pipeline
    
    models_loaded = pipeline is not None
    gpu_available = False
    try:
        import torch
        gpu_available = torch.cuda.is_available()
    except:
        pass
    
    return {
        "status": "healthy" if models_loaded else "degraded",
        "models_loaded": models_loaded,
        "gpu_available": gpu_available,
        "version": "3.0.1",
        "uptime_seconds": int(time.time())  # À améliorer avec un vrai compteur
    }

@app.post("/api/predict")
async def predict_weight(request: PredictRequest):
    """
    Estimation poids d'un seul porc
    
    Request body selon README:
    {
        "image": "base64_encoded_image",
        "pig_id": "uuid",
        "metadata": {
            "race": "Large White",
            "age_days": 120,
            "capture_conditions": {...}
        }
    }
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    try:
        # Décoder l'image
        image = decode_base64_image(request.image)
        
        # Si pig_id est fourni, enregistrer automatiquement le porc pour identification future
        if request.pig_id and request.auto_register and pipeline.auto_register:
            try:
                # Récupérer les métadonnées de l'animal depuis le backend
                if pipeline.backend_sync:
                    animal_data = pipeline.backend_sync.get_animal_by_id(request.pig_id)
                    if animal_data:
                        metadata = pipeline.backend_sync.format_animal_metadata(animal_data)
                        # Détecter d'abord pour obtenir la bbox
                        detections = pipeline.detector.detect(image)
                        if detections:
                            # Utiliser la première détection (ou la meilleure)
                            best_detection = max(detections, key=lambda d: d['confidence'])
                            # Enregistrer le porc
                            pipeline.auto_register.register_detected_pig(
                                image, 
                                best_detection['bbox'],
                                request.pig_id,
                                metadata
                            )
            except Exception as e:
                logger.warning(f"Erreur lors de l'enregistrement automatique: {e}")
        
        # Traiter
        result = pipeline.predict(
            image=image,
            metadata=request.metadata,
            mode='individual' if request.pig_id else 'group',
            expected_pigs=[request.pig_id] if request.pig_id else None,
            projet_id=request.projet_id,
            user_id=request.user_id
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=404 if result.get('error') == 'no_pigs_detected' else 400,
                detail=result.get('message', 'Erreur de traitement')
            )
        
        # Formater la réponse selon le README
        if result.get('mode') == 'individual' and result.get('pig'):
            pig = result['pig']
            weight_est = pig['weight_estimation']
            
            response = {
                "success": True,
                "pig_id": request.pig_id or pig.get('pig_id'),
                "detection": {
                    "bbox": pig['bbox'],
                    "confidence": pig['confidence']
                },
                "weight_estimation": {
                    "weight_kg": weight_est['weight_kg'],
                    "confidence": weight_est['confidence'],
                    "method": weight_est.get('method', 'ensemble'),
                    "interval": weight_est['interval'],
                    "individual_models": weight_est.get('individual_predictions', {})
                },
                "warnings": generate_warnings(result.get('capture_conditions', {})),
                "processing_time_ms": result['processing_time_ms']
            }
        else:
            # Mode groupe mais un seul porc détecté
            response = {
                "success": True,
                "pig_id": request.pig_id,
                "detection": {
                    "bbox": result['pig']['bbox'],
                    "confidence": result['pig']['confidence']
                },
                "weight_estimation": {
                    "weight_kg": result['pig']['weight_estimation']['weight_kg'],
                    "confidence": result['pig']['weight_estimation']['confidence'],
                    "method": result['pig']['weight_estimation'].get('method', 'ensemble'),
                    "interval": result['pig']['weight_estimation']['interval']
                },
                "warnings": [],
                "processing_time_ms": result['processing_time_ms']
            }
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.post("/api/batch-predict")
async def batch_predict_weight(request: BatchPredictRequest):
    """
    Estimation poids d'un groupe de porcs
    
    Request body selon README:
    {
        "image": "base64_encoded_image",
        "expected_pigs": ["uuid1", "uuid2", "uuid3"],
        "metadata": {}
    }
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    try:
        # Décoder l'image
        image = decode_base64_image(request.image)
        
        # Traiter
        result = pipeline.predict(
            image=image,
            metadata=request.metadata,
            mode='group',
            expected_pigs=request.expected_pigs,
            projet_id=request.projet_id,
            user_id=request.user_id
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=404 if result.get('error') == 'no_pigs_detected' else 400,
                detail=result.get('message', 'Erreur de traitement')
            )
        
        # Formater la réponse selon le README
        predictions = []
        unidentified = []
        
        detected_pig_ids = set()
        for pred in result.get('predictions', []):
            pig_id = pred.get('pig_id')
            if pig_id:
                detected_pig_ids.add(pig_id)
            
            predictions.append({
                "pig_id": pig_id,
                "name": pred.get('name', ''),
                "weight_kg": pred['weight_estimation']['weight_kg'],
                "confidence": pred['weight_estimation']['confidence'],
                "bbox": pred['bbox'],
                "interval": pred['weight_estimation']['interval']
            })
        
        # Identifier les porcs non détectés
        if request.expected_pigs:
            for expected_id in request.expected_pigs:
                if expected_id not in detected_pig_ids:
                    unidentified.append(expected_id)
        
        response = {
            "success": True,
            "total_detected": result.get('total_detected', len(predictions)),
            "predictions": predictions,
            "unidentified": unidentified,
            "processing_time_ms": result['processing_time_ms']
        }
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.post("/api/video-predict")
async def predict_weight_video(
    video: UploadFile = File(...),
    projet_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    frame_skip: int = Form(5),
    return_annotated: bool = Form(False)
):
    """
    Estimation poids depuis une vidéo avec tracking
    
    Args:
        video: Fichier vidéo (mp4, mov, avi)
        projet_id: ID du projet (obligatoire)
        user_id: ID de l'utilisateur (obligatoire)
        frame_skip: Nombre de frames à sauter (défaut: 5)
        return_annotated: Si True, retourne la vidéo annotée
        
    Returns:
        Résultats de pesée pour chaque porc suivi dans la vidéo
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    if not projet_id or not user_id:
        raise HTTPException(status_code=400, detail="projet_id et user_id sont obligatoires")
    
    try:
        # Sauvegarder la vidéo temporairement
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
            tmp_path = tmp_file.name
            content = await video.read()
            tmp_file.write(content)
        
        try:
            # Chemin pour la vidéo annotée si demandée
            annotated_path = None
            if return_annotated:
                annotated_path = tmp_path.replace('.mp4', '_annotated.mp4')
            
            # Traiter la vidéo
            result = pipeline.predict_video(
                video_path=tmp_path,
                projet_id=projet_id,
                user_id=user_id,
                frame_skip=frame_skip,
                output_path=annotated_path
            )
            
            if not result.get('success'):
                raise HTTPException(
                    status_code=400,
                    detail=result.get('message', 'Erreur lors du traitement vidéo')
                )
            
            # Formater la réponse
            response = {
                "success": True,
                "mode": "video",
                "total_tracks": result.get('total_tracks', 0),
                "total_frames_processed": result.get('total_frames_processed', 0),
                "pigs": result.get('pigs', []),
                "summary": result.get('summary', {}),
                "timestamp": result.get('timestamp')
            }
            
            # Si vidéo annotée demandée, la retourner
            if return_annotated and annotated_path and os.path.exists(annotated_path):
                return FileResponse(
                    annotated_path,
                    media_type='video/mp4',
                    filename='pesee_annotee.mp4',
                    headers={
                        'X-Prediction-Results': str(response)
                    }
                )
            
            return JSONResponse(content=response)
            
        finally:
            # Nettoyer les fichiers temporaires
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            if annotated_path and os.path.exists(annotated_path) and not return_annotated:
                os.unlink(annotated_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors du traitement vidéo: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.get("/api/models")
async def get_models_info():
    """Retourne les informations sur les modèles chargés"""
    global pipeline
    
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    return {
        "detection": {
            "model": pipeline.detector.model.model_name if hasattr(pipeline.detector.model, 'model_name') else "yolov8",
            "version": "v2.1"
        },
        "reid": {
            "model": "resnet50-triplet",
            "version": "v1.3"
        },
        "weight": {
            "models": ["geometric", "cnn", "transformer"],
            "ensemble": True,
            "version": "v3.0"
        }
    }

def generate_warnings(capture_conditions: Dict) -> List[str]:
    """Génère des avertissements basés sur les conditions de capture"""
    warnings = []
    
    if capture_conditions.get('overall_quality') == 'degraded':
        warnings.append("Conditions de capture sous-optimales. Précision réduite.")
    
    if capture_conditions.get('lighting_quality') == 'poor':
        warnings.append("Éclairage insuffisant. Améliorez l'éclairage pour de meilleurs résultats.")
    
    if not capture_conditions.get('has_scale_reference'):
        warnings.append("Aucune référence d'échelle détectée. Utilisez un marqueur ArUco pour améliorer la précision.")
    
    return warnings

if __name__ == "__main__":
    server_config = api_config['api']['server']
    uvicorn.run(
        "server:app",
        host=server_config['host'],
        port=server_config['port'],
        workers=server_config.get('workers', 1),
        reload=True
    )


