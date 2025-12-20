/**
 * Composant de scan de prix depuis une photo
 * Utilise OCR pour extraire les prix d'un tableau affiché au moulin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import CustomModal from './CustomModal';
import FormField from './FormField';

interface ExtractedPrice {
  ingredient: string;
  prix: number;
  unite: 'kg' | 'sac';
  confidence: number;
}

interface PriceScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (prices: ExtractedPrice[]) => void;
}

export default function PriceScannerModal({ visible, onClose, onImport }: PriceScannerModalProps) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedPrices, setExtractedPrices] = useState<ExtractedPrice[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  /**
   * Demande la permission et ouvre la caméra
   */
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à la caméra est nécessaire pour scanner le tableau de prix.",
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', "Impossible d'accéder à la caméra");
    }
  };

  /**
   * Demande la permission et ouvre la galerie
   */
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à la galerie est nécessaire pour sélectionner une photo.",
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection d'image:", error);
      Alert.alert('Erreur', "Impossible d'accéder à la galerie");
    }
  };

  /**
   * Traite l'image et extrait le texte
   */
  const processImage = async (uri: string) => {
    setScanning(true);
    setImageUri(uri);

    try {
      // Optimiser l'image pour l'OCR
      const manipulatedImage = await manipulateAsync(uri, [{ resize: { width: 1000 } }], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      // Extraire le texte (simulation pour l'instant)
      // Dans une vraie implémentation, on utiliserait l'API Google Vision
      await extractTextFromImage(manipulatedImage.uri);
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      Alert.alert('Erreur', "Impossible de traiter l'image");
      setScanning(false);
    }
  };

  /**
   * Extrait le texte de l'image via OCR
   * IMPORTANT : Cette fonction est une simulation
   * Dans la production, utilisez Google Cloud Vision API ou Firebase ML Kit
   */
  const extractTextFromImage = async (uri: string) => {
    // Simulation du traitement OCR
    setTimeout(() => {
      // Exemple de résultat simulé
      const mockPrices: ExtractedPrice[] = [
        { ingredient: 'Maïs grain', prix: 15000, unite: 'sac', confidence: 0.95 },
        { ingredient: 'Tourteau de soja', prix: 22500, unite: 'sac', confidence: 0.92 },
        { ingredient: 'Son de blé', prix: 10000, unite: 'sac', confidence: 0.88 },
        { ingredient: 'CMV', prix: 1500, unite: 'kg', confidence: 0.85 },
      ];

      setExtractedPrices(mockPrices);
      setScanning(false);

      Alert.alert(
        '✅ Scan réussi',
        `${mockPrices.length} prix détectés\n\nVérifiez et corrigez si nécessaire avant d'importer.`,
        [{ text: 'OK' }]
      );
    }, 2000);

    // TODO: Implémenter avec Google Cloud Vision API
    // const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     requests: [{
    //       image: { content: base64Image },
    //       features: [{ type: 'TEXT_DETECTION' }],
    //     }],
    //   }),
    // });
  };

  /**
   * Parse le texte OCR pour extraire les prix
   */
  const parseTextToPrices = (text: string): ExtractedPrice[] => {
    const prices: ExtractedPrice[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Regex pour détecter : Nom Ingredient ... Prix (FCFA ou CFA)
      const match = line.match(/^(.+?)\s+\.+\s+(\d[\d\s,]*)\s*(FCFA|CFA|F)?/i);

      if (match) {
        const ingredient = match[1].trim();
        const prixStr = match[2].replace(/[\s,]/g, '');
        const prix = parseInt(prixStr);

        if (!isNaN(prix) && prix > 0) {
          // Déterminer l'unité
          const unite = line.toLowerCase().includes('sac') || prix > 5000 ? 'sac' : 'kg';

          prices.push({
            ingredient,
            prix,
            unite,
            confidence: 0.85,
          });
        }
      }
    }

    return prices;
  };

  /**
   * Modifier un prix extrait
   */
  const handleEditPrice = (
    index: number,
    field: 'ingredient' | 'prix' | 'unite',
    value: unknown
  ) => {
    const updated = [...extractedPrices];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedPrices(updated);
  };

  /**
   * Supprimer un prix extrait
   */
  const handleDeletePrice = (index: number) => {
    setExtractedPrices((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Importer les prix validés
   */
  const handleImport = () => {
    if (extractedPrices.length === 0) {
      Alert.alert('Aucun prix', "Veuillez d'abord scanner une photo");
      return;
    }

    onImport(extractedPrices);
    resetState();
    onClose();
  };

  /**
   * Réinitialiser l'état
   */
  const resetState = () => {
    setImageUri(null);
    setExtractedPrices([]);
    setEditingIndex(null);
    setScanning(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      title="📸 Scanner Tableau de Prix"
      showButtons={false}
    >
      <ScrollView style={styles.scrollView}>
        {/* Instructions */}
        {!imageUri && (
          <View
            style={[
              styles.instructionsBox,
              { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
            ]}
          >
            <Text style={[styles.instructionsTitle, { color: colors.primary }]}>
              📋 Instructions
            </Text>
            <Text style={[styles.instructionsText, { color: colors.text }]}>
              1. Prenez une photo du tableau de prix au moulin{'\n'}
              2. Assurez-vous que le texte est lisible{'\n'}
              3. Vérifiez et corrigez les prix détectés{'\n'}
              4. Importez les prix dans vos ingrédients
            </Text>
          </View>
        )}

        {/* Boutons de capture */}
        {!imageUri && (
          <View style={styles.captureButtons}>
            <TouchableOpacity
              style={[styles.captureButton, { backgroundColor: colors.primary }]}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.captureButtonIcon}>📷</Text>
              <Text style={styles.captureButtonText}>Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 2 },
              ]}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <Text style={styles.captureButtonIcon}>🖼️</Text>
              <Text style={[styles.captureButtonText, { color: colors.text }]}>
                Choisir une photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image capturée */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
            {scanning && (
              <View style={[styles.scanningOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.scanningText}>Analyse en cours...</Text>
              </View>
            )}
          </View>
        )}

        {/* Résultats */}
        {extractedPrices.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                ✅ Prix détectés ({extractedPrices.length})
              </Text>
              <TouchableOpacity
                style={[
                  styles.retakeButton,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => {
                  setImageUri(null);
                  setExtractedPrices([]);
                }}
              >
                <Text style={[styles.retakeButtonText, { color: colors.primary }]}>
                  🔄 Reprendre
                </Text>
              </TouchableOpacity>
            </View>

            {extractedPrices.map((price, index) => (
              <View
                key={index}
                style={[
                  styles.priceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.priceHeader}>
                  <View style={styles.confidenceBadge}>
                    <Text style={[styles.confidenceText, { color: colors.success }]}>
                      {Math.round(price.confidence * 100)}%
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error + '15' }]}
                    onPress={() => handleDeletePrice(index)}
                  >
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <FormField
                  label="Ingrédient"
                  value={price.ingredient}
                  onChangeText={(text) => handleEditPrice(index, 'ingredient', text)}
                />

                <View style={styles.priceRow}>
                  <View style={{ flex: 2 }}>
                    <FormField
                      label="Prix (FCFA)"
                      value={price.prix.toString()}
                      onChangeText={(text) => handleEditPrice(index, 'prix', parseInt(text) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.label, { color: colors.text }]}>Unité</Text>
                    <View style={styles.uniteButtons}>
                      <TouchableOpacity
                        style={[
                          styles.uniteButton,
                          { borderColor: colors.border },
                          price.unite === 'kg' && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() => handleEditPrice(index, 'unite', 'kg')}
                      >
                        <Text
                          style={[
                            styles.uniteButtonText,
                            { color: price.unite === 'kg' ? '#FFF' : colors.text },
                          ]}
                        >
                          KG
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.uniteButton,
                          { borderColor: colors.border },
                          price.unite === 'sac' && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() => handleEditPrice(index, 'unite', 'sac')}
                      >
                        <Text
                          style={[
                            styles.uniteButtonText,
                            { color: price.unite === 'sac' ? '#FFF' : colors.text },
                          ]}
                        >
                          SAC
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Boutons d'action */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 2 },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: colors.success }]}
                onPress={handleImport}
              >
                <Text style={styles.importButtonText}>✅ Importer ({extractedPrices.length})</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 600,
  },
  instructionsBox: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  captureButtons: {
    gap: SPACING.md,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  captureButtonIcon: {
    fontSize: 32,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  retakeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retakeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  priceCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  confidenceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#28a74520',
  },
  confidenceText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  uniteButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  uniteButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  uniteButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  importButton: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
