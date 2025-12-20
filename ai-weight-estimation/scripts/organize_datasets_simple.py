"""
Script simple pour organiser les datasets
Fusionne les deux datasets et les organise pour l'entraînement
"""

import shutil
from pathlib import Path
import xml.etree.ElementTree as ET
import pandas as pd # pyright: ignore[reportMissingImports]
import cv2# pyright: ignore[reportMissingImports]
import numpy as np  # pyright: ignore[reportMissingImports]

def convert_archive_to_yolo():
    """Convertit le dataset archive au format YOLO"""
    print("📦 Conversion du dataset 'archive' au format YOLO...")
    
    archive_dir = Path("data/archive")
    images_dir = archive_dir / "images"
    annotations_xml = archive_dir / "annotations.xml"
    
    if not annotations_xml.exists():
        print("⚠️  annotations.xml non trouvé, tentative avec pigs.csv...")
        return convert_archive_csv_to_yolo()
    
    # Lire le XML
    tree = ET.parse(annotations_xml)
    root = tree.getroot()
    
    # Créer les dossiers de sortie
    output_train_images = Path("data/images/train")
    output_train_labels = Path("data/annotations/yolo/train")
    output_val_images = Path("data/images/val")
    output_val_labels = Path("data/annotations/yolo/val")
    
    for folder in [output_train_images, output_train_labels, output_val_images, output_val_labels]:
        folder.mkdir(parents=True, exist_ok=True)
    
    # Parcourir les images
    images = list(images_dir.glob("*.png"))
    train_count = int(len(images) * 0.8)
    
    for idx, img_path in enumerate(images):
        img_name = img_path.stem
        
        # Trouver l'annotation correspondante dans le XML
        # Le XML peut avoir "images/01.png" ou juste "01.png"
        annotation = None
        for image_elem in root.findall('image'):
            xml_name = image_elem.get('name', '')
            # Essayer avec le nom complet
            if xml_name == img_path.name or xml_name == f"images/{img_path.name}":
                annotation = image_elem
                break
            # Essayer avec juste le nom du fichier (extrait du chemin)
            if Path(xml_name).name == img_path.name:
                annotation = image_elem
                break
            # Essayer avec juste le nom sans extension
            if Path(xml_name).stem == img_path.stem:
                annotation = image_elem
                break
        
        if annotation is None:
            print(f"⚠️  Pas d'annotation pour {img_path.name}")
            continue
        
        # Lire les dimensions de l'image
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        img_height, img_width = img.shape[:2]
        
        # Extraire les bounding boxes
        boxes = []
        for box in annotation.findall('box'):
            x1 = float(box.get('xtl'))
            y1 = float(box.get('ytl'))
            x2 = float(box.get('xbr'))
            y2 = float(box.get('ybr'))
            
            # Convertir en format YOLO (normalisé, centre, largeur, hauteur)
            x_center = ((x1 + x2) / 2) / img_width
            y_center = ((y1 + y2) / 2) / img_height
            width = (x2 - x1) / img_width
            height = (y2 - y1) / img_height
            
            # Classe 0 pour "pig" (porc)
            boxes.append(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")
        
        if not boxes:
            continue
        
        # Déterminer train ou val
        if idx < train_count:
            dest_img = output_train_images / f"archive_{img_path.name}"
            dest_label = output_train_labels / f"archive_{img_name}.txt"
        else:
            dest_img = output_val_images / f"archive_{img_path.name}"
            dest_label = output_val_labels / f"archive_{img_name}.txt"
        
        # Copier l'image
        shutil.copy2(img_path, dest_img)
        
        # Écrire l'annotation YOLO
        with open(dest_label, 'w') as f:
            f.write('\n'.join(boxes))
    
    print(f"✅ {len(images)} images converties depuis 'archive'")

def convert_archive_csv_to_yolo():
    """Convertit le dataset archive depuis le CSV"""
    print("📦 Conversion du dataset 'archive' depuis CSV...")
    
    archive_dir = Path("data/archive")
    csv_path = archive_dir / "pigs.csv"
    
    if not csv_path.exists():
        print("❌ pigs.csv non trouvé")
        return False
    
    df = pd.read_csv(csv_path)
    print(f"📊 CSV lu: {len(df)} lignes")
    print(f"   Colonnes: {df.columns.tolist()}")
    
    # Créer les dossiers
    output_train_images = Path("data/images/train")
    output_train_labels = Path("data/annotations/yolo/train")
    output_val_images = Path("data/images/val")
    output_val_labels = Path("data/annotations/yolo/val")
    
    for folder in [output_train_images, output_train_labels, output_val_images, output_val_labels]:
        folder.mkdir(parents=True, exist_ok=True)
    
    images_dir = archive_dir / "images"
    images = list(images_dir.glob("*.png"))
    train_count = int(len(images) * 0.8)
    
    for idx, img_path in enumerate(images):
        img_name = img_path.stem
        
        # Chercher dans le CSV
        # Ajuster selon les colonnes réelles du CSV
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        img_height, img_width = img.shape[:2]
        
        # Si le CSV a des bounding boxes, les convertir
        # Sinon, utiliser une détection automatique ou skip
        if idx < train_count:
            dest_img = output_train_images / f"archive_{img_path.name}"
        else:
            dest_img = output_val_images / f"archive_{img_path.name}"
        
        shutil.copy2(img_path, dest_img)
    
    print(f"✅ Images copiées depuis 'archive' (annotations à compléter manuellement)")
    return True

def merge_yolo_dataset():
    """Fusionne le dataset YOLO dans la structure du projet"""
    print("📦 Fusion du dataset YOLO 'pig detection.v1i.yolov8'...")
    
    yolo_dir = Path("data/pig detection.v1i.yolov8")
    
    # Dossiers de destination
    output_train_images = Path("data/images/train")
    output_train_labels = Path("data/annotations/yolo/train")
    output_val_images = Path("data/images/val")
    output_val_labels = Path("data/annotations/yolo/val")
    
    for folder in [output_train_images, output_train_labels, output_val_images, output_val_labels]:
        folder.mkdir(parents=True, exist_ok=True)
    
    # Copier les images et labels d'entraînement
    train_images_src = yolo_dir / "train" / "images"
    train_labels_src = yolo_dir / "train" / "labels"
    
    if train_images_src.exists():
        train_images = list(train_images_src.glob("*.jpg"))
        print(f"📸 Copie de {len(train_images)} images d'entraînement...")
        
        for img_path in train_images:
            dest_img = output_train_images / f"yolo_{img_path.name}"
            shutil.copy2(img_path, dest_img)
            
            # Copier le label correspondant
            label_path = train_labels_src / f"{img_path.stem}.txt"
            if label_path.exists():
                dest_label = output_train_labels / f"yolo_{img_path.stem}.txt"
                shutil.copy2(label_path, dest_label)
        
        print(f"✅ {len(train_images)} images d'entraînement copiées")
    
    # Copier les images et labels de validation
    val_images_src = yolo_dir / "valid" / "images"
    val_labels_src = yolo_dir / "valid" / "labels"
    
    if val_images_src.exists():
        val_images = list(val_images_src.glob("*.jpg"))
        print(f"📸 Copie de {len(val_images)} images de validation...")
        
        for img_path in val_images:
            dest_img = output_val_images / f"yolo_{img_path.name}"
            shutil.copy2(img_path, dest_img)
            
            # Copier le label correspondant
            label_path = val_labels_src / f"{img_path.stem}.txt"
            if label_path.exists():
                dest_label = output_val_labels / f"yolo_{img_path.stem}.txt"
                shutil.copy2(label_path, dest_label)
        
        print(f"✅ {len(val_images)} images de validation copiées")
    
    # Copier le fichier data.yaml
    data_yaml_src = yolo_dir / "data.yaml"
    if data_yaml_src.exists():
        data_yaml_dest = Path("data/data.yaml")
        shutil.copy2(data_yaml_src, data_yaml_dest)
        print("✅ data.yaml copié")

def main():
    print("=" * 60)
    print("Organisation des datasets pour l'entraînement")
    print("=" * 60)
    print()
    
    # 1. Fusionner le dataset YOLO (déjà prêt)
    merge_yolo_dataset()
    print()
    
    # 2. Convertir le dataset archive
    convert_archive_to_yolo()
    print()
    
    # Résumé
    train_images = len(list(Path("data/images/train").glob("*.jpg"))) + len(list(Path("data/images/train").glob("*.png")))
    val_images = len(list(Path("data/images/val").glob("*.jpg"))) + len(list(Path("data/images/val").glob("*.png")))
    train_labels = len(list(Path("data/annotations/yolo/train").glob("*.txt")))
    val_labels = len(list(Path("data/annotations/yolo/val").glob("*.txt")))
    
    print("=" * 60)
    print("✅ Organisation terminée!")
    print("=" * 60)
    print()
    print("📊 Résumé:")
    print(f"   • Images d'entraînement: {train_images}")
    print(f"   • Images de validation: {val_images}")
    print(f"   • Annotations train: {train_labels}")
    print(f"   • Annotations val: {val_labels}")
    print()
    print("📁 Structure finale:")
    print("   • data/images/train/     → Images d'entraînement")
    print("   • data/images/val/        → Images de validation")
    print("   • data/annotations/yolo/train/ → Annotations YOLO (train)")
    print("   • data/annotations/yolo/val/   → Annotations YOLO (val)")
    print()
    print("🚀 Prochaine étape:")
    print("   python training/train_detection.py")
    print()

if __name__ == "__main__":
    main()

