/**
 * Modal pour transférer un sujet vers une autre loge
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
import { BATCH_CATEGORY_LABELS } from '../../types/batch';

interface TransferPigModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
}

export default function TransferPigModal({
  visible,
  batch,
  onClose,
}: TransferPigModalProps) {
  const { colors } = useTheme();
  const [pigs, setPigs] = useState<BatchPig[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedPigId, setSelectedPigId] = useState<string | null>(null);
  const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  async function loadData() {
    setLoadingData(true);
    try {
      // Charger les porcs de la bande actuelle
      const pigsData = await apiClient.get(`/batch-pigs/batch/${batch.id}`);
      setPigs(pigsData);

      // TODO: Charger toutes les bandes (besoin d'un endpoint GET /batches)
      // Pour l'instant, on utilise une liste vide
      setBatches([]);
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible de charger les données");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleTransfer() {
    if (!selectedPigId || !targetBatchId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un sujet et une loge de destination');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-pigs/transfer', {
        pig_id: selectedPigId,
        from_batch_id: batch.id,
        to_batch_id: targetBatchId,
        notes: notes || null,
      });

      Alert.alert('Succès', 'Sujet transféré avec succès', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de transférer le sujet');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Transférer un sujet</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Sujet à transférer *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pigList}>
              {pigs.map((pig) => (
                <TouchableOpacity
                  key={pig.id}
                  style={[
                    styles.pigButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selectedPigId === pig.id && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}20`,
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

          <Text style={[styles.label, { color: colors.text }]}>Loge de destination *</Text>
          {batches.length === 0 ? (
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Aucune autre loge disponible. Créez d'abord une nouvelle loge.
            </Text>
          ) : (
            batches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.batchButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  targetBatchId === b.id && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                ]}
                onPress={() => setTargetBatchId(b.id)}
              >
                <Text style={[styles.batchButtonText, { color: colors.text }]}>
                  {b.pen_name} - {BATCH_CATEGORY_LABELS[b.category]}
                </Text>
              </TouchableOpacity>
            ))
          )}

          <Text style={[styles.label, { color: colors.text }]}>Notes (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Raison du transfert..."
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
            title="Transférer"
            onPress={handleTransfer}
            loading={loading}
            disabled={!selectedPigId || !targetBatchId || batches.length === 0}
            style={styles.submitButton}
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
  batchButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  batchButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
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

