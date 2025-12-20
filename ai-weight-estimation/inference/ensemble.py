"""
Module de fusion bayésienne des modèles d'estimation de poids
"""

import numpy as np
from typing import List, Dict, Optional
import yaml

class WeightEnsemble:
    """Fusion bayésienne des estimations de poids"""
    
    def __init__(self, config_path: str = "config/inference_config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.weights = self.config['inference']['weight_estimation']['ensemble_weights']
        self.methods = self.config['inference']['weight_estimation']['methods']
    
    def fuse_predictions(self, predictions: Dict[str, Dict]) -> Dict:
        """
        Fusionne les prédictions de plusieurs modèles
        
        Args:
            predictions: Dict avec clés 'geometric', 'cnn', 'transformer'
                       Chaque valeur contient {'weight_kg', 'confidence'}
            
        Returns:
            Dict avec poids fusionné, intervalle de confiance, etc.
        """
        if not predictions:
            return None
        
        # Collecter les poids et confiances
        weights = []
        confidences = []
        model_weights = []
        
        for method in self.methods:
            if method in predictions and method in self.weights:
                pred = predictions[method]
                if 'weight_kg' in pred and 'confidence' in pred:
                    weights.append(pred['weight_kg'])
                    confidences.append(pred['confidence'])
                    model_weights.append(self.weights[method])
        
        if not weights:
            return None
        
        # Normaliser les poids du modèle
        total_weight = sum(model_weights)
        normalized_weights = [w / total_weight for w in model_weights]
        
        # Fusion pondérée avec ajustement par confiance
        # w_final = Σ(w_i * conf_i * model_weight_i) / Σ(conf_i * model_weight_i)
        numerator = sum(w * c * mw for w, c, mw in zip(weights, confidences, normalized_weights))
        denominator = sum(c * mw for c, mw in zip(confidences, normalized_weights))
        
        if denominator == 0:
            # Fallback: moyenne simple pondérée
            fused_weight = sum(w * mw for w, mw in zip(weights, normalized_weights))
            fused_confidence = np.mean(confidences)
        else:
            fused_weight = numerator / denominator
            fused_confidence = denominator / sum(normalized_weights)  # Confiance moyenne pondérée
        
        # Calculer l'incertitude
        # Variance pondérée des prédictions
        variance = sum(
            mw * c * (w - fused_weight)**2
            for w, c, mw in zip(weights, confidences, normalized_weights)
        ) / sum(c * mw for c, mw in zip(confidences, normalized_weights))
        
        std_dev = np.sqrt(variance) if variance > 0 else np.std(weights)
        
        # Intervalle de confiance 95%
        margin = 1.96 * std_dev  # Z-score pour 95%
        
        return {
            'weight_kg': round(fused_weight, 2),
            'confidence': round(float(fused_confidence), 3),
            'interval': {
                'lower': round(fused_weight - margin, 2),
                'upper': round(fused_weight + margin, 2),
                'margin': round(margin, 2)
            },
            'std_dev': round(float(std_dev), 2),
            'method': 'ensemble',
            'individual_predictions': {
                method: predictions[method] for method in self.methods if method in predictions
            },
            'weights_used': {method: self.weights[method] for method in self.methods if method in self.weights}
        }
    
    def calculate_uncertainty(self, predictions: Dict[str, Dict]) -> float:
        """
        Calcule l'incertitude globale de la fusion
        
        Args:
            predictions: Dict des prédictions individuelles
            
        Returns:
            Score d'incertitude (0-1, plus bas = plus certain)
        """
        if not predictions:
            return 1.0
        
        # Collecter les poids
        weights = [pred['weight_kg'] for pred in predictions.values() if 'weight_kg' in pred]
        
        if len(weights) < 2:
            return 0.5  # Incertitude moyenne si un seul modèle
        
        # Coefficient de variation (écart-type / moyenne)
        mean_weight = np.mean(weights)
        std_weight = np.std(weights)
        
        if mean_weight == 0:
            return 1.0
        
        cv = std_weight / mean_weight
        
        # Normaliser en score d'incertitude (0-1)
        uncertainty = min(cv, 1.0)
        
        return float(uncertainty)
    
    def get_best_single_prediction(self, predictions: Dict[str, Dict]) -> Optional[Dict]:
        """
        Retourne la meilleure prédiction individuelle (par confiance)
        
        Args:
            predictions: Dict des prédictions
            
        Returns:
            Meilleure prédiction ou None
        """
        if not predictions:
            return None
        
        best_method = None
        best_confidence = 0.0
        
        for method, pred in predictions.items():
            if 'confidence' in pred and pred['confidence'] > best_confidence:
                best_confidence = pred['confidence']
                best_method = method
        
        if best_method:
            return {
                **predictions[best_method],
                'method': best_method
            }
        
        return None

