"""
Script pour copier les annotations YOLO vers le dossier labels attendu par YOLO
"""

from pathlib import Path
import shutil

# Créer les dossiers labels
labels_train = Path('data/labels/train')
labels_val = Path('data/labels/val')
labels_train.mkdir(parents=True, exist_ok=True)
labels_val.mkdir(parents=True, exist_ok=True)

# Copier les annotations
print("📁 Copie des annotations...")

train_count = 0
for f in Path('data/annotations/yolo/train').glob('*.txt'):
    shutil.copy2(f, labels_train / f.name)
    train_count += 1

val_count = 0
for f in Path('data/annotations/yolo/val').glob('*.txt'):
    shutil.copy2(f, labels_val / f.name)
    val_count += 1

print(f"✅ Annotations copiées:")
print(f"   • Train: {train_count}")
print(f"   • Val: {val_count}")
print()
print("🚀 Vous pouvez maintenant relancer l'entraînement:")
print("   python training/train_detection.py")

