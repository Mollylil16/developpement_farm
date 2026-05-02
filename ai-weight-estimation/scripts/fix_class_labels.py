"""
Script pour convertir les classes d'annotations YOLO
Le dataset original a 7 classes, on veut seulement la classe 0 (pig)
Classes à convertir:
- Classe 4 = "Person" (dans le dataset original, mais on veut garder seulement pig)
- Classe 6 = "pig" (dans le dataset original) -> Classe 0
Toutes les autres classes seront supprimées
"""

from pathlib import Path

def fix_labels():
    """Convertit les classes dans les fichiers d'annotations YOLO"""
    
    labels_train = Path('data/labels/train')
    labels_val = Path('data/labels/val')
    
    # Mapping: classe originale -> nouvelle classe
    # Classe 4 (Person) -> supprimer (pas de porc)
    # Classe 6 (pig) -> 0 (porc)
    # Toutes les autres classes -> supprimer
    
    def convert_label_file(label_path):
        """Convertit un fichier d'annotation"""
        if not label_path.exists():
            return 0
        
        with open(label_path, 'r') as f:
            lines = f.readlines()
        
        new_lines = []
        converted = 0
        removed = 0
        
        for line in lines:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            
            class_id = int(parts[0])
            
            # Convertir classe 6 (pig) en classe 0
            if class_id == 6:
                parts[0] = '0'
                new_lines.append(' '.join(parts) + '\n')
                converted += 1
            # Supprimer classe 4 (Person) et toutes les autres
            else:
                removed += 1
        
        # Écrire le fichier modifié
        with open(label_path, 'w') as f:
            f.writelines(new_lines)
        
        return converted, removed
    
    print("🔧 Conversion des classes d'annotations...")
    print()
    
    # Traiter les fichiers d'entraînement
    train_files = list(labels_train.glob('*.txt'))
    train_converted = 0
    train_removed = 0
    
    for label_file in train_files:
        converted, removed = convert_label_file(label_file)
        train_converted += converted
        train_removed += removed
    
    # Traiter les fichiers de validation
    val_files = list(labels_val.glob('*.txt'))
    val_converted = 0
    val_removed = 0
    
    for label_file in val_files:
        converted, removed = convert_label_file(label_file)
        val_converted += converted
        val_removed += removed
    
    print("✅ Conversion terminée!")
    print()
    print("📊 Résumé:")
    print(f"   Train: {train_converted} annotations converties, {train_removed} supprimées")
    print(f"   Val: {val_converted} annotations converties, {val_removed} supprimées")
    print()
    print("🚀 Vous pouvez maintenant relancer l'entraînement:")
    print("   python training/train_detection.py")
    print()
    print("💡 Note: Les images avec seulement des classes non-porcs seront maintenant")
    print("   correctement ignorées (pas d'erreur, juste pas utilisées pour l'entraînement)")

if __name__ == "__main__":
    fix_labels()

