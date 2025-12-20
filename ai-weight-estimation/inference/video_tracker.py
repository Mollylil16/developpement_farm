"""
Module de tracking vidéo pour suivre les porcs dans une vidéo continue
Utilise un système de tracking multi-objets pour suivre chaque porc individuellement
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class VideoTracker:
    """Système de tracking pour suivre les porcs dans une vidéo"""
    
    def __init__(self, max_age: int = 30, min_hits: int = 3, iou_threshold: float = 0.3):
        """
        Initialise le tracker
        
        Args:
            max_age: Nombre de frames avant de perdre une track
            min_hits: Nombre de frames minimum pour confirmer une track
            iou_threshold: Seuil IoU pour associer les détections aux tracks
        """
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        
        # Dictionnaire des tracks actives : {track_id: Track}
        self.tracks: Dict[int, 'Track'] = {}
        self.next_id = 0
        
        # Historique des poids estimés par track
        self.weight_history: Dict[int, List[Dict]] = defaultdict(list)
    
    def update(self, detections: List[Dict], frame_number: int) -> List[Dict]:
        """
        Met à jour les tracks avec de nouvelles détections
        
        Args:
            detections: Liste de détections avec bbox, confidence, etc.
            frame_number: Numéro de la frame actuelle
            
        Returns:
            Liste de tracks mises à jour avec leurs IDs
        """
        # Si aucune détection, vieillir toutes les tracks
        if not detections:
            for track_id in list(self.tracks.keys()):
                self.tracks[track_id].age += 1
                if self.tracks[track_id].age > self.max_age:
                    del self.tracks[track_id]
            return []
        
        # Calculer les IoU entre les tracks existantes et les nouvelles détections
        if self.tracks:
            track_ids = list(self.tracks.keys())
            track_boxes = [self.tracks[tid].bbox for tid in track_ids]
            detection_boxes = [det['bbox'] for det in detections]
            
            # Matrice IoU
            iou_matrix = self._compute_iou_matrix(track_boxes, detection_boxes)
            
            # Association hungarienne ou greedy
            matched, unmatched_tracks, unmatched_detections = self._associate(
                iou_matrix, self.iou_threshold
            )
        else:
            matched = []
            unmatched_tracks = []
            unmatched_detections = list(range(len(detections)))
        
        # Mettre à jour les tracks existantes
        for track_idx, det_idx in matched:
            track_id = track_ids[track_idx]
            detection = detections[det_idx]
            
            # Mettre à jour la track
            self.tracks[track_id].update(detection['bbox'], frame_number)
            self.tracks[track_id].hits += 1
            
            # Ajouter l'estimation de poids à l'historique
            if 'weight' in detection:
                self.weight_history[track_id].append({
                    'frame': frame_number,
                    'weight_kg': detection['weight'].get('weight_kg', 0),
                    'confidence': detection.get('confidence', 0)
                })
        
        # Vieillir les tracks non associées
        for track_idx in unmatched_tracks:
            track_id = track_ids[track_idx]
            self.tracks[track_id].age += 1
            if self.tracks[track_id].age > self.max_age:
                del self.tracks[track_id]
                if track_id in self.weight_history:
                    del self.weight_history[track_id]
        
        # Créer de nouvelles tracks pour les détections non associées
        for det_idx in unmatched_detections:
            detection = detections[det_idx]
            track_id = self.next_id
            self.next_id += 1
            
            self.tracks[track_id] = Track(
                track_id=track_id,
                bbox=detection['bbox'],
                frame_number=frame_number
            )
            
            # Ajouter l'estimation de poids initiale
            if 'weight' in detection:
                self.weight_history[track_id].append({
                    'frame': frame_number,
                    'weight_kg': detection['weight'].get('weight_kg', 0),
                    'confidence': detection.get('confidence', 0)
                })
        
        # Retourner les tracks confirmées (avec min_hits)
        confirmed_tracks = []
        for track_id, track in self.tracks.items():
            if track.hits >= self.min_hits:
                track_info = {
                    'track_id': track_id,
                    'bbox': track.bbox,
                    'age': track.age,
                    'hits': track.hits,
                    'first_seen': track.first_seen,
                    'last_seen': track.last_seen,
                    'weight_history': self.weight_history.get(track_id, [])
                }
                
                # Calculer le poids moyen de la track
                if self.weight_history[track_id]:
                    weights = [w['weight_kg'] for w in self.weight_history[track_id]]
                    confidences = [w['confidence'] for w in self.weight_history[track_id]]
                    
                    # Poids moyen pondéré par la confiance
                    total_weight = sum(w * c for w, c in zip(weights, confidences))
                    total_confidence = sum(confidences)
                    avg_weight = total_weight / total_confidence if total_confidence > 0 else sum(weights) / len(weights)
                    
                    track_info['average_weight_kg'] = avg_weight
                    track_info['weight_std'] = np.std(weights) if len(weights) > 1 else 0
                
                confirmed_tracks.append(track_info)
        
        return confirmed_tracks
    
    def _compute_iou_matrix(self, boxes1: List[List[int]], boxes2: List[List[int]]) -> np.ndarray:
        """Calcule la matrice IoU entre deux listes de bounding boxes"""
        if not boxes1 or not boxes2:
            return np.array([])
        
        iou_matrix = np.zeros((len(boxes1), len(boxes2)))
        
        for i, box1 in enumerate(boxes1):
            for j, box2 in enumerate(boxes2):
                iou_matrix[i, j] = self._compute_iou(box1, box2)
        
        return iou_matrix
    
    def _compute_iou(self, box1: List[int], box2: List[int]) -> float:
        """Calcule l'IoU entre deux bounding boxes"""
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2
        
        # Zone d'intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        # Zones des boxes
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def _associate(self, iou_matrix: np.ndarray, threshold: float) -> Tuple[List, List, List]:
        """
        Associe les tracks aux détections en utilisant l'algorithme hongrois simplifié (greedy)
        
        Returns:
            (matched, unmatched_tracks, unmatched_detections)
        """
        if iou_matrix.size == 0:
            return [], [], []
        
        matched = []
        unmatched_tracks = list(range(iou_matrix.shape[0]))
        unmatched_detections = list(range(iou_matrix.shape[1]))
        
        # Algorithme greedy : associer les meilleures paires d'abord
        while True:
            if not unmatched_tracks or not unmatched_detections:
                break
            
            # Trouver la meilleure paire
            best_iou = -1
            best_track_idx = -1
            best_det_idx = -1
            
            for t_idx in unmatched_tracks:
                for d_idx in unmatched_detections:
                    iou = iou_matrix[t_idx, d_idx]
                    if iou > best_iou and iou >= threshold:
                        best_iou = iou
                        best_track_idx = t_idx
                        best_det_idx = d_idx
            
            if best_iou == -1:
                break
            
            matched.append((best_track_idx, best_det_idx))
            unmatched_tracks.remove(best_track_idx)
            unmatched_detections.remove(best_det_idx)
        
        return matched, unmatched_tracks, unmatched_detections
    
    def get_track_summary(self) -> Dict:
        """Retourne un résumé de toutes les tracks"""
        return {
            'total_tracks': len(self.tracks),
            'confirmed_tracks': len([t for t in self.tracks.values() if t.hits >= self.min_hits]),
            'tracks': [
                {
                    'track_id': tid,
                    'hits': track.hits,
                    'age': track.age,
                    'duration_frames': track.last_seen - track.first_seen + 1
                }
                for tid, track in self.tracks.items()
            ]
        }


class Track:
    """Représente une track individuelle d'un porc"""
    
    def __init__(self, track_id: int, bbox: List[int], frame_number: int):
        self.track_id = track_id
        self.bbox = bbox
        self.age = 0  # Nombre de frames sans détection
        self.hits = 1  # Nombre de fois détecté
        self.first_seen = frame_number
        self.last_seen = frame_number
    
    def update(self, bbox: List[int], frame_number: int):
        """Met à jour la track avec une nouvelle détection"""
        self.bbox = bbox
        self.age = 0
        self.last_seen = frame_number

