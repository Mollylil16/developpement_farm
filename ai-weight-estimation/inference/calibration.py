"""
Module de calibration automatique avec marqueurs ArUco
"""

import cv2
import numpy as np
from typing import Optional, Tuple, Dict, List
import cv2.aruco as aruco

class CalibrationSystem:
    """Système de calibration automatique"""
    
    def __init__(self, aruco_size_m: float = 0.2):
        """
        Args:
            aruco_size_m: Taille du marqueur ArUco en mètres (20cm par défaut)
        """
        self.aruco_size_m = aruco_size_m
        self.aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_6X6_250)
        self.aruco_params = aruco.DetectorParameters()
        
    def detect_aruco_markers(self, image: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[list]]:
        """
        Détecte les marqueurs ArUco dans l'image
        
        Args:
            image: Image BGR
            
        Returns:
            Tuple (corners, ids) ou (None, None) si aucun marqueur détecté
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        corners, ids, _ = aruco.detectMarkers(gray, self.aruco_dict, parameters=self.aruco_params)
        
        if ids is not None and len(ids) > 0:
            return corners, ids.tolist()
        
        return None, None
    
    def estimate_scale_from_aruco(self, image: np.ndarray) -> Optional[Dict]:
        """
        Estime l'échelle (pixels -> mètres) à partir d'un marqueur ArUco
        
        Args:
            image: Image BGR
            
        Returns:
            Dict avec pixel_to_meter, confidence, ou None si pas de marqueur
        """
        corners, ids = self.detect_aruco_markers(image)
        
        if corners is None or len(corners) == 0:
            return None
        
        # Prendre le premier marqueur détecté
        marker_corners = corners[0][0]
        
        # Calculer la taille du marqueur en pixels
        # Distance entre deux coins opposés
        corner1 = marker_corners[0]
        corner2 = marker_corners[2]
        pixel_size = np.linalg.norm(corner2 - corner1)
        
        # Conversion pixels -> mètres
        # Taille réelle du marqueur = aruco_size_m * sqrt(2) (diagonale)
        real_size_m = self.aruco_size_m * np.sqrt(2)
        pixel_to_meter = real_size_m / pixel_size if pixel_size > 0 else None
        
        if pixel_to_meter is None:
            return None
        
        return {
            'pixel_to_meter': float(pixel_to_meter),
            'marker_size_pixels': float(pixel_size),
            'marker_id': ids[0] if ids else None,
            'confidence': 0.95,  # Haute confiance si marqueur détecté
            'method': 'aruco'
        }
    
    def estimate_distance_from_height(self, image: np.ndarray, 
                                     camera_height_m: Optional[float] = None,
                                     pig_height_pixels: Optional[float] = None) -> Optional[Dict]:
        """
        Estime la distance caméra-porc à partir de la hauteur du porc
        
        Args:
            image: Image BGR
            camera_height_m: Hauteur de la caméra en mètres (si disponible)
            pig_height_pixels: Hauteur du porc en pixels (si déjà calculée)
            
        Returns:
            Dict avec distance estimée, ou None
        """
        # Cette méthode nécessite des informations supplémentaires
        # Pour l'instant, retourner None si pas assez d'infos
        if camera_height_m is None or pig_height_pixels is None:
            return None
        
        # Approximation basée sur la géométrie
        # Plus le porc est petit en pixels, plus il est loin
        # Cette formule est approximative et devrait être calibrée
        
        # Hauteur moyenne d'un porc adulte = ~0.6m
        avg_pig_height_m = 0.6
        
        # Estimation de distance (formule simplifiée)
        # distance ≈ (hauteur_réelle * focal_length) / hauteur_pixels
        # On utilise une approximation
        estimated_distance = (avg_pig_height_m * 1000) / pig_height_pixels  # Approximation
        
        return {
            'distance_m': float(estimated_distance),
            'confidence': 0.6,  # Confiance moyenne pour cette méthode
            'method': 'height_estimation'
        }
    
    def calibrate_camera(self, calibration_images: List[np.ndarray], 
                        checkerboard_size: Tuple[int, int] = (9, 6)) -> Optional[Dict]:
        """
        Calibre la caméra avec un pattern de damier
        
        Args:
            calibration_images: Liste d'images avec le pattern
            checkerboard_size: Taille du damier (corners)
            
        Returns:
            Dict avec paramètres de calibration (camera_matrix, dist_coeffs)
        """
        # Préparer les points objet
        objp = np.zeros((checkerboard_size[0] * checkerboard_size[1], 3), np.float32)
        objp[:, :2] = np.mgrid[0:checkerboard_size[0], 0:checkerboard_size[1]].T.reshape(-1, 2)
        
        objpoints = []  # Points 3D dans l'espace réel
        imgpoints = []  # Points 2D dans l'image
        
        for img in calibration_images:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            ret, corners = cv2.findChessboardCorners(gray, checkerboard_size, None)
            
            if ret:
                objpoints.append(objp)
                imgpoints.append(corners)
        
        if len(objpoints) < 3:
            return None  # Pas assez d'images pour calibration
        
        # Calibration
        ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
            objpoints, imgpoints, gray.shape[::-1], None, None
        )
        
        return {
            'camera_matrix': camera_matrix.tolist(),
            'dist_coeffs': dist_coeffs.tolist(),
            'ret': ret,
            'reprojection_error': ret
        }
    
    def get_capture_conditions(self, image: np.ndarray, 
                              scale_info: Optional[Dict] = None) -> Dict:
        """
        Évalue les conditions de capture
        
        Args:
            image: Image BGR
            scale_info: Informations d'échelle (depuis ArUco ou autre)
            
        Returns:
            Dict avec conditions de capture
        """
        conditions = {
            'has_scale_reference': scale_info is not None,
            'scale_method': scale_info.get('method') if scale_info else None,
            'distance_estimated_m': scale_info.get('distance_m') if scale_info else None
        }
        
        # Détecter l'éclairage (approximation)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        estimated_lux = brightness * 3.0  # Approximation
        
        conditions['lighting_lux'] = float(estimated_lux)
        conditions['lighting_quality'] = (
            'optimal' if estimated_lux > 300 else
            'standard' if estimated_lux > 150 else 'poor'
        )
        
        # Évaluer la qualité globale
        if conditions['has_scale_reference'] and conditions['lighting_quality'] == 'optimal':
            conditions['overall_quality'] = 'optimal'
        elif conditions['has_scale_reference'] or conditions['lighting_quality'] == 'optimal':
            conditions['overall_quality'] = 'standard'
        else:
            conditions['overall_quality'] = 'degraded'
        
        return conditions

