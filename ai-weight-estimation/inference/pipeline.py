"""
Pipeline complet de traitement pour la pesée automatique
Combine détection, ré-identification et estimation de poids
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Literal
from pathlib import Path
import yaml
from datetime import datetime

from .detector import PigDetector
from .reid import PigReID
from .weight_estimator import WeightEstimator

class WeightEstimationPipeline:
    """Pipeline complet pour la pesée automatique des porcs"""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        """
        Initialise le pipeline complet
        
        Args:
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialiser les composants
        print("Chargement des modèles...")
        self.detector = PigDetector(config_path=config_path)
        self.reid = PigReID(config_path=config_path)
        self.weight_estimator = WeightEstimator(config_path=config_path)
        print("Modèles chargés avec succès!")
        
    def process_image(self, image_path: str, mode: Literal['individual', 'group'] = 'group',
                     register_new: bool = False) -> Dict:
        """
        Traite une image et retourne les résultats de pesée
        
        Args:
            image_path: Chemin vers l'image
            mode: Mode de traitement ('individual' ou 'group')
            register_new: Si True, enregistre les nouveaux porcs non identifiés
            
        Returns:
            Dictionnaire avec les résultats de pesée
        """
        # Charger l'image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Impossible de charger l'image: {image_path}")
        
        # Détecter les porcs
        detections = self.detector.detect(image)
        
        if not detections:
            return {
                'mode': mode,
                'timestamp': datetime.now().isoformat(),
                'pigs': [],
                'total_detected': 0,
                'message': 'Aucun porc détecté dans l\'image'
            }
        
        # Identifier les porcs (ré-identification)
        identified_detections = self.reid.identify_batch(image, detections)
        
        # Estimer le poids de chaque porc
        results = self.weight_estimator.estimate_batch(image, identified_detections)
        
        # Formater les résultats
        pigs_data = []
        for result in results:
            pig_data = {
                'bbox': result['bbox'],
                'confidence': round(result['confidence'], 3),
                'weight_kg': result['weight']['weight_kg'],
                'weight_range': {
                    'min': result['weight']['weight_min'],
                    'max': result['weight']['weight_max']
                }
            }
            
            # Ajouter l'identification si disponible
            if result.get('pig_id'):
                pig_data['pig_id'] = result['pig_id']
                pig_data['similarity'] = round(result['similarity'], 3)
                if result.get('metadata'):
                    pig_data['code'] = result['metadata'].get('code', '')
                    pig_data['name'] = result['metadata'].get('name', '')
            else:
                pig_data['pig_id'] = None
                pig_data['code'] = None
                pig_data['name'] = None
                
                # Enregistrer comme nouveau porc si demandé
                if register_new:
                    new_id = f"PORC{len(self.reid.pig_database) + 1:03d}"
                    self.reid.register_pig(new_id, image, result['bbox'])
                    pig_data['pig_id'] = new_id
                    pig_data['code'] = new_id
            
            pigs_data.append(pig_data)
        
        # Formater selon le mode
        if mode == 'individual' and pigs_data:
            # Mode individuel: retourner seulement le premier porc
            return {
                'mode': mode,
                'timestamp': datetime.now().isoformat(),
                'pig': pigs_data[0],
                'total_detected': len(pigs_data)
            }
        else:
            # Mode groupe: retourner tous les porcs
            return {
                'mode': mode,
                'timestamp': datetime.now().isoformat(),
                'pigs': pigs_data,
                'total_detected': len(pigs_data),
                'summary': self._generate_summary(pigs_data)
            }
    
    def process_video(self, video_path: str, mode: Literal['individual', 'group'] = 'group',
                     output_path: Optional[str] = None, 
                     frame_skip: int = 1) -> Dict:
        """
        Traite une vidéo frame par frame
        
        Args:
            video_path: Chemin vers la vidéo
            mode: Mode de traitement
            output_path: Chemin pour sauvegarder la vidéo annotée (optionnel)
            frame_skip: Nombre de frames à sauter entre chaque traitement
            
        Returns:
            Dictionnaire avec les résultats agrégés
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Impossible d'ouvrir la vidéo: {video_path}")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Préparer la vidéo de sortie si demandée
        writer = None
        if output_path:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        all_results = []
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Traiter seulement certaines frames
            if frame_count % (frame_skip + 1) == 0:
                # Traiter la frame
                temp_path = f"temp_frame_{frame_count}.jpg"
                cv2.imwrite(temp_path, frame)
                
                try:
                    result = self.process_image(temp_path, mode=mode)
                    result['frame_number'] = frame_count
                    result['timestamp_video'] = frame_count / fps
                    all_results.append(result)
                    
                    # Annoter la frame si nécessaire
                    if writer:
                        annotated_frame = self._annotate_frame(frame, result)
                        writer.write(annotated_frame)
                finally:
                    # Nettoyer le fichier temporaire
                    Path(temp_path).unlink(missing_ok=True)
            
            frame_count += 1
        
        cap.release()
        if writer:
            writer.release()
        
        # Agréger les résultats
        return self._aggregate_video_results(all_results, mode)
    
    def _annotate_frame(self, frame: np.ndarray, result: Dict) -> np.ndarray:
        """Annote une frame avec les détections et poids"""
        annotated = frame.copy()
        
        pigs = result.get('pigs', [])
        if result.get('mode') == 'individual' and result.get('pig'):
            pigs = [result['pig']]
        
        for pig in pigs:
            x1, y1, x2, y2 = pig['bbox']
            
            # Dessiner le rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Préparer le texte
            code = pig.get('code', 'UNKNOWN')
            name = pig.get('name', '')
            weight = pig.get('weight_kg', 0)
            
            label = f"{code}"
            if name:
                label += f" {name}"
            label += f" {weight}KG"
            
            # Dessiner le label
            cv2.putText(
                annotated,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )
        
        return annotated
    
    def _generate_summary(self, pigs_data: List[Dict]) -> Dict:
        """Génère un résumé des résultats"""
        if not pigs_data:
            return {}
        
        weights = [p['weight_kg'] for p in pigs_data]
        total_weight = sum(weights)
        avg_weight = total_weight / len(weights)
        min_weight = min(weights)
        max_weight = max(weights)
        
        return {
            'total_pigs': len(pigs_data),
            'total_weight_kg': round(total_weight, 2),
            'average_weight_kg': round(avg_weight, 2),
            'min_weight_kg': round(min_weight, 2),
            'max_weight_kg': round(max_weight, 2)
        }
    
    def _aggregate_video_results(self, all_results: List[Dict], 
                                mode: Literal['individual', 'group']) -> Dict:
        """Agrège les résultats d'une vidéo"""
        if not all_results:
            return {
                'mode': mode,
                'total_frames_processed': 0,
                'pigs': [],
                'message': 'Aucun résultat'
            }
        
        # Pour le mode groupe, on agrège tous les porcs détectés
        all_pigs = {}
        
        for result in all_results:
            pigs = result.get('pigs', [])
            if result.get('mode') == 'individual' and result.get('pig'):
                pigs = [result['pig']]
            
            for pig in pigs:
                pig_id = pig.get('pig_id') or f"unknown_{len(all_pigs)}"
                
                if pig_id not in all_pigs:
                    all_pigs[pig_id] = {
                        'pig_id': pig_id,
                        'code': pig.get('code'),
                        'name': pig.get('name'),
                        'weights': [],
                        'detections': 0
                    }
                
                all_pigs[pig_id]['weights'].append(pig['weight_kg'])
                all_pigs[pig_id]['detections'] += 1
        
        # Calculer les moyennes
        final_pigs = []
        for pig_id, data in all_pigs.items():
            weights = data['weights']
            avg_weight = sum(weights) / len(weights)
            
            final_pigs.append({
                'pig_id': data['pig_id'],
                'code': data['code'] or pig_id,
                'name': data['name'] or '',
                'weight_kg': round(avg_weight, 2),
                'weight_min': round(min(weights), 2),
                'weight_max': round(max(weights), 2),
                'detections_count': data['detections']
            })
        
        return {
            'mode': mode,
            'total_frames_processed': len(all_results),
            'pigs': final_pigs,
            'summary': self._generate_summary(final_pigs)
        }
    
    def format_output(self, result: Dict) -> str:
        """
        Formate les résultats pour l'affichage
        
        Returns:
            String formatée avec les résultats
        """
        if result.get('mode') == 'individual':
            pig = result.get('pig', {})
            code = pig.get('code', 'UNKNOWN')
            name = pig.get('name', '')
            weight = pig.get('weight_kg', 0)
            
            return f"PORC {code} Nom: {name} Poids: {weight}KG"
        else:
            lines = []
            for pig in result.get('pigs', []):
                code = pig.get('code', 'UNKNOWN')
                name = pig.get('name', '')
                weight = pig.get('weight_kg', 0)
                lines.append(f"PORC {code} Nom: {name} Poids: {weight}KG")
            
            return "\n".join(lines)

