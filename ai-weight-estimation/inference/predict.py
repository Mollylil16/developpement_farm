"""
Module principal d'inférence - Pipeline complet selon le README
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Literal
from pathlib import Path
import yaml
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)

from .detector import PigDetector
from .segmentation import PigSegmenter
from .reid import PigReID
from .keypoints import KeypointDetector
from .weight_estimator import WeightEstimator
from .ensemble import WeightEnsemble
from .preprocessing import ImagePreprocessor
from .postprocessing import ResultPostprocessor
from .calibration import CalibrationSystem
from .backend_sync import BackendSync
from .auto_register import AutoRegister
from .video_tracker import VideoTracker

class WeightEstimationPipeline:
    """Pipeline complet pour la pesée automatique selon le README"""
    
    def __init__(self, config_path: str = "config/inference_config.yaml"):
        """
        Initialise le pipeline complet avec tous les modules
        
        Args:
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        with open("config/model_config.yaml", 'r') as f:
            self.model_config = yaml.safe_load(f)
        
        # Initialiser les composants
        print("Chargement des modèles...")
        try:
            self.detector = PigDetector(config_path="config/model_config.yaml")
        except Exception as e:
            print(f"⚠️  Erreur lors du chargement du détecteur: {e}")
            raise
        
        self.preprocessor = ImagePreprocessor(config_path=config_path)
        self.postprocessor = ResultPostprocessor(config_path=config_path)
        self.calibration = CalibrationSystem()
        
        # Initialiser la synchronisation avec le backend
        try:
            self.backend_sync = BackendSync(config_path="config/api_config.yaml")
        except Exception as e:
            print(f"⚠️  Erreur lors de l'initialisation de la synchronisation backend: {e}")
            self.backend_sync = None
        
        # Initialiser le système d'enregistrement automatique
        self.auto_register = None
        
        try:
            self.reid = PigReID(config_path="config/model_config.yaml")
            
            # Synchroniser les animaux depuis le backend si disponible
            if self.backend_sync:
                try:
                    # Récupérer projet_id et user_id depuis les métadonnées si disponibles
                    projet_id = self.config.get('backend', {}).get('default_projet_id')
                    user_id = self.config.get('backend', {}).get('default_user_id')
                    self.backend_sync.sync_animals_to_reid(self.reid, projet_id, user_id)
                except Exception as e:
                    print(f"⚠️  Erreur lors de la synchronisation des animaux: {e}")
            
            # Initialiser le système d'enregistrement automatique
            if self.reid:
                self.auto_register = AutoRegister(self.reid)
        except Exception as e:
            print(f"⚠️  Erreur lors du chargement du Re-ID: {e}")
            # Re-ID peut être optionnel pour le démarrage
            self.reid = None
        
        try:
            self.weight_estimator_cnn = WeightEstimator(config_path="config/model_config.yaml")
        except Exception as e:
            print(f"⚠️  Erreur lors du chargement de l'estimateur de poids: {e}")
            # L'estimateur peut être optionnel pour le démarrage
            self.weight_estimator_cnn = None
        
        # Modules optionnels selon config
        try:
            if self.config.get('inference', {}).get('use_segmentation', False):
                self.segmenter = PigSegmenter(config_path="config/model_config.yaml")
            else:
                self.segmenter = None
        except:
            self.segmenter = None
        
        try:
            if self.config.get('inference', {}).get('use_keypoints', False):
                self.keypoint_detector = KeypointDetector(config_path="config/model_config.yaml")
            else:
                self.keypoint_detector = None
        except:
            self.keypoint_detector = None
        
        try:
            if self.config.get('inference', {}).get('use_ensemble', False):
                self.ensemble = WeightEnsemble(config_path=config_path)
            else:
                self.ensemble = None
        except:
            self.ensemble = None
        
        # Initialiser le tracker vidéo
        self.video_tracker = VideoTracker(
            max_age=self.config.get('inference', {}).get('tracking', {}).get('max_age', 30),
            min_hits=self.config.get('inference', {}).get('tracking', {}).get('min_hits', 3),
            iou_threshold=self.config.get('inference', {}).get('tracking', {}).get('iou_threshold', 0.3)
        )
        
        print("✅ Pipeline initialisé avec succès!")
    
    def predict(self, image: np.ndarray, metadata: Optional[Dict] = None,
               mode: Literal['individual', 'group'] = 'group',
               expected_pigs: Optional[List[str]] = None,
               projet_id: Optional[str] = None,
               user_id: Optional[str] = None) -> Dict:
        """
        Prédiction complète selon le README
        
        Args:
            image: Image BGR
            metadata: Métadonnées (race, âge, conditions de capture, etc.)
            mode: Mode de traitement
            expected_pigs: Liste des IDs de porcs attendus (pour mode groupe)
            projet_id: ID du projet (pour synchronisation backend)
            user_id: ID de l'utilisateur (pour synchronisation backend)
            
        Returns:
            Dict avec résultats complets
        """
        start_time = time.time()
        
        # Synchroniser les animaux depuis le backend si projet_id/user_id fournis
        if self.backend_sync and self.reid and (projet_id or user_id):
            try:
                self.backend_sync.sync_animals_to_reid(self.reid, projet_id, user_id)
            except Exception as e:
                logger.warning(f"Erreur lors de la synchronisation: {e}")
        
        # 1. Évaluer les conditions de capture
        lighting_info = self.preprocessor.detect_lighting_conditions(image)
        scale_info = self.calibration.estimate_scale_from_aruco(image)
        capture_conditions = self.calibration.get_capture_conditions(image, scale_info)
        
        # 2. Prétraiter l'image
        processed_image, preprocess_metadata = self.preprocessor.preprocess_for_detection(image)
        
        # 3. Détecter les porcs
        detections = self.detector.detect(processed_image)
        
        if not detections:
            return {
                'success': False,
                'error': 'no_pigs_detected',
                'message': 'Aucun porc détecté dans l\'image',
                'capture_conditions': capture_conditions,
                'processing_time_ms': int((time.time() - start_time) * 1000)
            }
        
        # Transformer les bboxes vers l'image originale
        for det in detections:
            det['bbox'] = self.postprocessor.transform_bbox(det['bbox'], preprocess_metadata)
        
        # 4. Segmentation (si activée)
        segments = []
        if self.segmenter:
            segments = self.segmenter.segment(image, detections)
            # Associer les segments aux détections
            for i, det in enumerate(detections):
                if i < len(segments):
                    det['mask'] = segments[i]['mask']
                    det['area_pixels'] = segments[i]['area_pixels']
        
        # 5. Ré-identification
        if self.reid:
            identified_detections = self.reid.identify_batch(image, detections)
            
            # Si un porc est identifié mais n'a pas de métadonnées, les récupérer depuis le backend
            if self.backend_sync:
                for det in identified_detections:
                    pig_id = det.get('pig_id')
                    if pig_id and (not det.get('metadata') or not det.get('metadata').get('code')):
                        # Récupérer les métadonnées depuis le backend
                        self.backend_sync.update_animal_metadata_in_reid(self.reid, pig_id)
                        # Mettre à jour les métadonnées dans la détection
                        if pig_id in self.reid.pig_database:
                            det['metadata'] = self.reid.pig_database[pig_id].get('metadata', {})
        else:
            # Si Re-ID non disponible, utiliser les détections telles quelles
            identified_detections = detections
            for det in identified_detections:
                det['pig_id'] = None
                det['similarity'] = 0.0
                det['metadata'] = {}
        
        # 5b. Pour les porcs non identifiés, proposer des candidats depuis le backend
        # (utile si l'utilisateur veut sélectionner manuellement)
        if self.backend_sync and (projet_id or user_id):
            for det in identified_detections:
                if not det.get('pig_id'):
                    # Récupérer la liste des animaux du projet pour suggestion
                    animals = self.backend_sync.get_animals_from_backend(projet_id, user_id)
                    if animals:
                        # Ajouter la liste des animaux possibles pour aide à l'identification
                        det['possible_animals'] = [
                            {
                                'id': a.get('id'),
                                'code': a.get('code', ''),
                                'name': a.get('nom', ''),
                                'categorie': a.get('categorie', '')
                            }
                            for a in animals[:10]  # Limiter à 10 pour l'affichage
                        ]
        
        # 6. Détection des points clés (si activée)
        keypoints_data = []
        if self.keypoint_detector:
            for det in identified_detections:
                kp_result = self.keypoint_detector.detect(image, det['bbox'])
                det['keypoints'] = kp_result
                keypoints_data.append(kp_result)
        
        # 7. Estimation de poids - Approche multi-modale
        all_predictions = []
        
        for det in identified_detections:
            pig_predictions = {}
            
            # CNN
            if self.weight_estimator_cnn:
                cnn_result = self.weight_estimator_cnn.estimate_from_image(image, det['bbox'])
                pig_predictions['cnn'] = {
                    'weight_kg': cnn_result['weight_kg'],
                    'confidence': det.get('confidence', 0.8)
                }
            else:
                # Estimation basique si le modèle n'est pas disponible
                # Utiliser une estimation basée sur la taille de la bbox
                bbox = det['bbox']
                area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                # Approximation très basique (à remplacer par un vrai modèle)
                estimated_weight = area / 100.0  # Approximation grossière
                pig_predictions['cnn'] = {
                    'weight_kg': max(5, min(300, estimated_weight)),  # Clamp entre 5 et 300 kg
                    'confidence': 0.5  # Confiance faible car estimation basique
                }
            
            # Géométrique (si keypoints disponibles)
            if self.keypoint_detector and 'keypoints' in det:
                geometric_weight = self._estimate_weight_geometric(
                    det['keypoints'], scale_info
                )
                if geometric_weight:
                    pig_predictions['geometric'] = geometric_weight
            
            # Transformer (à implémenter si nécessaire)
            # Pour l'instant, on utilise seulement CNN et géométrique
            
            # Fusion ensemble
            if self.ensemble and len(pig_predictions) > 1:
                final_prediction = self.ensemble.fuse_predictions(pig_predictions)
            else:
                # Utiliser la meilleure prédiction individuelle
                final_prediction = self.ensemble.get_best_single_prediction(pig_predictions) if self.ensemble else pig_predictions.get('cnn')
                if final_prediction:
                    final_prediction = {
                        'weight_kg': final_prediction['weight_kg'],
                        'confidence': final_prediction.get('confidence', 0.8),
                        'method': final_prediction.get('method', 'cnn'),
                        'interval': {
                            'lower': final_prediction.get('weight_kg', 0) - 1.0,
                            'upper': final_prediction.get('weight_kg', 0) + 1.0,
                            'margin': 1.0
                        }
                    }
            
            if final_prediction:
                # Déterminer la classe de poids
                weight_class = self._get_weight_class(final_prediction['weight_kg'])
                
                # Calculer l'intervalle de confiance selon la classe
                interval = self.postprocessor.calculate_confidence_interval(
                    final_prediction['weight_kg'],
                    final_prediction['confidence'],
                    weight_class
                )
                final_prediction['interval'] = interval
                
                # Construire le résultat final
                # Récupérer les métadonnées (code, nom) depuis le backend si disponible
                pig_id = det.get('pig_id')
                metadata = det.get('metadata', {})
                
                # Si on a un pig_id mais pas de métadonnées complètes, essayer de les récupérer
                if pig_id and self.backend_sync and (not metadata.get('code') or not metadata.get('name')):
                    animal_data = self.backend_sync.get_animal_by_id(pig_id)
                    if animal_data:
                        metadata = self.backend_sync.format_animal_metadata(animal_data)
                        # Mettre à jour dans Re-ID pour la prochaine fois
                        if self.reid and pig_id in self.reid.pig_database:
                            self.reid.pig_database[pig_id]['metadata'] = metadata
                
                # Si le porc n'est pas identifié, récupérer la liste des animaux possibles
                possible_animals = det.get('possible_animals', [])
                
                # Si le porc n'est pas identifié et qu'on a des candidats, suggérer le plus probable
                suggested_animal = None
                if not pig_id and self.auto_register and possible_animals:
                    suggested_animal = self.auto_register.suggest_animal_for_detection(
                        image, det['bbox'], possible_animals
                    )
                    if suggested_animal:
                        logger.info(f"Animal suggéré: {suggested_animal.get('code')} (similarité: {suggested_animal.get('similarity', 0):.2f})")
                
                pig_result = {
                    'pig_id': pig_id,
                    'code': metadata.get('code', pig_id or 'NON_IDENTIFIE'),
                    'name': metadata.get('name', ''),
                    'bbox': det['bbox'],
                    'confidence': det['confidence'],
                    'weight_estimation': final_prediction,
                    'keypoints': det.get('keypoints'),
                    'segmentation': {
                        'has_mask': 'mask' in det,
                        'area_pixels': det.get('area_pixels')
                    } if 'mask' in det else None,
                    'identified': pig_id is not None,  # Indique si le porc a été identifié
                    'possible_animals': possible_animals if not pig_id else [],  # Candidats si non identifié
                    'suggested_animal': suggested_animal  # Animal suggéré par l'IA
                }
                
                all_predictions.append(pig_result)
        
        # 8. Post-traitement
        filtered_predictions = self.postprocessor.filter_by_confidence(
            all_predictions,
            self.config['inference']['weight_estimation']['min_confidence']
        )
        
        # 9. Formater la réponse
        processing_time = int((time.time() - start_time) * 1000)
        
        if mode == 'individual' and filtered_predictions:
            result = {
                'success': True,
                'mode': mode,
                'pig': filtered_predictions[0],
                'capture_conditions': capture_conditions,
                'processing_time_ms': processing_time,
                'timestamp': datetime.now().isoformat()
            }
        else:
            result = {
                'success': True,
                'mode': mode,
                'total_detected': len(filtered_predictions),
                'predictions': filtered_predictions,
                'summary': self._generate_summary(filtered_predictions),
                'capture_conditions': capture_conditions,
                'processing_time_ms': processing_time,
                'timestamp': datetime.now().isoformat()
            }
        
        return result
    
    def predict_video(self, video_path: str, projet_id: Optional[str] = None,
                     user_id: Optional[str] = None, frame_skip: int = 5,
                     output_path: Optional[str] = None) -> Dict:
        """
        Traite une vidéo avec tracking pour peser tous les porcs
        
        Args:
            video_path: Chemin vers la vidéo
            projet_id: ID du projet
            user_id: ID de l'utilisateur
            frame_skip: Nombre de frames à sauter (pour performance)
            output_path: Chemin pour sauvegarder la vidéo annotée
            
        Returns:
            Dict avec résultats de pesée pour chaque porc suivi
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                'success': False,
                'error': 'cannot_open_video',
                'message': f'Impossible d\'ouvrir la vidéo: {video_path}'
            }
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Préparer la vidéo de sortie si demandée
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Synchroniser les animaux au début
        if self.backend_sync and self.reid and (projet_id or user_id):
            try:
                self.backend_sync.sync_animals_to_reid(self.reid, projet_id, user_id)
            except Exception as e:
                logger.warning(f"Erreur lors de la synchronisation: {e}")
        
        frame_count = 0
        all_tracks = {}
        
        logger.info(f"Début du traitement vidéo: {total_frames} frames à {fps} fps")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Traiter seulement certaines frames (pour performance)
            if frame_count % (frame_skip + 1) == 0:
                # Détecter les porcs dans cette frame
                detections = self.detector.detect(frame)
                
                if detections:
                    # Identifier les porcs
                    if self.reid:
                        identified_detections = self.reid.identify_batch(frame, detections)
                    else:
                        identified_detections = detections
                        for det in identified_detections:
                            det['pig_id'] = None
                            det['metadata'] = {}
                    
                    # Estimer le poids pour chaque détection
                    for det in identified_detections:
                        if self.weight_estimator_cnn:
                            weight_info = self.weight_estimator_cnn.estimate_from_image(frame, det['bbox'])
                            det['weight'] = weight_info
                        else:
                            # Estimation basique
                            bbox = det['bbox']
                            area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                            estimated_weight = max(5, min(300, area / 100.0))
                            det['weight'] = {
                                'weight_kg': estimated_weight,
                                'weight_min': estimated_weight - 1,
                                'weight_max': estimated_weight + 1
                            }
                    
                    # Mettre à jour le tracker
                    tracks = self.video_tracker.update(identified_detections, frame_count)
                    
                    # Mettre à jour les tracks avec les identifications
                    for track in tracks:
                        track_id = track['track_id']
                        
                        # Trouver la détection correspondante
                        for det in identified_detections:
                            # Associer par position (bbox similaire)
                            if self._bbox_similar(det['bbox'], track['bbox']):
                                # Mettre à jour les métadonnées de la track
                                if det.get('pig_id'):
                                    track['pig_id'] = det['pig_id']
                                    track['metadata'] = det.get('metadata', {})
                                
                                # Récupérer les métadonnées depuis le backend si nécessaire
                                if track.get('pig_id') and self.backend_sync:
                                    if not track.get('metadata') or not track['metadata'].get('code'):
                                        animal_data = self.backend_sync.get_animal_by_id(track['pig_id'])
                                        if animal_data:
                                            track['metadata'] = self.backend_sync.format_animal_metadata(animal_data)
                                
                                break
                        
                        # Stocker la track
                        if track_id not in all_tracks:
                            all_tracks[track_id] = {
                                'track_id': track_id,
                                'pig_id': track.get('pig_id'),
                                'metadata': track.get('metadata', {}),
                                'weight_history': track.get('weight_history', []),
                                'first_seen': track.get('first_seen', frame_count),
                                'last_seen': track.get('last_seen', frame_count),
                                'hits': track.get('hits', 0)
                            }
                        else:
                            all_tracks[track_id].update({
                                'last_seen': track.get('last_seen', frame_count),
                                'hits': track.get('hits', 0),
                                'weight_history': track.get('weight_history', [])
                            })
                    
                    # Annoter la frame si nécessaire
                    if writer:
                        annotated_frame = self._annotate_video_frame(frame, tracks)
                        writer.write(annotated_frame)
            
            frame_count += 1
            
            # Log de progression
            if frame_count % (fps * 5) == 0:  # Toutes les 5 secondes
                progress = (frame_count / total_frames) * 100
                logger.info(f"Progression: {progress:.1f}% ({frame_count}/{total_frames} frames)")
        
        cap.release()
        if writer:
            writer.release()
        
        # Agréger les résultats par porc
        final_results = []
        for track_id, track_data in all_tracks.items():
            weight_history = track_data.get('weight_history', [])
            
            if not weight_history:
                continue
            
            # Calculer le poids moyen pondéré par la confiance
            weights = [w['weight_kg'] for w in weight_history]
            confidences = [w.get('confidence', 0.8) for w in weight_history]
            
            total_weight = sum(w * c for w, c in zip(weights, confidences))
            total_confidence = sum(confidences)
            avg_weight = total_weight / total_confidence if total_confidence > 0 else sum(weights) / len(weights)
            
            # Récupérer les métadonnées
            metadata = track_data.get('metadata', {})
            
            final_results.append({
                'track_id': track_id,
                'pig_id': track_data.get('pig_id'),
                'code': metadata.get('code', f'TRACK_{track_id}'),
                'name': metadata.get('name', ''),
                'weight_kg': round(avg_weight, 2),
                'weight_min': round(min(weights), 2),
                'weight_max': round(max(weights), 2),
                'weight_std': round(np.std(weights) if len(weights) > 1 else 0, 2),
                'detections_count': len(weight_history),
                'duration_seconds': (track_data['last_seen'] - track_data['first_seen']) / fps if fps > 0 else 0,
                'identified': track_data.get('pig_id') is not None
            })
        
        return {
            'success': True,
            'mode': 'video',
            'total_frames_processed': frame_count,
            'total_tracks': len(all_tracks),
            'pigs': final_results,
            'summary': self._generate_summary(final_results),
            'timestamp': datetime.now().isoformat()
        }
    
    def _estimate_weight_geometric(self, keypoints: Dict, scale_info: Optional[Dict]) -> Optional[Dict]:
        """Estime le poids via l'approche géométrique"""
        if not self.keypoint_detector or not keypoints:
            return None
        
        # Calculer les dimensions
        pixel_to_meter = scale_info.get('pixel_to_meter') if scale_info else None
        dimensions = self.keypoint_detector.calculate_dimensions(keypoints, pixel_to_meter)
        
        if not dimensions.get('length_m') or not dimensions.get('width_m') or not dimensions.get('height_m'):
            return None
        
        # Formule allométrique simplifiée
        # Volume approximatif (ellipsoïde)
        length = dimensions['length_m']
        width = dimensions['width_m']
        height = dimensions['height_m']
        
        volume_m3 = (4/3) * np.pi * (length/2) * (width/2) * (height/2)
        
        # Densité moyenne d'un porc ≈ 1000 kg/m³ (approximation)
        # Mais on utilise une formule plus précise basée sur l'entraînement
        # Pour l'instant, formule simplifiée
        estimated_weight = volume_m3 * 850  # kg/m³ ajusté
        
        return {
            'weight_kg': round(estimated_weight, 2),
            'confidence': 0.75,  # Confiance moyenne pour géométrique
            'method': 'geometric',
            'dimensions': dimensions
        }
    
    def _get_weight_class(self, weight_kg: float) -> str:
        """Détermine la classe de poids"""
        if weight_kg < 30:
            return 'porcelets'
        elif weight_kg < 80:
            return 'croissance'
        elif weight_kg < 120:
            return 'finition'
        else:
            return 'adultes'
    
    def _generate_summary(self, predictions: List[Dict]) -> Dict:
        """Génère un résumé des résultats"""
        if not predictions:
            return {}
        
        # Extraire les poids selon le format
        weights = []
        for p in predictions:
            if 'weight_estimation' in p:
                weights.append(p['weight_estimation']['weight_kg'])
            elif 'weight_kg' in p:
                weights.append(p['weight_kg'])
        
        if not weights:
            return {}
        
        total_weight = sum(weights)
        avg_weight = total_weight / len(weights)
        
        return {
            'total_pigs': len(predictions),
            'total_weight_kg': round(total_weight, 2),
            'average_weight_kg': round(avg_weight, 2),
            'min_weight_kg': round(min(weights), 2),
            'max_weight_kg': round(max(weights), 2)
        }
    
    def _bbox_similar(self, bbox1: List[int], bbox2: List[int], threshold: float = 0.5) -> bool:
        """Vérifie si deux bboxes sont similaires (IoU > threshold)"""
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2
        
        # Zone d'intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return False
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        iou = intersection / union if union > 0 else 0
        return iou >= threshold
    
    def _annotate_video_frame(self, frame: np.ndarray, tracks: List[Dict]) -> np.ndarray:
        """Annote une frame vidéo avec les tracks"""
        annotated = frame.copy()
        
        for track in tracks:
            x1, y1, x2, y2 = track['bbox']
            
            # Couleur selon l'identification
            if track.get('pig_id'):
                color = (0, 255, 0)  # Vert pour identifié
            else:
                color = (0, 165, 255)  # Orange pour non identifié
            
            # Dessiner le rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Préparer le label
            code = track.get('metadata', {}).get('code', f"TRACK_{track['track_id']}")
            name = track.get('metadata', {}).get('name', '')
            avg_weight = track.get('average_weight_kg', 0)
            
            label = f"{code}"
            if name:
                label += f" {name}"
            if avg_weight > 0:
                label += f" {avg_weight:.1f}kg"
            
            # Dessiner le label
            cv2.putText(
                annotated,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )
        
        return annotated
    
    def format_output(self, result: Dict) -> str:
        """Formate les résultats pour l'affichage"""
        if not result.get('success'):
            return result.get('message', 'Erreur')
        
        if result.get('mode') == 'individual' and result.get('pig'):
            pig = result['pig']
            code = pig.get('code', 'UNKNOWN')
            name = pig.get('name', '')
            weight = pig['weight_estimation']['weight_kg']
            margin = pig['weight_estimation']['interval']['margin']
            confidence = pig['confidence'] * 100
            
            return f"PORC #{code} | Nom: {name} | Poids: {weight:.1f}kg ±{margin:.1f}kg | Confiance: {confidence:.0f}%"
        else:
            lines = []
            for pred in result.get('predictions', []):
                code = pred.get('code', 'UNKNOWN')
                name = pred.get('name', '')
                weight = pred['weight_estimation']['weight_kg']
                margin = pred['weight_estimation']['interval']['margin']
                confidence = pred['confidence'] * 100
                
                lines.append(
                    f"PORC #{code} | Nom: {name} | Poids: {weight:.1f}kg ±{margin:.1f}kg | Confiance: {confidence:.0f}%"
                )
            
            return "\n".join(lines)
