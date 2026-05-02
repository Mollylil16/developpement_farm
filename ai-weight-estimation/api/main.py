"""
API FastAPI pour l'intégration avec le frontend
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pathlib import Path
import tempfile
import shutil
from typing import Literal, Optional
import sys

# Ajouter le répertoire parent au path pour les imports
sys.path.append(str(Path(__file__).parent.parent))

from inference.pipeline import WeightEstimationPipeline
import yaml

# Charger la configuration
with open("config/config.yaml", 'r') as f:
    config = yaml.safe_load(f)

app = FastAPI(title="IA de Pesée Automatique", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser le pipeline (chargé une seule fois au démarrage)
pipeline = None

@app.on_event("startup")
async def startup_event():
    """Initialise le pipeline au démarrage"""
    global pipeline
    print("Initialisation du pipeline d'IA...")
    pipeline = WeightEstimationPipeline()
    print("Pipeline initialisé!")

@app.get("/")
async def root():
    """Endpoint de santé"""
    return {"status": "ok", "service": "IA de Pesée Automatique"}

@app.post("/api/weight-estimation/image")
async def estimate_weight_image(
    file: UploadFile = File(...),
    mode: Literal['individual', 'group'] = 'group',
    register_new: bool = False
):
    """
    Estime le poids des porcs dans une image
    
    Args:
        file: Fichier image
        mode: Mode de traitement ('individual' ou 'group')
        register_new: Si True, enregistre les nouveaux porcs non identifiés
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    # Vérifier le type de fichier
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    # Sauvegarder temporairement le fichier
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # Traiter l'image
        result = pipeline.process_image(tmp_path, mode=mode, register_new=register_new)
        
        # Formater la réponse
        return JSONResponse(content={
            "success": True,
            "result": result,
            "formatted_output": pipeline.format_output(result)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Nettoyer le fichier temporaire
        Path(tmp_path).unlink(missing_ok=True)

@app.post("/api/weight-estimation/video")
async def estimate_weight_video(
    file: UploadFile = File(...),
    mode: Literal['individual', 'group'] = 'group',
    frame_skip: int = 1
):
    """
    Estime le poids des porcs dans une vidéo
    
    Args:
        file: Fichier vidéo
        mode: Mode de traitement
        frame_skip: Nombre de frames à sauter entre chaque traitement
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    # Vérifier le type de fichier
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une vidéo")
    
    # Sauvegarder temporairement le fichier
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # Traiter la vidéo
        result = pipeline.process_video(tmp_path, mode=mode, frame_skip=frame_skip)
        
        return JSONResponse(content={
            "success": True,
            "result": result
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Nettoyer le fichier temporaire
        Path(tmp_path).unlink(missing_ok=True)

@app.post("/api/pigs/register")
async def register_pig(
    pig_id: str,
    code: Optional[str] = None,
    name: Optional[str] = None,
    file: UploadFile = File(...)
):
    """
    Enregistre un nouveau porc dans la base de données
    
    Args:
        pig_id: Identifiant unique du porc
        code: Code du porc (ex: PORC001)
        name: Nom du porc (ex: ELLA)
        file: Image du porc avec bounding box
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline non initialisé")
    
    # TODO: Implémenter l'enregistrement d'un porc
    # Pour l'instant, retourner un message
    return JSONResponse(content={
        "success": True,
        "message": f"Porc {pig_id} enregistré avec succès"
    })

if __name__ == "__main__":
    api_config = config.get('api', {})
    uvicorn.run(
        "main:app",
        host=api_config.get('host', '0.0.0.0'),
        port=api_config.get('port', 8000),
        reload=True
    )

