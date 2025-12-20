"""
Module de détection des porcs dans les images/vidéos
Utilise YOLOv8 pour détecter les porcs
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
from ultralytics import YOLO
import torch
from pathlib import Path
import yaml

class PigDetector:
    """Détecteur de porcs basé sur YOLOv8"""
    
    def __init__(self, model_path: Optional[str] = None, config_path: str = "config/config.yaml"):
        """
        Initialise le détecteur
        
        Args:
            model_path: Chemin vers le modèle YOLO pré-entraîné
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Charger le modèle
        if model_path is None:
            model_path = self.config.get('models', {}).get('detection', {}).get('path', 'models/detection/yolov8l_pig.pt')
        
        # Vérifier si le modèle existe, sinon utiliser un modèle pré-entraîné générique
        if not Path(model_path).exists():
            print(f"⚠️  Modèle personnalisé non trouvé: {model_path}")
            print("📥 Utilisation du modèle YOLOv8 pré-entraîné générique (sera téléchargé automatiquement)...")
            print("💡 Note: Ce modèle détectera tous les objets. Entraînez un modèle spécifique aux porcs pour de meilleurs résultats.")
            # Utiliser yolov8n.pt (nano) qui sera téléchargé automatiquement par ultralytics
            model_path = 'yolov8n.pt'  # Modèle générique qui sera téléchargé
        
        self.model = YOLO(model_path)
        self.confidence_threshold = self.config.get('models', {}).get('detection', {}).get('confidence_threshold', 0.5)
        self.iou_threshold = self.config.get('models', {}).get('detection', {}).get('iou_threshold', 0.45)
        self.input_size = self.config.get('models', {}).get('detection', {}).get('input_size', [640, 640])
        
    def detect(self, image: np.ndarray) -> List[dict]:
        """
        Détecte les porcs dans une image
        
        Args:
            image: Image en format numpy array (BGR)
            
        Returns:
            Liste de détections avec bounding boxes, confiance, etc.
        """
        # Exécuter la détection
        results = self.model(
            image,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            imgsz=self.input_size,
            verbose=False
        )
        
        detections = []
        for result in results:
            boxes = result.boxes
            for i in range(len(boxes)):
                box = boxes[i]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                
                detections.append({
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'confidence': confidence,
                    'class': cls,
                    'class_name': self.model.names[cls] if cls < len(self.model.names) else 'pig'
                })
        
        return detections
    
    def detect_batch(self, images: List[np.ndarray]) -> List[List[dict]]:
        """
        Détecte les porcs dans un batch d'images
        
        Args:
            images: Liste d'images
            
        Returns:
            Liste de listes de détections
        """
        results = self.model(
            images,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            imgsz=self.input_size,
            verbose=False
        )
        
        all_detections = []
        for result in results:
            detections = []
            boxes = result.boxes
            for i in range(len(boxes)):
                box = boxes[i]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                
                detections.append({
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'confidence': confidence,
                    'class': cls,
                    'class_name': self.model.names[cls] if cls < len(self.model.names) else 'pig'
                })
            all_detections.append(detections)
        
        return all_detections
    
    def draw_detections(self, image: np.ndarray, detections: List[dict]) -> np.ndarray:
        """
        Dessine les détections sur l'image
        
        Args:
            image: Image originale
            detections: Liste de détections
            
        Returns:
            Image avec les bounding boxes dessinées
        """
        image_copy = image.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            confidence = det['confidence']
            
            # Dessiner le rectangle
            cv2.rectangle(image_copy, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Ajouter le label avec confiance
            label = f"{det['class_name']} {confidence:.2f}"
            cv2.putText(
                image_copy,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2
            )
        
        return image_copy

