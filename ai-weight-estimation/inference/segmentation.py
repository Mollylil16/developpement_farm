"""
Module de segmentation d'instance (Mask R-CNN)
"""

import cv2
import numpy as np
import torch
import torchvision
from torchvision.models.detection import maskrcnn_resnet50_fpn
from torchvision.transforms import functional as F
from typing import List, Dict, Optional
import yaml
from pathlib import Path

class PigSegmenter:
    """Segmentateur de porcs basé sur Mask R-CNN"""
    
    def __init__(self, model_path: Optional[str] = None, config_path: str = "config/model_config.yaml"):
        """
        Initialise le segmentateur
        
        Args:
            model_path: Chemin vers le modèle pré-entraîné
            config_path: Chemin vers la configuration
        """
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        seg_config = self.config['models']['segmentation']
        self.confidence_threshold = seg_config['confidence_threshold']
        self.input_size = seg_config['input_size']
        
        # Charger le modèle
        if model_path is None:
            model_path = seg_config['path']
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model(model_path)
        self.model.eval()
    
    def _load_model(self, model_path: str):
        """Charge le modèle Mask R-CNN"""
        # Créer le modèle
        model = maskrcnn_resnet50_fpn(pretrained=False, num_classes=2)  # Background + Pig
        
        if Path(model_path).exists():
            checkpoint = torch.load(model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            else:
                model.load_state_dict(checkpoint)
        
        model.to(self.device)
        return model
    
    def segment(self, image: np.ndarray, detections: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Segmente les porcs dans l'image
        
        Args:
            image: Image BGR
            detections: Détections préalables (optionnel, pour accélérer)
            
        Returns:
            Liste de segments avec masques
        """
        # Convertir BGR vers RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convertir en tensor
        image_tensor = F.to_tensor(image_rgb).to(self.device)
        
        # Inférence
        with torch.no_grad():
            predictions = self.model([image_tensor])
        
        segments = []
        for i, pred in enumerate(predictions):
            masks = pred['masks'].cpu().numpy()
            boxes = pred['boxes'].cpu().numpy()
            scores = pred['scores'].cpu().numpy()
            labels = pred['labels'].cpu().numpy()
            
            for j in range(len(scores)):
                if scores[j] >= self.confidence_threshold and labels[j] == 1:  # Classe porc
                    mask = masks[j][0]  # Extraire le masque
                    mask_binary = (mask > 0.5).astype(np.uint8) * 255
                    
                    segments.append({
                        'mask': mask_binary,
                        'bbox': boxes[j].tolist(),
                        'confidence': float(scores[j]),
                        'area_pixels': int(np.sum(mask_binary > 0))
                    })
        
        return segments
    
    def calculate_surface_area(self, mask: np.ndarray, pixel_to_meter: Optional[float] = None) -> Dict:
        """
        Calcule la surface corporelle à partir du masque
        
        Args:
            mask: Masque binaire
            pixel_to_meter: Conversion pixels -> mètres (si disponible)
            
        Returns:
            Dict avec surface en pixels et m²
        """
        area_pixels = np.sum(mask > 0)
        
        result = {
            'area_pixels': int(area_pixels)
        }
        
        if pixel_to_meter:
            area_m2 = area_pixels * (pixel_to_meter ** 2)
            result['area_m2'] = float(area_m2)
        
        return result
    
    def extract_pig_region(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Extrait la région du porc en appliquant le masque
        
        Args:
            image: Image originale
            mask: Masque binaire
            
        Returns:
            Image avec seulement la région du porc (fond noir)
        """
        # Appliquer le masque
        masked = cv2.bitwise_and(image, image, mask=mask)
        return masked

