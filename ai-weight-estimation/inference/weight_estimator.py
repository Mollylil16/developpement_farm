"""
Module d'estimation du poids des porcs basé sur les dimensions visuelles
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import yaml

class WeightEstimator:
    """Estimateur de poids basé sur l'analyse visuelle"""
    
    def __init__(self, model_path: Optional[str] = None, config_path: str = "config/config.yaml"):
        """
        Initialise l'estimateur de poids
        
        Args:
            model_path: Chemin vers le modèle d'estimation de poids
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Paramètres
        weight_config = self.config.get('models', {}).get('weight', {}).get('cnn', {})
        self.input_size = weight_config.get('input_size', [224, 224])
        self.weight_range = [5, 300]  # Plage par défaut
        self.error_margin = 0.005  # 0.5% par défaut
        
        # Charger le modèle
        if model_path is None:
            model_path = weight_config.get('path', 'models/weight/efficientnet_b4_weight.pt')
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Vérifier si le modèle existe
        if not Path(model_path).exists():
            print(f"⚠️  Modèle d'estimation de poids non trouvé: {model_path}")
            print("📝 Le modèle sera créé avec des poids pré-entraînés ImageNet. Entraînez-le avec vos données.")
        
        self.model = self._load_model(model_path)
        self.model.eval()
        
        # Transformations pour les images
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(self.input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
    def _load_model(self, model_path: str) -> nn.Module:
        """Charge le modèle d'estimation de poids"""
        # Architecture basée sur ResNet50 avec régression
        model = models.resnet50(pretrained=True)
        
        # Remplacer la dernière couche par une régression
        num_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 1)  # Sortie: poids en kg
        )
        
        if Path(model_path).exists():
            checkpoint = torch.load(model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            else:
                model.load_state_dict(checkpoint)
        else:
            print("⚠️  Modèle d'estimation de poids non entraîné. Utilisation de poids ImageNet pré-entraînés.")
            # Les poids ImageNet sont déjà chargés avec pretrained=True
        
        model.to(self.device)
        return model
    
    def estimate_from_image(self, image: np.ndarray, bbox: List[int]) -> Dict[str, float]:
        """
        Estime le poids d'un porc à partir de son image
        
        Args:
            image: Image complète
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            Dictionnaire avec poids estimé, intervalle de confiance, etc.
        """
        # Extraire la région du porc
        x1, y1, x2, y2 = bbox
        pig_roi = image[y1:y2, x1:x2]
        
        # Calculer les dimensions visuelles
        height_pixels = y2 - y1
        width_pixels = x2 - x1
        
        # Redimensionner pour le modèle
        pig_roi_resized = cv2.resize(pig_roi, (self.input_size[1], self.input_size[0]))
        
        # Convertir BGR vers RGB
        pig_roi_rgb = cv2.cvtColor(pig_roi_resized, cv2.COLOR_BGR2RGB)
        
        # Appliquer les transformations
        tensor = self.transform(pig_roi_rgb).unsqueeze(0).to(self.device)
        
        # Estimer le poids
        with torch.no_grad():
            weight_pred = self.model(tensor)
            weight_kg = float(weight_pred.cpu().numpy()[0][0])
        
        # S'assurer que le poids est dans la plage valide
        weight_kg = np.clip(weight_kg, self.weight_range[0], self.weight_range[1])
        
        # Calculer l'intervalle de confiance (basé sur l'erreur relative)
        error_relative = self.error_margin
        confidence_interval = weight_kg * error_relative
        
        return {
            'weight_kg': round(weight_kg, 2),
            'weight_min': round(weight_kg - confidence_interval, 2),
            'weight_max': round(weight_kg + confidence_interval, 2),
            'confidence_interval': round(confidence_interval, 2),
            'dimensions_pixels': {
                'width': width_pixels,
                'height': height_pixels
            }
        }
    
    def estimate_batch(self, image: np.ndarray, detections: List[dict]) -> List[dict]:
        """
        Estime le poids de plusieurs porcs dans une image
        
        Args:
            image: Image complète
            detections: Liste de détections avec bounding boxes
            
        Returns:
            Liste de détections avec poids estimé ajouté
        """
        results = []
        
        for det in detections:
            bbox = det['bbox']
            weight_info = self.estimate_from_image(image, bbox)
            
            det_with_weight = det.copy()
            det_with_weight['weight'] = weight_info
            
            results.append(det_with_weight)
        
        return results
    
    def calculate_volume_estimate(self, bbox: List[int], 
                                 reference_distance: Optional[float] = None) -> Dict[str, float]:
        """
        Calcule une estimation de volume basée sur les dimensions visuelles
        (Méthode alternative/complémentaire)
        
        Args:
            bbox: Bounding box [x1, y1, x2, y2]
            reference_distance: Distance de référence en mètres (optionnel)
            
        Returns:
            Dictionnaire avec dimensions estimées
        """
        x1, y1, x2, y2 = bbox
        width_px = x2 - x1
        height_px = y2 - y1
        
        # Si on a une distance de référence, on peut convertir en mètres
        # Sinon, on utilise des ratios approximatifs basés sur l'entraînement
        if reference_distance:
            # Conversion pixels -> mètres (nécessite calibration caméra)
            pixel_to_meter = reference_distance / height_px  # Approximation
            width_m = width_px * pixel_to_meter
            height_m = height_px * pixel_to_meter
        else:
            # Utiliser des ratios moyens basés sur l'entraînement
            # Un porc moyen fait environ 1.5m de long et 0.6m de haut
            # On utilise ces ratios pour estimer
            avg_pig_height_px = 200  # Pixels moyens pour un porc de taille normale
            pixel_to_meter = 0.6 / avg_pig_height_px
            width_m = width_px * pixel_to_meter
            height_m = height_px * pixel_to_meter
        
        # Estimation de la profondeur (approximation)
        depth_m = width_m * 0.6  # Ratio largeur/profondeur moyen
        
        # Volume approximatif (ellipsoïde)
        volume_m3 = (4/3) * np.pi * (width_m/2) * (height_m/2) * (depth_m/2)
        
        return {
            'width_m': round(width_m, 3),
            'height_m': round(height_m, 3),
            'depth_m': round(depth_m, 3),
            'volume_m3': round(volume_m3, 3)
        }

