/**
 * Modal pour modifier ou supprimer une loge
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Edit, Trash2, Save } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import Button from '../Button';
import Card from '../Card';
import { Batch, BATCH_CATEGORY_LABELS } from '../../types/batch';
import apiClient from '../../services/api/apiClient';

interface EditBatchModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
  onSaved: () => void;
}

const BATCH_CATEGORIES: Batch['category'][] = [
  'truie_reproductrice',
  'verrat_reproducteur',
  'porcelets',
  'porcs_croissance',
  'porcs_engraissement',
];

export default function EditBatchModal({
  visible,
  batch,
  onClose,
  onSaved,
}: EditBatchModalProps) {
  const { colors } = useTheme();
  const [penName, setPenName] = useState('');
  const [category, setCategory] = useState<Batch['category']>('porcelets');
  const [position, setPosition] = useState<'gauche' | 'droite'>('droite');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible && batch) {
      setPenName(batch.pen_name || '');
      setCategory(batch.category || 'porcelets');
      setPosition(batch.position || 'droite');
      setNotes(batch.notes || '');
      setShowDeleteConfirm(false);
    }
  }, [visible, batch]);

  const handleSave = async () => {
    if (!penName.trim()) {
      Alert.alert('Erreur', 'Le nom de la loge est requis');
      return;
    }

    // Valider le format du nom (A1, B2, etc.)
    if (!/^[A-Z]\d+$/.test(penName.trim())) {
      Alert.alert(
        'Erreur',
        'Le nom de la loge doit être au format A1, B2, etc. (lettre majuscule suivie de chiffres)',
      );
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {};
      if (penName.trim() !== batch.pen_name) {
        updateData.pen_name = penName.trim();
      }
      if (category !== batch.category) {
        updateData.category = category;
      }
      if (position !== batch.position) {
        updateData.position = position;
      }
      if (notes !== (batch.notes || '')) {
        updateData.notes = notes.trim() || null;
      }

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Information', 'Aucune modification à enregistrer');
        setSaving(false);
        return;
      }

      await apiClient.patch(`/batch-pigs/batch/${batch.id}`, updateData);
      Alert.alert('Succès', 'Les modifications ont été enregistrées');
      onSaved();
    } catch (error: any) {
      console.error('[EditBatchModal] Erreur lors de la mise à jour:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de mettre à jour la loge';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (batch.total_count > 0) {
      Alert.alert(
        'Impossible de supprimer',
        `Cette loge contient encore ${batch.total_count} sujet(s). Veuillez d'abord déplacer ou retirer tous les sujets avant de supprimer la loge.`,
      );
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la loge "${batch.pen_name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiClient.delete(`/batch-pigs/batch/${batch.id}`);
              Alert.alert('Succès', 'La loge a été supprimée');
              onSaved();
            } catch (error: any) {
              console.error('[EditBatchModal] Erreur lors de la suppression:', error);
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Impossible de supprimer la loge';
              Alert.alert('Erreur', message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Modifier la loge</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Informations de la loge */}
          <Card style={styles.card} elevation="small" padding="large">
            <View style={styles.cardHeader}>
              <Edit size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Informations de la loge
              </Text>
            </View>

            {/* Nom de la loge */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nom de la loge *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={penName}
                onChangeText={setPenName}
                placeholder="A1, B2, etc."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Format : lettre majuscule suivie de chiffres (ex: A1, B2)
              </Text>
            </View>

            {/* Catégorie */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Catégorie *</Text>
              <View style={styles.categoryGrid}>
                {BATCH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                      category === cat && {
                        borderColor: colors.primary,
                        backgroundColor: `${colors.primary}20`,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: colors.text },
                        category === cat && { color: colors.primary },
                      ]}
                    >
                      {BATCH_CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Position */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Position *</Text>
              <View style={styles.positionContainer}>
                <TouchableOpacity
                  style={[
                    styles.positionButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    position === 'droite' && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}20`,
                    },
                  ]}
                  onPress={() => setPosition('droite')}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={position === 'droite' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.positionButtonText,
                      { color: colors.text },
                      position === 'droite' && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    Droite (A)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.positionButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    position === 'gauche' && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}20`,
                    },
                  ]}
                  onPress={() => setPosition('gauche')}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={position === 'gauche' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.positionButtonText,
                      { color: colors.text },
                      position === 'gauche' && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    Gauche (B)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes optionnelles sur cette loge..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Bouton Enregistrer */}
            <Button
              title="Enregistrer les modifications"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              fullWidth
              icon={<Save size={20} color={colors.textOnPrimary} />}
            />
          </Card>

          {/* Section Suppression */}
          <Card style={styles.card} elevation="small" padding="large">
            <View style={styles.cardHeader}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Zone de danger</Text>
            </View>

            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              {batch.total_count > 0
                ? `Cette loge contient ${batch.total_count} sujet(s). Vous devez d'abord déplacer ou retirer tous les sujets avant de pouvoir supprimer la loge.`
                : 'La suppression de cette loge est irréversible. Assurez-vous qu\'elle est bien vide avant de continuer.'}
            </Text>

            <Button
              title={deleting ? 'Suppression...' : 'Supprimer la loge'}
              onPress={handleDelete}
              loading={deleting}
              disabled={deleting || batch.total_count > 0}
              fullWidth
              variant="primary"
              style={{
                backgroundColor: colors.error,
              }}
              textStyle={{
                color: '#fff',
              }}
              icon={<Trash2 size={20} color="#fff" />}
            />
          </Card>
        </ScrollView>
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
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
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
    gap: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    minHeight: 100,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs / 2,
    fontStyle: 'italic',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  positionContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  positionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  positionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
});

