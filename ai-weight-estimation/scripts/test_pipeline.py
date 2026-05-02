"""
Script de test pour le pipeline de pesée automatique
"""

import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.append(str(Path(__file__).parent.parent))

from inference.pipeline import WeightEstimationPipeline
import cv2
import numpy as np

def test_with_sample_image():
    """Test avec une image d'exemple"""
    print("=" * 50)
    print("Test du Pipeline de Pesée Automatique")
    print("=" * 50)
    
    # Initialiser le pipeline
    print("\n1. Initialisation du pipeline...")
    try:
        pipeline = WeightEstimationPipeline()
        print("✅ Pipeline initialisé avec succès!")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        return
    
    # Créer une image de test (si aucune image n'est disponible)
    test_image_path = "data/images/test_sample.jpg"
    if not Path(test_image_path).exists():
        print("\n2. Création d'une image de test...")
        # Créer une image factice pour le test
        test_image = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.rectangle(test_image, (100, 100), (400, 350), (139, 69, 19), -1)  # Rectangle marron (porc)
        cv2.imwrite(test_image_path, test_image)
        print(f"✅ Image de test créée: {test_image_path}")
        print("⚠️  Note: Cette image factice ne contiendra pas de vraies détections")
        print("   Pour un test réel, placez une vraie image de porc dans data/images/")
    
    # Test mode groupe
    print("\n3. Test en mode GROUPE...")
    try:
        result = pipeline.process_image(test_image_path, mode='group', register_new=False)
        print(f"✅ Résultat mode groupe:")
        print(f"   - Porcs détectés: {result.get('total_detected', 0)}")
        if result.get('pigs'):
            for i, pig in enumerate(result['pigs'], 1):
                print(f"   - Porc {i}: {pig.get('code', 'UNKNOWN')} - {pig.get('weight_kg', 0)}kg")
        print(f"\n📄 Format de sortie:")
        print(pipeline.format_output(result))
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()
    
    # Test mode individuel
    print("\n4. Test en mode INDIVIDUEL...")
    try:
        result = pipeline.process_image(test_image_path, mode='individual', register_new=False)
        print(f"✅ Résultat mode individuel:")
        if result.get('pig'):
            pig = result['pig']
            print(f"   - Code: {pig.get('code', 'UNKNOWN')}")
            print(f"   - Nom: {pig.get('name', 'N/A')}")
            print(f"   - Poids: {pig.get('weight_kg', 0)}kg")
        print(f"\n📄 Format de sortie:")
        print(pipeline.format_output(result))
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("Tests terminés!")
    print("=" * 50)

if __name__ == "__main__":
    test_with_sample_image()

