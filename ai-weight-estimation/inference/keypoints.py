"""
Module de détection des points clés anatomiques (18 points)
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from typing import List, Dict, Tuple, Optional
import yaml
from pathlib import Path

class KeypointDetector:
    """Détecteur de points clés anatomiques des porcs"""
    
    # 18 points clés anatomiques
    KEYPOINT_NAMES = [
        'nose', 'left_eye', 'right_eye',
        'left_ear', 'right_ear',
        'neck',
        'left_shoulder', 'right_shoulder',
        'spine_mid',
        'left_hip', 'right_hip',
        'spine_end',
        'left_front_knee', 'right_front_knee',
        'left_back_knee', 'right_back_knee',
        'tail_base', 'tail_tip'
    ]
    
    def __init__(self, model_path: Optional[str] = None, config_path: str = "config/model_config.yaml"):
        """
        Initialise le détecteur de points clés
        
        Args:
            model_path: Chemin vers le modèle
            config_path: Chemin vers la configuration
        """
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        keypoints_config = self.config['models']['weight']['geometric']
        self.num_keypoints = keypoints_config['num_keypoints']
        
        if model_path is None:
            model_path = keypoints_config['keypoints_model']
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model(model_path)
        self.model.eval()
        
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def _load_model(self, model_path: str):
        """Charge le modèle de détection de points clés"""
        # Architecture basée sur ResNet50 avec sortie pour keypoints
        model = models.resnet50(pretrained=True)
        
        # Modifier pour détecter les keypoints
        num_features = model.fc.in_features
        # 18 keypoints * 2 coordonnées (x, y) + 18 visibilités = 54 sorties
        model.fc = nn.Linear(num_features, self.num_keypoints * 3)  # x, y, visibility
        
        if Path(model_path).exists():
            checkpoint = torch.load(model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            else:
                model.load_state_dict(checkpoint)
        
        model.to(self.device)
        return model
    
    def detect(self, image: np.ndarray, bbox: List[int]) -> Dict:
        """
        Détecte les points clés dans une bounding box
        
        Args:
            image: Image complète
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            Dict avec keypoints (liste de [x, y, visibility])
        """
        # Extraire la région
        x1, y1, x2, y2 = bbox
        roi = image[y1:y2, x1:x2]
        
        # Prétraiter
        roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
        tensor = self.transform(roi_rgb).unsqueeze(0).to(self.device)
        
        # Inférence
        with torch.no_grad():
            output = self.model(tensor)
            output = output.cpu().numpy()[0]
        
        # Reshape: [num_keypoints * 3] -> [num_keypoints, 3]
        keypoints = output.reshape(self.num_keypoints, 3)
        
        # Convertir les coordonnées relatives en coordonnées absolues
        roi_width = x2 - x1
        roi_height = y2 - y1
        
        keypoints_absolute = []
        for kp in keypoints:
            x_rel, y_rel, visibility = kp
            x_abs = int(x1 + x_rel * roi_width)
            y_abs = int(y1 + y_rel * roi_height)
            keypoints_absolute.append({
                'x': x_abs,
                'y': y_abs,
                'visibility': float(visibility)
            })
        
        return {
            'keypoints': keypoints_absolute,
            'keypoint_names': self.KEYPOINT_NAMES
        }
    
    def calculate_dimensions(self, keypoints: Dict, pixel_to_meter: Optional[float] = None) -> Dict:
        """
        Calcule les dimensions du porc à partir des points clés
        
        Args:
            keypoints: Dict avec keypoints détectés
            pixel_to_meter: Conversion pixels -> mètres
            
        Returns:
            Dict avec longueur, largeur, hauteur
        """
        kps = keypoints['keypoints']
        names = keypoints['keypoint_names']
        
        # Créer un dict pour accès facile
        kp_dict = {name: kp for name, kp in zip(names, kps)}
        
        # Longueur: distance entre nose et tail_base
        if 'nose' in kp_dict and 'tail_base' in kp_dict:
            nose = kp_dict['nose']
            tail = kp_dict['tail_base']
            length_px = np.sqrt((nose['x'] - tail['x'])**2 + (nose['y'] - tail['y'])**2)
        else:
            length_px = None
        
        # Largeur: distance entre left_shoulder et right_shoulder
        if 'left_shoulder' in kp_dict and 'right_shoulder' in kp_dict:
            left = kp_dict['left_shoulder']
            right = kp_dict['right_shoulder']
            width_px = np.sqrt((left['x'] - right['x'])**2 + (left['y'] - right['y'])**2)
        else:
            width_px = None
        
        # Hauteur: distance entre spine_mid et ground (approximation)
        if 'spine_mid' in kp_dict:
            spine = kp_dict['spine_mid']
            # Approximation: hauteur = distance spine_mid à la ligne entre les genoux
            if 'left_back_knee' in kp_dict and 'right_back_knee' in kp_dict:
                left_knee = kp_dict['left_back_knee']
                right_knee = kp_dict['right_back_knee']
                # Ligne entre les genoux
                knee_y = (left_knee['y'] + right_knee['y']) / 2
                height_px = abs(spine['y'] - knee_y)
            else:
                height_px = None
        else:
            height_px = None
        
        result = {
            'length_pixels': float(length_px) if length_px else None,
            'width_pixels': float(width_px) if width_px else None,
            'height_pixels': float(height_px) if height_px else None
        }
        
        # Convertir en mètres si possible
        if pixel_to_meter:
            if length_px:
                result['length_m'] = float(length_px * pixel_to_meter)
            if width_px:
                result['width_m'] = float(width_px * pixel_to_meter)
            if height_px:
                result['height_m'] = float(height_px * pixel_to_meter)
        
        return result

