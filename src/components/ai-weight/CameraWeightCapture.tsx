/**
 * Composant React Native pour capturer des images/vidéos pour la pesée IA
 * Selon spécifications README
 * 
 * ⚠️ DÉSACTIVÉ : Ce composant nécessite expo-camera qui n'est plus installé.
 * Si vous souhaitez utiliser ce composant, installez expo-camera et décommentez le code ci-dessous.
 * Alternative : Utiliser expo-image-picker (déjà installé) via ImagePicker.launchCameraAsync()
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
// import { Camera, CameraType } from 'expo-camera'; // DÉSACTIVÉ - expo-camera non installé
import aiWeightService, {
  WeightEstimationResponse,
  BatchWeightEstimationResponse,
} from '../../services/aiWeightService';

interface CameraWeightCaptureProps {
  mode: 'individual' | 'group';
  pigId?: string;
  expectedPigs?: string[];
  onResult: (result: WeightEstimationResponse | BatchWeightEstimationResponse) => void;
  onCancel: () => void;
}

/**
 * Composant désactivé - nécessite expo-camera
 * Pour utiliser ce composant, installez expo-camera :
 * npm install expo-camera
 * 
 * Ou utilisez expo-image-picker à la place (déjà installé)
 */
export const CameraWeightCapture: React.FC<CameraWeightCaptureProps> = ({
  mode,
  pigId,
  expectedPigs,
  onResult,
  onCancel,
}) => {
  // Composant désactivé - retourne un message d'erreur
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>
        Ce composant nécessite expo-camera qui n'est pas installé.
      </Text>
      <Text style={styles.errorText}>
        Utilisez expo-image-picker à la place (déjà installé) via ImagePicker.launchCameraAsync()
      </Text>
      <TouchableOpacity style={styles.button} onPress={onCancel}>
        <Text style={styles.buttonText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  /* CODE ORIGINAL DÉSACTIVÉ - Nécessite expo-camera
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const cameraRef = useRef<Camera>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        Alert.alert('Erreur', 'Impossible de capturer l\'image');
        setIsProcessing(false);
        return;
      }

      // Convertir en base64 avec préfixe
      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

      // Appeler le service IA
      if (mode === 'individual') {
        const result = await aiWeightService.predictWeight({
          image: base64Image,
          pig_id: pigId,
        });
        onResult(result);
      } else {
        const result = await aiWeightService.batchPredictWeight({
          image: base64Image,
          expected_pigs: expectedPigs,
        });
        onResult(result);
      }
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Erreur lors du traitement de l\'image',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const flipCamera = () => {
    setCameraType(
      cameraType === CameraType.back ? CameraType.front : CameraType.back,
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Demande de permission caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Permission caméra refusée. Veuillez l'activer dans les paramètres.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onCancel}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'individual' ? 'Pesée Individuelle' : 'Pesée Groupe'}
            </Text>
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Text style={styles.flipButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>
                Traitement en cours...
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isProcessing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
  */
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  /* STYLES ORIGINAUX DÉSACTIVÉS
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 20,
  },
  processingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  */
});
