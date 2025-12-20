"""
Script utilitaire pour préparer les données d'entraînement
Aide à organiser les images et créer les fichiers d'annotations
"""

import pandas as pd
from pathlib import Path
import json
import yaml

def create_annotation_templates():
    """Crée des templates pour les fichiers d'annotations"""
    
    # Template pour la détection (YOLO format)
    yolo_template = {
        "format": "YOLO",
        "description": "Format YOLO pour la détection d'objets",
        "columns": ["class_id", "x_center", "y_center", "width", "height"],
        "note": "Les coordonnées sont normalisées (0-1)"
    }
    
    # Template pour la ré-identification
    reid_template = {
        "format": "CSV",
        "columns": ["image_path", "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2", "pig_id", "code", "name"],
        "description": "Fichier CSV avec les annotations pour la ré-identification"
    }
    
    # Template pour l'estimation de poids
    weight_template = {
        "format": "CSV",
        "columns": ["image_path", "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2", "weight_kg"],
        "description": "Fichier CSV avec les annotations pour l'estimation de poids"
    }
    
    # Sauvegarder les templates
    templates_dir = Path("data/annotations/templates")
    templates_dir.mkdir(parents=True, exist_ok=True)
    
    with open(templates_dir / "yolo_template.json", 'w') as f:
        json.dump(yolo_template, f, indent=2)
    
    with open(templates_dir / "reid_template.json", 'w') as f:
        json.dump(reid_template, f, indent=2)
    
    with open(templates_dir / "weight_template.json", 'w') as f:
        json.dump(weight_template, f, indent=2)
    
    print("✅ Templates d'annotations créés dans data/annotations/templates/")
    
    # Créer des fichiers CSV d'exemple vides
    reid_example = pd.DataFrame(columns=["image_path", "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2", "pig_id", "code", "name"])
    weight_example = pd.DataFrame(columns=["image_path", "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2", "weight_kg"])
    
    reid_example.to_csv("data/annotations/train_reid.csv", index=False)
    reid_example.to_csv("data/annotations/val_reid.csv", index=False)
    weight_example.to_csv("data/annotations/train_weights.csv", index=False)
    weight_example.to_csv("data/annotations/val_weights.csv", index=False)
    
    print("✅ Fichiers CSV d'exemple créés dans data/annotations/")

def organize_data_structure():
    """Organise la structure des dossiers de données"""
    
    # Créer la structure YOLO
    yolo_structure = {
        "images": {
            "train": "data/images/train",
            "val": "data/images/val"
        },
        "labels": {
            "train": "data/annotations/yolo/train",
            "val": "data/annotations/yolo/val"
        }
    }
    
    for key, paths in yolo_structure.items():
        for split, path in paths.items():
            Path(path).mkdir(parents=True, exist_ok=True)
    
    print("✅ Structure YOLO créée:")
    print("   - data/images/train/")
    print("   - data/images/val/")
    print("   - data/annotations/yolo/train/")
    print("   - data/annotations/yolo/val/")

if __name__ == "__main__":
    print("=" * 50)
    print("Préparation des données d'entraînement")
    print("=" * 50)
    
    print("\n1. Création des templates d'annotations...")
    create_annotation_templates()
    
    print("\n2. Organisation de la structure des dossiers...")
    organize_data_structure()
    
    print("\n" + "=" * 50)
    print("✅ Préparation terminée!")
    print("=" * 50)
    print("\n📝 Prochaines étapes:")
    print("   1. Placez vos images dans data/images/train/ et data/images/val/")
    print("   2. Annotez les images (bounding boxes, pig_id, weight)")
    print("   3. Remplissez les fichiers CSV dans data/annotations/")
    print("   4. Lancez l'entraînement avec:")
    print("      - python training/train_detection.py")
    print("      - python training/train_reid.py")
    print("      - python training/train_weight_estimation.py")

