"""
Script d'entraînement pour le modèle de détection de porcs (YOLOv8)
"""

from ultralytics import YOLO
import yaml
from pathlib import Path

def train_detection_model(config_path: str = "config/config.yaml"):
    """
    Entraîne le modèle de détection YOLOv8
    
    Args:
        config_path: Chemin vers le fichier de configuration
    """
    # Charger la configuration
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    training_config = config['training']['detection']
    paths_config = config['paths']
    
    # Initialiser le modèle YOLOv8
    # Utiliser yolov8n (nano) pour commencer, peut être changé en yolov8s, yolov8m, etc.
    model = YOLO('yolov8n.pt')  # Modèle pré-entraîné sur COCO
    
    # Configuration du dataset
    # Format YOLO attendu:
    # data/
    #   images/
    #     train/
    #     val/
    #   labels/
    #     train/
    #     val/
    
    dataset_yaml = {
        'path': str(Path(paths_config['data_dir']).absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'nc': 1,  # Nombre de classes (1 = porc)
        'names': ['pig']  # Nom de la classe
    }
    
    # Sauvegarder le fichier dataset.yaml
    dataset_yaml_path = Path(paths_config['data_dir']) / 'dataset.yaml'
    with open(dataset_yaml_path, 'w') as f:
        yaml.dump(dataset_yaml, f)
    
    # Entraîner le modèle
    results = model.train(
        data=str(dataset_yaml_path),
        epochs=training_config['epochs'],
        imgsz=training_config['img_size'],
        batch=training_config['batch_size'],
        lr0=training_config['learning_rate'],
        name='pig_detection',
        project='runs/detection',
        save=True,
        plots=True
    )
    
    # Sauvegarder le meilleur modèle
    best_model_path = Path('runs/detection/pig_detection/weights/best.pt')
    target_path = Path(config['models']['detection']['path'])
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    if best_model_path.exists():
        import shutil
        shutil.copy(best_model_path, target_path)
        print(f"Modèle sauvegardé dans: {target_path}")
    
    return results

if __name__ == "__main__":
    train_detection_model()

