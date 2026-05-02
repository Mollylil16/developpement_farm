"""
Scripts de conversion des modèles pour mobile (ONNX, TensorFlow Lite, CoreML)
Selon spécifications README
"""

import torch
import onnx
import onnxruntime
from pathlib import Path
import yaml
import sys

# Ajouter le répertoire parent au path
sys.path.append(str(Path(__file__).parent.parent))

def convert_to_onnx(model_path: str, output_path: str, input_size: tuple = (1, 3, 640, 640)):
    """
    Convertit un modèle PyTorch en ONNX
    
    Args:
        model_path: Chemin vers le modèle PyTorch (.pt)
        output_path: Chemin de sortie pour le modèle ONNX
        input_size: Taille d'entrée (batch, channels, height, width)
    """
    print(f"Conversion de {model_path} vers ONNX...")
    
    # Charger le modèle
    model = torch.load(model_path, map_location='cpu')
    model.eval()
    
    # Créer un exemple d'entrée
    dummy_input = torch.randn(*input_size)
    
    # Exporter en ONNX
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )
    
    # Vérifier le modèle
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    
    print(f"✅ Modèle ONNX créé: {output_path}")

def convert_to_tflite(model_path: str, output_path: str):
    """
    Convertit un modèle PyTorch en TensorFlow Lite
    
    Note: Nécessite une conversion intermédiaire via TensorFlow
    """
    print(f"Conversion de {model_path} vers TensorFlow Lite...")
    print("⚠️  Cette conversion nécessite TensorFlow. Implémentation à compléter.")
    # TODO: Implémenter la conversion PyTorch -> TensorFlow -> TFLite

def convert_to_coreml(model_path: str, output_path: str, input_size: tuple = (1, 3, 640, 640)):
    """
    Convertit un modèle PyTorch en CoreML (pour iOS)
    
    Note: Nécessite coremltools
    """
    try:
        import coremltools as ct
    except ImportError:
        print("❌ coremltools non installé. Installez-le avec: pip install coremltools")
        return
    
    print(f"Conversion de {model_path} vers CoreML...")
    
    # Charger le modèle
    model = torch.load(model_path, map_location='cpu')
    model.eval()
    
    # Créer un exemple d'entrée
    dummy_input = torch.randn(*input_size)
    
    # Tracer le modèle
    traced_model = torch.jit.trace(model, dummy_input)
    
    # Convertir en CoreML
    mlmodel = ct.convert(
        traced_model,
        inputs=[ct.TensorType(name="input", shape=input_size)],
        outputs=[ct.TensorType(name="output")],
    )
    
    # Sauvegarder
    mlmodel.save(output_path)
    
    print(f"✅ Modèle CoreML créé: {output_path}")

def convert_all_models():
    """Convertit tous les modèles selon la configuration"""
    # Charger la configuration
    with open("config/model_config.yaml", 'r') as f:
        config = yaml.safe_load(f)
    
    models_config = config['models']
    output_dir = Path("models/mobile")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Conversion détection
    if 'detection' in models_config:
        det_config = models_config['detection']
        model_path = det_config['path']
        
        if Path(model_path).exists():
            input_size = (1, 3, *det_config['input_size'])
            
            # ONNX
            onnx_path = output_dir / f"{det_config['name']}.onnx"
            convert_to_onnx(model_path, str(onnx_path), input_size)
            
            # CoreML (pour iOS)
            coreml_path = output_dir / f"{det_config['name']}.mlmodel"
            convert_to_coreml(model_path, str(coreml_path), input_size)
        else:
            print(f"⚠️  Modèle non trouvé: {model_path}")
    
    # Conversion Re-ID
    if 'reid' in models_config:
        reid_config = models_config['reid']
        model_path = reid_config['path']
        
        if Path(model_path).exists():
            input_size = (1, 3, *reid_config['input_size'])
            
            # ONNX
            onnx_path = output_dir / f"{reid_config['name']}.onnx"
            convert_to_onnx(model_path, str(onnx_path), input_size)
            
            # CoreML
            coreml_path = output_dir / f"{reid_config['name']}.mlmodel"
            convert_to_coreml(model_path, str(coreml_path), input_size)
        else:
            print(f"⚠️  Modèle non trouvé: {model_path}")
    
    # Conversion estimation de poids
    if 'weight_estimation' in models_config:
        weight_config = models_config['weight_estimation']
        model_path = weight_config['path']
        
        if Path(model_path).exists():
            input_size = (1, 3, *weight_config['input_size'])
            
            # ONNX
            onnx_path = output_dir / f"{weight_config['name']}.onnx"
            convert_to_onnx(model_path, str(onnx_path), input_size)
            
            # CoreML
            coreml_path = output_dir / f"{weight_config['name']}.mlmodel"
            convert_to_coreml(model_path, str(coreml_path), input_size)
        else:
            print(f"⚠️  Modèle non trouvé: {model_path}")
    
    print("\n✅ Conversion terminée!")

if __name__ == "__main__":
    convert_all_models()

