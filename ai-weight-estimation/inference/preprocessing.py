"""
Module de prétraitement des images/vidéos
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict
import yaml
from pathlib import Path

class ImagePreprocessor:
    """Prétraitement des images pour l'inférence"""
    
    def __init__(self, config_path: str = "config/inference_config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
    
    def preprocess_for_detection(self, image: np.ndarray, target_size: Tuple[int, int] = (640, 640)) -> Tuple[np.ndarray, Dict]:
        """
        Prétraite une image pour la détection
        
        Args:
            image: Image BGR
            target_size: Taille cible (width, height)
            
        Returns:
            Image prétraitée et métadonnées (scale, padding)
        """
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        # Calculer le scale pour maintenir l'aspect ratio
        scale = min(target_w / w, target_h / h)
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Redimensionner
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Ajouter padding pour atteindre la taille cible
        top = (target_h - new_h) // 2
        bottom = target_h - new_h - top
        left = (target_w - new_w) // 2
        right = target_w - new_w - left
        
        padded = cv2.copyMakeBorder(
            resized, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=[114, 114, 114]  # Gris moyen
        )
        
        metadata = {
            'scale': scale,
            'padding': {'top': top, 'bottom': bottom, 'left': left, 'right': right},
            'original_size': (w, h),
            'processed_size': (target_w, target_h)
        }
        
        return padded, metadata
    
    def preprocess_for_segmentation(self, image: np.ndarray, target_size: Tuple[int, int] = (800, 800)) -> Tuple[np.ndarray, Dict]:
        """Prétraite pour la segmentation"""
        return self.preprocess_for_detection(image, target_size)
    
    def preprocess_for_weight_estimation(self, image: np.ndarray, bbox: list, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
        """
        Extrait et prétraite la région d'un porc pour l'estimation de poids
        
        Args:
            image: Image complète
            bbox: Bounding box [x1, y1, x2, y2]
            target_size: Taille cible
            
        Returns:
            Image du porc prétraitée
        """
        x1, y1, x2, y2 = bbox
        
        # Extraire la région
        roi = image[y1:y2, x1:x2]
        
        # Redimensionner
        resized = cv2.resize(roi, target_size, interpolation=cv2.INTER_LINEAR)
        
        # Normalisation sera faite par le modèle
        return resized
    
    def enhance_image(self, image: np.ndarray, method: str = 'adaptive') -> np.ndarray:
        """
        Améliore la qualité de l'image
        
        Args:
            image: Image BGR
            method: 'adaptive', 'histogram', 'clahe'
        """
        if method == 'adaptive':
            # Conversion en LAB pour améliorer la luminosité
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # CLAHE sur le canal L
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            enhanced = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
            
        elif method == 'histogram':
            # Égalisation d'histogramme
            yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
            yuv[:, :, 0] = cv2.equalizeHist(yuv[:, :, 0])
            enhanced = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
            
        elif method == 'clahe':
            # CLAHE direct
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            enhanced = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        else:
            enhanced = image
        
        return enhanced
    
    def detect_lighting_conditions(self, image: np.ndarray) -> Dict[str, float]:
        """
        Détecte les conditions d'éclairage
        
        Returns:
            Dict avec lighting_lux (estimé), contrast, brightness
        """
        # Convertir en niveaux de gris
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Luminosité moyenne (approximation lux)
        brightness = np.mean(gray)
        # Conversion approximative: pixel value -> lux
        # Cette formule est approximative et devrait être calibrée
        estimated_lux = brightness * 3.0  # Approximation
        
        # Contraste (écart-type)
        contrast = np.std(gray)
        
        return {
            'lighting_lux': float(estimated_lux),
            'brightness': float(brightness),
            'contrast': float(contrast),
            'quality': 'optimal' if estimated_lux > 300 and contrast > 30 else 
                      'standard' if estimated_lux > 150 else 'poor'
        }
    
    def detect_occlusion(self, mask: np.ndarray) -> float:
        """
        Calcule le pourcentage d'occlusion basé sur le masque
        
        Args:
            mask: Masque binaire du porc
            
        Returns:
            Pourcentage d'occlusion (0-100)
        """
        if mask is None or mask.size == 0:
            return 100.0  # Pas de masque = 100% occlusion
        
        # Calculer la surface totale attendue vs surface réelle
        # Approximation: si le masque est trop petit par rapport à la bbox, il y a occlusion
        total_pixels = mask.shape[0] * mask.shape[1]
        visible_pixels = np.sum(mask > 0)
        
        # Ratio de visibilité
        visibility_ratio = visible_pixels / total_pixels if total_pixels > 0 else 0
        
        # Occlusion = 1 - visibilité
        occlusion_percent = (1 - visibility_ratio) * 100
        
        return float(occlusion_percent)

