/**
 * Modal d'affichage du diagnostic de maladie porcine
 * Affiche les résultats de l'analyse de symptômes ou d'images
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { DiagnosticResult } from '../../services/chatAgent/DiagnosticService';

interface DiagnosticModalProps {
  visible: boolean;
  diagnostic: DiagnosticResult | null;
  onClose: () => void;
  onConfirm: (diagnostic: DiagnosticResult) => void;
  animalId?: string;
  animalCode?: string;
}

export default function DiagnosticModal({
  visible,
  diagnostic,
  onClose,
  onConfirm,
  animalId,
  animalCode,
}: DiagnosticModalProps) {
  if (!diagnostic || !diagnostic.disease) {
    return null;
  }

  const handleConfirm = () => {
    Alert.alert(
      'Confirmer l\'enregistrement',
      `Enregistrer le diagnostic "${diagnostic.disease!.name}" dans le dossier santé${animalCode ? ` de ${animalCode}` : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Enregistrer',
          onPress: () => {
            onConfirm(diagnostic);
            onClose();
          },
        },
      ]
    );
  };

  const getGravityColor = (gravity: string) => {
    switch (gravity) {
      case 'Haut':
        return COLORS.error;
      case 'Moyen-Haut':
        return '#FF9800';
      case 'Moyen':
        return '#FFC107';
      case 'Bas-Moyen':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critique':
        return 'alert-circle';
      case 'urgent':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons
                name={getUrgencyIcon(diagnostic.urgency)}
                size={32}
                color={getGravityColor(diagnostic.disease.gravity)}
              />
              <Text style={styles.title}>Diagnostic</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Maladie identifiée */}
            <View style={styles.section}>
              <Text style={styles.diseaseName}>{diagnostic.disease.name}</Text>
              <View style={styles.gravityBadge}>
                <Text style={[styles.gravityText, { color: getGravityColor(diagnostic.disease.gravity) }]}>
                  Gravité: {diagnostic.disease.gravity}
                </Text>
              </View>
              <Text style={styles.confidenceText}>
                Confiance: {Math.round(diagnostic.confidence * 100)}%
              </Text>
            </View>

            {/* Symptômes correspondants */}
            {diagnostic.matchedSymptoms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Symptômes détectés</Text>
                {diagnostic.matchedSymptoms.map((symptom, index) => (
                  <View key={index} style={styles.symptomItem}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.symptomText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Causes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Causes possibles</Text>
              <Text style={styles.causesText}>{diagnostic.disease.causes}</Text>
            </View>

            {/* Recommandations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommandations</Text>
              <Text style={styles.recommendationText}>{diagnostic.recommendation}</Text>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.warning} />
              <Text style={styles.disclaimerText}>
                ⚠️ Ceci est une indication basée sur les symptômes décrits. Seul un vétérinaire peut confirmer le diagnostic !
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark" size={20} color={COLORS.textOnPrimary} />
              <Text style={styles.confirmButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  gravityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
    marginBottom: 8,
  },
  gravityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  symptomText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  causesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceVariant,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
});

