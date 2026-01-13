/**
 * Modal pour retirer un sujet (vente, mort, don, etc.)
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
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { Batch } from '../../types/batch';
import { BatchPig } from '../../types/batchPig';
import Button from '../Button';
import apiClient from '../../services/api/apiClient';

interface RemovePigModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
}

type RemovalReason = 'sale' | 'death' | 'donation' | 'personal_consumption' | 'transfer_out' | 'other';

export default function RemovePigModal({
  visible,
  batch,
  onClose,
}: RemovePigModalProps) {
  const { colors } = useTheme();
  const [pigs, setPigs] = useState<BatchPig[]>([]);
  const [selectedPigId, setSelectedPigId] = useState<string | null>(null);
  const [reason, setReason] = useState<RemovalReason>('sale');
  const [details, setDetails] = useState('');
  
  // Pour vente
  const [salePrice, setSalePrice] = useState('');
  const [saleWeight, setSaleWeight] = useState('');
  const [buyerName, setBuyerName] = useState('');
  
  // Pour mortalité
  const [deathCause, setDeathCause] = useState('');
  const [vetReport, setVetReport] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPigs();
    }
  }, [visible]);

  async function loadPigs() {
    setLoadingData(true);
    try {
      const data = await apiClient.get<BatchPig[]>(`/batch-pigs/batch/${batch.id}`);
      setPigs(data);
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible de charger la liste");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleRemove() {
    if (!selectedPigId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un sujet');
      return;
    }

    // Validations spécifiques selon la raison
    if (reason === 'sale') {
      if (!buyerName || !salePrice || !saleWeight) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs de vente');
        return;
      }
    }

    if (reason === 'death' && !deathCause) {
      Alert.alert('Erreur', 'Veuillez indiquer la cause du décès');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-pigs/remove', {
        pig_id: selectedPigId,
        removal_reason: reason,
        removal_details: details || null,
        removal_date: new Date().toISOString().split('T')[0],
        sale_price: salePrice ? parseFloat(salePrice) : null,
        sale_weight_kg: saleWeight ? parseFloat(saleWeight) : null,
        buyer_name: buyerName || null,
        death_cause: deathCause || null,
        veterinary_report: vetReport || null,
      });

      Alert.alert('Succès', 'Sujet retiré avec succès', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de retirer le sujet');
    } finally {
      setLoading(false);
    }
  }

  const reasonLabels: Record<RemovalReason, string> = {
    sale: 'Vente',
    death: 'Mortalité',
    donation: 'Don',
    personal_consumption: 'Consommation personnelle',
    transfer_out: 'Transfert vers autre ferme',
    other: 'Autre',
  };

  if (loadingData) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Retirer un sujet</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Sujet à retirer *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pigList}>
              {pigs.map((pig) => (
                <TouchableOpacity
                  key={pig.id}
                  style={[
                    styles.pigButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selectedPigId === pig.id && {
                      borderColor: colors.error,
                      backgroundColor: `${colors.error}20`,
                    },
                  ]}
                  onPress={() => setSelectedPigId(pig.id)}
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

          <Text style={[styles.label, { color: colors.text }]}>Raison du retrait *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.reasonList}>
              {(Object.keys(reasonLabels) as RemovalReason[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.reasonButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    reason === r && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}20`,
                    },
                  ]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonButtonText, { color: colors.text }]}>
                    {reasonLabels[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Champs spécifiques pour VENTE */}
          {reason === 'sale' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Nom de l'acheteur *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="Ex: Boucherie Kouassi"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Poids de vente (kg) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={saleWeight}
                onChangeText={setSaleWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 95.5"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Prix de vente (FCFA) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="numeric"
                placeholder="Ex: 85000"
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          {/* Champs spécifiques pour MORTALITÉ */}
          {reason === 'death' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Cause du décès *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={deathCause}
                onChangeText={setDeathCause}
                placeholder="Ex: Maladie respiratoire"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Rapport vétérinaire (optionnel)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={vetReport}
                onChangeText={setVetReport}
                multiline
                numberOfLines={4}
                placeholder="Diagnostic et observations du vétérinaire..."
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Détails supplémentaires (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            placeholder="Informations complémentaires..."
            placeholderTextColor={colors.textSecondary}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={onClose}
            style={styles.cancelButton}
          />
          <Button
            title="Retirer"
            onPress={handleRemove}
            loading={loading}
            disabled={!selectedPigId}
            style={[styles.submitButton, { backgroundColor: colors.error }]}
          />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
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
  reasonList: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  reasonButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  reasonButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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

