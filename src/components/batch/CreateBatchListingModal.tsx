/**
 * Modal pour créer une annonce marketplace depuis une bande
 * Permet de vendre toute la bande ou N porcs spécifiques
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { Batch } from '../../types/batch';
import type { BatchPig } from '../../types/batchPig';
import Button from '../Button';
import apiClient from '../../services/api/apiClient';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAppSelector } from '../../store/hooks';
import { selectProjetActif } from '../../store/selectors/projetSelectors';

interface CreateBatchListingModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
  onSuccess?: () => void;
}

type ListingMode = 'all' | 'count' | 'select';

export default function CreateBatchListingModal({
  visible,
  batch,
  onClose,
  onSuccess,
}: CreateBatchListingModalProps) {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);
  const { getCurrentLocation } = useGeolocation();
  const [loading, setLoading] = useState(false);
  const [loadingPigs, setLoadingPigs] = useState(false);
  const [pigs, setPigs] = useState<BatchPig[]>([]);

  // Formulaire
  const [mode, setMode] = useState<ListingMode>('all');
  const [pigCount, setPigCount] = useState('');
  const [selectedPigIds, setSelectedPigIds] = useState<string[]>([]);
  const [pricePerKg, setPricePerKg] = useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadPigs();
    } else {
      // Reset form
      setMode('all');
      setPigCount('');
      setSelectedPigIds([]);
      setPricePerKg('');
    }
  }, [visible, batch]);

  async function loadPigs() {
    setLoadingPigs(true);
    try {
      const data = await apiClient.get<BatchPig[]>(`/batch-pigs/batch/${batch.id}`);
      setPigs(data);
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible de charger la liste des porcs");
    } finally {
      setLoadingPigs(false);
    }
  }

  function togglePigSelection(pigId: string) {
    setSelectedPigIds((prev) => {
      if (prev.includes(pigId)) {
        return prev.filter((id) => id !== pigId);
      } else {
        return [...prev, pigId];
      }
    });
  }

  async function handleSubmit() {
    if (!projetActif) {
      Alert.alert('Erreur', 'Projet non disponible');
      return;
    }

    // Validation
    const price = parseFloat(pricePerKg.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix au kg valide');
      return;
    }

    let finalPigCount: number | undefined;
    let finalPigIds: string[] | undefined;

    if (mode === 'count') {
      const count = parseInt(pigCount);
      if (isNaN(count) || count < 1 || count > batch.total_count) {
        Alert.alert('Erreur', `Veuillez entrer un nombre entre 1 et ${batch.total_count}`);
        return;
      }
      finalPigCount = count;
    } else if (mode === 'select') {
      if (selectedPigIds.length === 0) {
        Alert.alert('Erreur', 'Veuillez sélectionner au moins un porc');
        return;
      }
      finalPigIds = selectedPigIds;
    }

    // Obtenir la localisation
    const userLocation = await getCurrentLocation();
    if (!userLocation) {
      Alert.alert(
        'Erreur',
        "Impossible d'obtenir votre localisation. Veuillez activer la géolocalisation."
      );
      return;
    }

    setLoading(true);
    try {
      // Récupérer la date de dernière pesée (utiliser la date actuelle si pas de pesée)
      const lastWeightDate = new Date().toISOString().split('T')[0];

      // S'assurer que les champs de localisation ne sont pas vides
      const address = userLocation.address || projetActif.localisation || 'Localisation non spécifiée';
      const city = userLocation.city || 'Non spécifié';
      const region = userLocation.region || 'Non spécifié';

      // ✅ Ne plus envoyer averageWeight - les poids réels de chaque animal sont utilisés
      await apiClient.post('/marketplace/listings/batch', {
        batchId: batch.id,
        farmId: projetActif.id,
        pigCount: finalPigCount,
        pigIds: finalPigIds,
        pricePerKg: price,
        lastWeightDate: lastWeightDate,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: address,
          city: city,
          region: region,
        },
      });

      Alert.alert('Succès', 'Annonce créée avec succès sur le marketplace', [
        { text: 'OK', onPress: () => {
          onSuccess?.();
          onClose();
        }},
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de créer l\'annonce');
    } finally {
      setLoading(false);
    }
  }

  if (loadingPigs) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
              Chargement des porcs...
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Vendre sur le Marketplace</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
          {/* Info de la bande */}
          <View style={[styles.batchInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.batchName, { color: colors.text }]}>{batch.pen_name}</Text>
            <Text style={[styles.batchDetails, { color: colors.textSecondary }]}>
              {batch.total_count} porc(s) • Poids moyen: {batch.average_weight_kg} kg
            </Text>
          </View>

          {/* Mode de vente */}
          <Text style={[styles.label, { color: colors.text }]}>Que souhaitez-vous vendre ?</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                mode === 'all' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setMode('all')}
            >
              <Text style={[styles.modeButtonText, { color: colors.text }]}>Toute la bande</Text>
              <Text style={[styles.modeButtonSubtext, { color: colors.textSecondary }]}>
                {batch.total_count} porcs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                mode === 'count' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setMode('count')}
            >
              <Text style={[styles.modeButtonText, { color: colors.text }]}>N porcs</Text>
              <Text style={[styles.modeButtonSubtext, { color: colors.textSecondary }]}>
                Sélection automatique
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                mode === 'select' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setMode('select')}
            >
              <Text style={[styles.modeButtonText, { color: colors.text }]}>Sélection manuelle</Text>
              <Text style={[styles.modeButtonSubtext, { color: colors.textSecondary }]}>
                Choisir les porcs
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nombre de porcs (mode count) */}
          {mode === 'count' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Nombre de porcs *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={pigCount}
                onChangeText={setPigCount}
                keyboardType="numeric"
                placeholder={`Max: ${batch.total_count}`}
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          {/* Sélection manuelle (mode select) */}
          {mode === 'select' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>
                Sélectionner les porcs ({selectedPigIds.length} sélectionné{selectedPigIds.length > 1 ? 's' : ''}) *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pigList}>
                  {pigs.map((pig) => (
                    <TouchableOpacity
                      key={pig.id}
                      style={[
                        styles.pigButton,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        selectedPigIds.includes(pig.id) && {
                          borderColor: colors.primary,
                          backgroundColor: `${colors.primary}20`,
                        },
                      ]}
                      onPress={() => togglePigSelection(pig.id)}
                    >
                      <Text style={[styles.pigButtonText, { color: colors.text }]}>
                        {pig.name || pig.id.slice(-6)}
                      </Text>
                      <Text style={[styles.pigButtonSubtext, { color: colors.textSecondary }]}>
                        {pig.current_weight_kg}kg
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Prix au kg */}
          <Text style={[styles.label, { color: colors.text }]}>Prix au kg (FCFA) *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={pricePerKg}
            onChangeText={setPricePerKg}
            keyboardType="decimal-pad"
            placeholder="Ex: 2500"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Info: poids réel utilisé */}
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
              💡 Le poids réel de chaque porc sera utilisé pour calculer le prix individuel.
            </Text>
          </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
            <Button title="Annuler" variant="outline" onPress={onClose} style={styles.cancelButton} />
            <Button
              title="Créer l'annonce"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
  content: {
    flex: 1,
    flexGrow: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 3, // Espace supplémentaire pour le clavier
    gap: SPACING.md,
  },
  batchInfo: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  batchName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  batchDetails: {
    fontSize: FONT_SIZES.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  modeContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modeButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  modeButtonSubtext: {
    fontSize: FONT_SIZES.xs,
  },
  pigList: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pigButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  pigButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  pigButtonSubtext: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  infoBoxText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

