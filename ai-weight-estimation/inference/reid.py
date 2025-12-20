"""
Module de ré-identification des porcs individuels
Identifie chaque porc via ses caractéristiques visuelles uniques
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import yaml

class PigReID:
    """Système de ré-identification des porcs"""
    
    def __init__(self, model_path: Optional[str] = None, config_path: str = "config/config.yaml"):
        """
        Initialise le système de ré-identification
        
        Args:
            model_path: Chemin vers le modèle de ré-identification
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Paramètres
        reid_config = self.config.get('models', {}).get('reid', {})
        self.input_size = reid_config.get('input_size', [256, 128])
        self.feature_dim = reid_config.get('feature_dim', 512)
        
        # Charger le modèle
        if model_path is None:
            model_path = reid_config.get('path', 'models/reid/pig_reid_resnet50.pt')
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Vérifier si le modèle existe
        if not Path(model_path).exists():
            print(f"⚠️  Modèle Re-ID non trouvé: {model_path}")
            print("📝 Le modèle sera créé avec des poids aléatoires. Entraînez-le avec vos données.")
        
        self.model = self._load_model(model_path)
        self.model.eval()
        
        # Transformations pour les images
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(self.input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Base de données des porcs connus (features + metadata)
        self.pig_database: Dict[str, Dict] = {}
        
    def _load_model(self, model_path: str) -> nn.Module:
        """Charge le modèle de ré-identification"""
        # Architecture ResNet50 pour l'extraction de features
        from torchvision.models import resnet50
        
        model = resnet50(pretrained=False)
        # Modifier la dernière couche pour la dimension de features
        model.fc = nn.Linear(model.fc.in_features, self.feature_dim)
        
        if Path(model_path).exists():
            checkpoint = torch.load(model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            else:
                model.load_state_dict(checkpoint)
        else:
            print("⚠️  Modèle Re-ID non entraîné. Utilisation de poids aléatoires.")
        
        model.to(self.device)
        return model
    
    def extract_features(self, image: np.ndarray, bbox: List[int]) -> np.ndarray:
        """
        Extrait les features d'un porc dans une bounding box
        
        Args:
            image: Image complète
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            Vecteur de features (feature_dim,)
        """
        # Extraire la région du porc
        x1, y1, x2, y2 = bbox
        pig_roi = image[y1:y2, x1:x2]
        
        # Redimensionner et normaliser
        pig_roi = cv2.resize(pig_roi, (self.input_size[1], self.input_size[0]))
        
        # Convertir BGR vers RGB
        pig_roi = cv2.cvtColor(pig_roi, cv2.COLOR_BGR2RGB)
        
        # Appliquer les transformations
        tensor = self.transform(pig_roi).unsqueeze(0).to(self.device)
        
        # Extraire les features
        with torch.no_grad():
            features = self.model(tensor)
            features = nn.functional.normalize(features, p=2, dim=1)
        
        return features.cpu().numpy().flatten()
    
    def register_pig(self, pig_id: str, image: np.ndarray, bbox: List[int], 
                     metadata: Optional[Dict] = None):
        """
        Enregistre un porc dans la base de données
        
        Args:
            pig_id: Identifiant unique du porc (ex: "PORC001")
            image: Image contenant le porc
            bbox: Bounding box du porc
            metadata: Métadonnées (nom, code, etc.)
        """
        features = self.extract_features(image, bbox)
        
        self.pig_database[pig_id] = {
            'features': features,
            'metadata': metadata or {},
            'bbox': bbox
        }
    
    def identify(self, image: np.ndarray, bbox: List[int], 
                threshold: float = 0.7) -> Optional[Tuple[str, float]]:
        """
        Identifie un porc dans une bounding box
        
        Args:
            image: Image complète
            bbox: Bounding box du porc à identifier
            threshold: Seuil de similarité minimum
            
        Returns:
            Tuple (pig_id, similarity_score) ou None si non identifié
        """
        if not self.pig_database:
            return None
        
        # Extraire les features du porc
        query_features = self.extract_features(image, bbox)
        
        # Comparer avec tous les porcs enregistrés
        best_match = None
        best_score = 0.0
        
        for pig_id, pig_data in self.pig_database.items():
            # Ignorer les animaux sans features (pas encore enregistrés avec une image)
            if pig_data.get('features') is None:
                continue
            
            # Calculer la similarité cosinus
            similarity = np.dot(query_features, pig_data['features']) / (
                np.linalg.norm(query_features) * np.linalg.norm(pig_data['features'])
            )
            
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = pig_id
        
        if best_match:
            return (best_match, best_score)
        
        return None
    
    def identify_batch(self, image: np.ndarray, detections: List[dict],
                     threshold: float = 0.7) -> List[dict]:
        """
        Identifie plusieurs porcs dans une image
        
        Args:
            image: Image complète
            detections: Liste de détections avec bounding boxes
            threshold: Seuil de similarité minimum
            
        Returns:
            Liste de détections avec identification ajoutée
        """
        identified_detections = []
        
        for det in detections:
            bbox = det['bbox']
            identification = self.identify(image, bbox, threshold)
            
            det_with_id = det.copy()
            if identification:
                pig_id, similarity = identification
                det_with_id['pig_id'] = pig_id
                det_with_id['similarity'] = similarity
                det_with_id['metadata'] = self.pig_database[pig_id].get('metadata', {})
            else:
                det_with_id['pig_id'] = None
                det_with_id['similarity'] = 0.0
            
            identified_detections.append(det_with_id)
        
        return identified_detections

