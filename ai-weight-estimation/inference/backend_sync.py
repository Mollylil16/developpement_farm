"""
Module de synchronisation avec le backend NestJS
Charge les animaux depuis l'API backend et les enregistre dans le système Re-ID
"""

import requests
from typing import List, Dict, Optional
import yaml
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class BackendSync:
    """Synchronise les animaux depuis le backend NestJS"""
    
    def __init__(self, config_path: str = "config/api_config.yaml"):
        """
        Initialise le système de synchronisation
        
        Args:
            config_path: Chemin vers le fichier de configuration
        """
        # Charger la configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # URL du backend NestJS
        backend_config = self.config.get('backend', {})
        self.backend_url = backend_config.get('url', 'http://localhost:3000')
        self.api_key = backend_config.get('api_key', None)
        
        # Headers pour les requêtes
        self.headers = {
            'Content-Type': 'application/json'
        }
        if self.api_key:
            self.headers['Authorization'] = f'Bearer {self.api_key}'
    
    def get_animals_from_backend(self, projet_id: Optional[str] = None, 
                                user_id: Optional[str] = None) -> List[Dict]:
        """
        Récupère tous les animaux depuis le backend
        
        Args:
            projet_id: ID du projet (optionnel)
            user_id: ID de l'utilisateur (optionnel)
            
        Returns:
            Liste des animaux avec leurs métadonnées
        """
        try:
            # Construire l'URL
            url = f"{self.backend_url}/production/animaux"
            params = {}
            
            if projet_id:
                params['projet_id'] = projet_id
            if user_id:
                params['user_id'] = user_id
            
            # Faire la requête
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            animals = response.json()
            
            logger.info(f"Récupéré {len(animals)} animaux depuis le backend")
            return animals
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la récupération des animaux: {e}")
            return []
    
    def format_animal_metadata(self, animal: Dict) -> Dict:
        """
        Formate les métadonnées d'un animal pour le système Re-ID
        
        Args:
            animal: Données de l'animal depuis le backend
            
        Returns:
            Métadonnées formatées
        """
        return {
            'code': animal.get('code', ''),
            'name': animal.get('nom', ''),
            'animal_id': animal.get('id', ''),
            'projet_id': animal.get('projet_id', ''),
            'sexe': animal.get('sexe', ''),
            'race': animal.get('race', ''),
            'date_naissance': animal.get('date_naissance', ''),
            'poids_initial': animal.get('poids_initial', 0),
            'categorie': animal.get('categorie', '')
        }
    
    def sync_animals_to_reid(self, reid_system, projet_id: Optional[str] = None,
                            user_id: Optional[str] = None) -> int:
        """
        Synchronise les animaux depuis le backend vers le système Re-ID
        
        Args:
            reid_system: Instance de PigReID
            projet_id: ID du projet (optionnel)
            user_id: ID de l'utilisateur (optionnel)
            
        Returns:
            Nombre d'animaux synchronisés
        """
        animals = self.get_animals_from_backend(projet_id, user_id)
        
        if not animals:
            logger.warning("Aucun animal récupéré depuis le backend")
            return 0
        
        synced_count = 0
        
        for animal in animals:
            try:
                animal_id = animal.get('id')
                if not animal_id:
                    continue
                
                # Formater les métadonnées
                metadata = self.format_animal_metadata(animal)
                
                # Vérifier si l'animal est déjà enregistré
                if animal_id in reid_system.pig_database:
                    # Mettre à jour les métadonnées
                    reid_system.pig_database[animal_id]['metadata'] = metadata
                    logger.debug(f"Métadonnées mises à jour pour l'animal {animal_id}")
                else:
                    # L'animal n'a pas encore d'image associée dans Re-ID
                    # On l'enregistre avec des métadonnées vides pour les features
                    # Les features seront ajoutées lors de la première détection
                    reid_system.pig_database[animal_id] = {
                        'features': None,  # Sera rempli lors de la première détection
                        'metadata': metadata,
                        'bbox': None
                    }
                    logger.debug(f"Animal {animal_id} enregistré dans Re-ID (en attente d'image)")
                
                synced_count += 1
                
            except Exception as e:
                logger.error(f"Erreur lors de la synchronisation de l'animal {animal.get('id')}: {e}")
                continue
        
        logger.info(f"{synced_count} animaux synchronisés vers Re-ID")
        return synced_count
    
    def get_animal_by_id(self, animal_id: str) -> Optional[Dict]:
        """
        Récupère un animal spécifique depuis le backend
        
        Args:
            animal_id: ID de l'animal
            
        Returns:
            Données de l'animal ou None
        """
        try:
            url = f"{self.backend_url}/production/animaux/{animal_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la récupération de l'animal {animal_id}: {e}")
            return None
    
    def update_animal_metadata_in_reid(self, reid_system, animal_id: str) -> bool:
        """
        Met à jour les métadonnées d'un animal spécifique dans Re-ID
        
        Args:
            reid_system: Instance de PigReID
            animal_id: ID de l'animal
            
        Returns:
            True si la mise à jour a réussi
        """
        animal = self.get_animal_by_id(animal_id)
        
        if not animal:
            return False
        
        metadata = self.format_animal_metadata(animal)
        
        if animal_id in reid_system.pig_database:
            reid_system.pig_database[animal_id]['metadata'] = metadata
            return True
        else:
            # Créer une entrée si elle n'existe pas
            reid_system.pig_database[animal_id] = {
                'features': None,
                'metadata': metadata,
                'bbox': None
            }
            return True

