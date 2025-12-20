/**
 * Modal de sélection de localisation sur carte
 * Utilise expo-location pour obtenir la position actuelle
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useGeolocation } from '../hooks/useGeolocation';

interface MapLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number; address?: string }) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

export default function MapLocationPickerModal({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}: MapLocationPickerModalProps) {
  const { colors } = useTheme();
  const { getCurrentLocation } = useGeolocation();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  useEffect(() => {
    if (visible && initialLocation) {
      setLocation(initialLocation);
      setManualLat(initialLocation.lat.toString());
      setManualLng(initialLocation.lng.toString());
    }
  }, [visible, initialLocation]);

  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      const userLocation = await getCurrentLocation();

      if (userLocation) {
        setLocation({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        });
        setManualLat(userLocation.latitude.toString());
        setManualLng(userLocation.longitude.toString());

        // Essayer de reverse geocode pour obtenir l'adresse
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            const addrParts = [addr.street, addr.city, addr.region, addr.country].filter(Boolean);
            setAddress(addrParts.join(', '));
          }
        } catch (geocodeError) {
          console.warn('Erreur de geocoding:', geocodeError);
        }
      } else {
        Alert.alert(
          'Erreur',
          "Impossible d'obtenir votre localisation. Veuillez vérifier les permissions de localisation."
        );
      }
    } catch (error: unknown) {
      console.error('Erreur lors de la récupération de la localisation:', error);
      Alert.alert('Erreur', "Impossible d'obtenir votre localisation.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Erreur', 'Veuillez entrer des coordonnées valides.');
      return;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert('Erreur', 'La latitude doit être entre -90 et 90.');
      return;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert('Erreur', 'La longitude doit être entre -180 et 180.');
      return;
    }

    setLocation({ lat, lng });
  };

  const handleConfirm = () => {
    if (!location) {
      Alert.alert('Erreur', 'Veuillez sélectionner une localisation.');
      return;
    }

    onConfirm({
      lat: location.lat,
      lng: location.lng,
      address: address || undefined,
    });
    onClose();
  };

  const handleClose = () => {
    setLocation(initialLocation || null);
    setAddress('');
    setManualLat(initialLocation?.lat.toString() || '');
    setManualLng(initialLocation?.lng.toString() || '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Sélectionner la localisation
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Instructions */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Utilisez votre position actuelle ou entrez manuellement les coordonnées GPS.
            </Text>
          </View>

          {/* Bouton pour obtenir la position actuelle */}
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.primary }]}
            onPress={handleGetCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#FFFFFF" />
                <Text style={styles.locationButtonText}>Utiliser ma position actuelle</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Saisie manuelle */}
          <View style={styles.manualInputSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ou saisir manuellement
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Latitude</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={manualLat}
                  onChangeText={setManualLat}
                  placeholder="Ex: 5.3600"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Longitude</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={manualLng}
                  onChangeText={setManualLng}
                  placeholder="Ex: -4.0083"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.applyButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleManualInput}
            >
              <Text style={[styles.applyButtonText, { color: colors.primary }]}>
                Appliquer les coordonnées
              </Text>
            </TouchableOpacity>
          </View>

          {/* Adresse (si disponible) */}
          {address && (
            <View
              style={[
                styles.addressBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="map" size={20} color={colors.primary} />
              <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
            </View>
          )}

          {/* Coordonnées sélectionnées */}
          {location && (
            <View
              style={[
                styles.coordinatesBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <View style={styles.coordinatesTextContainer}>
                <Text style={[styles.coordinatesLabel, { color: colors.textSecondary }]}>
                  Coordonnées sélectionnées:
                </Text>
                <Text style={[styles.coordinatesValue, { color: colors.text }]}>
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer avec bouton de confirmation */}
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            disabled={!location}
          >
            <Text style={styles.confirmButtonText}>Confirmer la localisation</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginLeft: SPACING.sm,
  },
  manualInputSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  applyButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  addressText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  coordinatesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  coordinatesTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  coordinatesLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  coordinatesValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    fontFamily: 'monospace',
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  confirmButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
