/**
 * Modal de notation d'un producteur
 * Après finalisation de transaction
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: {
    quality: number;
    professionalism: number;
    timeliness: number;
    communication: number;
    comment?: string;
    photos?: string[];
  }) => Promise<void>;
  producerName: string;
  transactionId: string;
}

interface RatingCriteria {
  key: 'quality' | 'professionalism' | 'timeliness' | 'communication';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const CRITERIA: RatingCriteria[] = [
  {
    key: 'quality',
    label: 'Qualité des sujets',
    icon: 'shield-checkmark-outline',
    description: 'Conformité, santé, poids',
  },
  {
    key: 'professionalism',
    label: 'Professionnalisme',
    icon: 'briefcase-outline',
    description: 'Respect des engagements',
  },
  {
    key: 'timeliness',
    label: 'Ponctualité',
    icon: 'time-outline',
    description: 'Respect des délais',
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: 'chatbubbles-outline',
    description: 'Réactivité, clarté',
  },
];

export default function RatingModal({
  visible,
  onClose,
  onSubmit,
  producerName,
  transactionId,
}: RatingModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [scores, setScores] = useState<Record<string, number>>({
    quality: 0,
    professionalism: 0,
    timeliness: 0,
    communication: 0,
  });

  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleStarPress = (criteriaKey: string, star: number) => {
    setScores((prev) => ({ ...prev, [criteriaKey]: star }));
  };

  const renderStars = (criteriaKey: string, currentScore: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(criteriaKey, star)}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Ionicons
              name={star <= currentScore ? 'star' : 'star-outline'}
              size={32}
              color={star <= currentScore ? colors.gold : colors.textLight}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getAverageScore = () => {
    const values = Object.values(scores);
    const total = values.reduce((sum, score) => sum + score, 0);
    return (total / values.length).toFixed(1);
  };

  const allScoresFilled = () => {
    return Object.values(scores).every((score) => score > 0);
  };

  const handleSubmit = async () => {
    if (!allScoresFilled()) {
      Alert.alert('Notation incomplète', 'Veuillez noter tous les critères');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        quality: scores.quality,
        professionalism: scores.professionalism,
        timeliness: scores.timeliness,
        communication: scores.communication,
        comment: comment.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      });

      Alert.alert(
        'Merci !',
        'Votre avis a été enregistré et sera visible par les autres acheteurs.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Impossible d'enregistrer votre avis";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Noter le producteur</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info producteur */}
          <View style={[styles.producerSection, { backgroundColor: colors.surfaceLight }]}>
            <View style={[styles.producerAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={32} color={colors.textInverse} />
            </View>
            <View style={styles.producerInfo}>
              <Text style={[styles.producerName, { color: colors.text }]}>{producerName}</Text>
              <Text style={[styles.producerSubtext, { color: colors.textSecondary }]}>
                Comment s'est passée cette transaction ?
              </Text>
            </View>
          </View>

          {/* Critères de notation */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Évaluez votre expérience
            </Text>

            {CRITERIA.map((criteria) => (
              <View
                key={criteria.key}
                style={[styles.criteriaCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.criteriaHeader}>
                  <View style={[styles.criteriaIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={criteria.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.criteriaInfo}>
                    <Text style={[styles.criteriaLabel, { color: colors.text }]}>
                      {criteria.label}
                    </Text>
                    <Text style={[styles.criteriaDescription, { color: colors.textSecondary }]}>
                      {criteria.description}
                    </Text>
                  </View>
                </View>

                {renderStars(criteria.key, scores[criteria.key] || 0)}
              </View>
            ))}
          </View>

          {/* Score moyen */}
          {allScoresFilled() && (
            <View style={[styles.averageSection, { backgroundColor: colors.gold + '15' }]}>
              <Text style={[styles.averageLabel, { color: colors.text }]}>Note moyenne</Text>
              <View style={styles.averageRow}>
                <Ionicons name="star" size={28} color={colors.gold} />
                <Text style={[styles.averageScore, { color: colors.gold }]}>
                  {getAverageScore()} / 5
                </Text>
              </View>
            </View>
          )}

          {/* Commentaire */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Commentaire (optionnel)
            </Text>
            <TextInput
              style={[styles.commentInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Partagez votre expérience en détail..."
              placeholderTextColor={colors.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
              {comment.length}/500
            </Text>
          </View>

          {/* Photos (fonctionnalité future) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos (optionnel)</Text>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: colors.surface }]}
              onPress={() =>
                Alert.alert('Bientôt disponible', "L'ajout de photos sera disponible prochainement")
              }
            >
              <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                Ajouter des photos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={[styles.noteBox, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.primary }]}>
              Votre avis sera visible publiquement et portera la mention "Achat vérifié". Soyez
              honnête et constructif.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Plus tard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: allScoresFilled() ? colors.success : colors.textLight,
              },
            ]}
            onPress={handleSubmit}
            disabled={!allScoresFilled() || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                Publier l'avis
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.small,
  },
  closeButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: MarketplaceTheme.spacing.md,
  },
  producerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.md,
  },
  producerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  producerInfo: {
    flex: 1,
  },
  producerName: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 4,
  },
  producerSubtext: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  section: {
    marginTop: MarketplaceTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  criteriaCard: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.sm,
    ...MarketplaceTheme.shadows.small,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  criteriaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criteriaInfo: {
    flex: 1,
  },
  criteriaLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginBottom: 2,
  },
  criteriaDescription: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  averageSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.md,
  },
  averageLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  averageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  averageScore: {
    fontSize: MarketplaceTheme.typography.fontSizes.xxl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  commentInput: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    minHeight: 120,
    ...MarketplaceTheme.shadows.small,
  },
  characterCount: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: MarketplaceTheme.spacing.xs,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.lg,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: MarketplaceTheme.colors.border,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.md,
    marginBottom: MarketplaceTheme.spacing.xl,
  },
  noteText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.medium,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  submitButton: {
    flex: 2,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
