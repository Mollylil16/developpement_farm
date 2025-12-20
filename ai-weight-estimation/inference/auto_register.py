"""
Module d'enregistrement automatique des porcs
Permet d'enregistrer un porc détecté avec son image pour identification future
"""

import cv2
import numpy as np
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class AutoRegister:
    """Gère l'enregistrement automatique des porcs pour identification future"""
    
    def __init__(self, reid_system):
        """
        Initialise le système d'enregistrement automatique
        
        Args:
            reid_system: Instance de PigReID
        """
        self.reid = reid_system
    
    def register_detected_pig(self, image: np.ndarray, bbox: List[int], 
                            animal_id: str, metadata: Dict) -> bool:
        """
        Enregistre un porc détecté avec son image pour identification future
        
        Args:
            image: Image complète contenant le porc
            bbox: Bounding box du porc [x1, y1, x2, y2]
            animal_id: ID de l'animal dans la base de données
            metadata: Métadonnées de l'animal (code, nom, etc.)
            
        Returns:
            True si l'enregistrement a réussi
        """
        try:
            # Enregistrer dans le système Re-ID
            self.reid.register_pig(animal_id, image, bbox, metadata)
            logger.info(f"Porc {animal_id} ({metadata.get('code', 'N/A')}) enregistré avec succès")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement du porc {animal_id}: {e}")
            return False
    
    def suggest_animal_for_detection(self, image: np.ndarray, bbox: List[int],
                                   possible_animals: List[Dict]) -> Optional[Dict]:
        """
        Suggère l'animal le plus probable pour une détection non identifiée
        Basé sur la similarité avec les animaux déjà enregistrés
        
        Args:
            image: Image complète
            bbox: Bounding box du porc détecté
            possible_animals: Liste des animaux possibles depuis le backend
            
        Returns:
            Animal suggéré ou None
        """
        if not possible_animals or not self.reid:
            return None
        
        # Extraire les features du porc détecté
        try:
            query_features = self.reid.extract_features(image, bbox)
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction des features: {e}")
            return None
        
        best_match = None
        best_score = 0.0
        threshold = 0.5  # Seuil plus bas pour les suggestions
        
        # Comparer avec les animaux enregistrés
        for animal in possible_animals:
            animal_id = animal.get('id')
            if not animal_id or animal_id not in self.reid.pig_database:
                continue
            
            pig_data = self.reid.pig_database[animal_id]
            features = pig_data.get('features')
            
            if features is None:
                continue
            
            # Calculer la similarité
            try:
                similarity = np.dot(query_features, features) / (
                    np.linalg.norm(query_features) * np.linalg.norm(features)
                )
                
                if similarity > best_score and similarity >= threshold:
                    best_score = similarity
                    best_match = {
                        'animal_id': animal_id,
                        'code': animal.get('code', ''),
                        'name': animal.get('name', ''),
                        'similarity': float(similarity)
                    }
            except Exception as e:
                logger.error(f"Erreur lors du calcul de similarité: {e}")
                continue
        
        return best_match

