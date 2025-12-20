"""
Module de post-traitement des résultats
"""

import numpy as np
from typing import List, Dict, Tuple
import yaml

class ResultPostprocessor:
    """Post-traitement des résultats de l'inférence"""
    
    def __init__(self, config_path: str = "config/inference_config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
    
    def apply_nms(self, detections: List[Dict], iou_threshold: float = 0.45) -> List[Dict]:
        """
        Applique Non-Maximum Suppression
        
        Args:
            detections: Liste de détections avec bbox et confidence
            iou_threshold: Seuil IoU pour NMS
            
        Returns:
            Détections filtrées
        """
        if not detections:
            return []
        
        # Trier par confiance décroissante
        sorted_dets = sorted(detections, key=lambda x: x['confidence'], reverse=True)
        
        keep = []
        while sorted_dets:
            # Prendre la détection avec la plus haute confiance
            current = sorted_dets.pop(0)
            keep.append(current)
            
            # Supprimer les détections qui chevauchent trop
            sorted_dets = [
                det for det in sorted_dets
                if self._calculate_iou(current['bbox'], det['bbox']) < iou_threshold
            ]
        
        return keep
    
    def _calculate_iou(self, bbox1: List[int], bbox2: List[int]) -> float:
        """Calcule l'IoU entre deux bounding boxes"""
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2
        
        # Intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i <= x1_i or y2_i <= y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Union
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def transform_bbox(self, bbox: List[int], metadata: Dict) -> List[int]:
        """
        Transforme les coordonnées de bbox après prétraitement
        
        Args:
            bbox: Bounding box dans l'image prétraitée
            metadata: Métadonnées du prétraitement (scale, padding)
            
        Returns:
            Bounding box dans l'image originale
        """
        x1, y1, x2, y2 = bbox
        scale = metadata.get('scale', 1.0)
        padding = metadata.get('padding', {})
        
        # Retirer le padding
        x1 = x1 - padding.get('left', 0)
        y1 = y1 - padding.get('top', 0)
        x2 = x2 - padding.get('left', 0)
        y2 = y2 - padding.get('top', 0)
        
        # Appliquer l'inverse du scale
        x1 = int(x1 / scale)
        y1 = int(y1 / scale)
        x2 = int(x2 / scale)
        y2 = int(y2 / scale)
        
        return [x1, y1, x2, y2]
    
    def calculate_confidence_interval(self, weight: float, confidence: float, 
                                     weight_class: str = 'croissance') -> Dict[str, float]:
        """
        Calcule l'intervalle de confiance pour le poids
        
        Args:
            weight: Poids estimé en kg
            confidence: Score de confiance (0-1)
            weight_class: Classe de poids (porcelets, croissance, finition, adultes)
            
        Returns:
            Dict avec lower, upper, margin
        """
        # Récupérer les garanties de précision depuis inference_config.yaml
        # Si pas disponible, utiliser des valeurs par défaut
        accuracy_config = self.config.get('weight_accuracy_guarantees', {})
        guarantees = accuracy_config.get(weight_class, {})
        
        # MAE optimal (ou standard si optimal non disponible)
        mae = guarantees.get('mae_optimal') or guarantees.get('mae_standard', 1.5)
        
        # Ajuster selon la confiance
        adjusted_mae = mae * (2 - confidence)  # Plus de marge si confiance faible
        
        # Intervalle de confiance 95%
        margin = adjusted_mae * 1.96  # Z-score pour 95%
        
        return {
            'lower': round(weight - margin, 2),
            'upper': round(weight + margin, 2),
            'margin': round(margin, 2),
            'confidence_level': 0.95
        }
    
    def format_output(self, predictions: List[Dict], mode: str = 'group') -> str:
        """
        Formate les résultats pour l'affichage
        
        Args:
            predictions: Liste de prédictions
            mode: 'individual' ou 'group'
            
        Returns:
            String formatée
        """
        if not predictions:
            return "Aucun porc détecté"
        
        if mode == 'individual' and predictions:
            pred = predictions[0]
            code = pred.get('code', 'UNKNOWN')
            name = pred.get('name', '')
            weight = pred.get('weight_kg', 0)
            confidence = pred.get('confidence', 0)
            
            return f"PORC #{code} | Nom: {name} | Poids: {weight:.1f}kg ±{pred.get('interval', {}).get('margin', 0):.1f}kg | Confiance: {confidence*100:.0f}%"
        else:
            lines = []
            for pred in predictions:
                code = pred.get('code', 'UNKNOWN')
                name = pred.get('name', '')
                weight = pred.get('weight_kg', 0)
                confidence = pred.get('confidence', 0)
                margin = pred.get('interval', {}).get('margin', 0)
                
                lines.append(
                    f"PORC #{code} | Nom: {name} | Poids: {weight:.1f}kg ±{margin:.1f}kg | Confiance: {confidence*100:.0f}%"
                )
            
            return "\n".join(lines)
    
    def filter_by_confidence(self, predictions: List[Dict], min_confidence: float = 0.7) -> List[Dict]:
        """Filtre les prédictions par confiance minimale"""
        return [p for p in predictions if p.get('confidence', 0) >= min_confidence]
    
    def sort_by_weight(self, predictions: List[Dict], reverse: bool = False) -> List[Dict]:
        """Trie les prédictions par poids"""
        return sorted(predictions, key=lambda x: x.get('weight_kg', 0), reverse=reverse)

