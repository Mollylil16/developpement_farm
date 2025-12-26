/**
 * Écran de gestion des maladies par batch
 * Permet d'enregistrer et suivre les maladies des porcs
 * Design cohérent avec les écrans santé du mode individuel
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import apiClient from '../services/api/apiClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type BatchDiseaseRouteParams = {
  batch: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface DiseaseCardProps {
  disease: any;
  onUpdate: () => void;
}

const DiseaseCard: React.FC<DiseaseCardProps> = ({ disease, onUpdate }) => {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sick':
        return colors.error;
      case 'recovering':
        return colors.warning;
      case 'recovered':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sick':
        return 'Malade';
      case 'recovering':
        return 'En convalescence';
      case 'recovered':
        return 'Guéri';
      default:
        return status;
    }
  };

  return (
    <Card elevation="small" padding="medium" style={styles.diseaseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(disease.status) + '20' }]}>
            <Ionicons name="medical" size={20} color={getStatusColor(disease.status)} />
          </View>
          <View>
            <Text style={[styles.pigName, { color: colors.text }]}>
              {disease.pig_name || 'Porc'}
            </Text>
            <Text style={[styles.statusText, { color: getStatusColor(disease.status) }]}>
              {getStatusLabel(disease.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="bug-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Maladie :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{disease.disease_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {format(new Date(disease.disease_date), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>

        {disease.symptoms && (
          <View style={styles.symptomsContainer}>
            <Text style={[styles.symptomsLabel, { color: colors.textSecondary }]}>Symptômes :</Text>
            <Text style={[styles.symptomsText, { color: colors.text }]}>{disease.symptoms}</Text>
          </View>
        )}

        {disease.treatment && (
          <View style={styles.treatmentContainer}>
            <Text style={[styles.treatmentLabel, { color: colors.textSecondary }]}>Traitement :</Text>
            <Text style={[styles.treatmentText, { color: colors.text }]}>{disease.treatment}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

interface CreateDiseaseModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateDiseaseModal: React.FC<CreateDiseaseModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [diseaseDate, setDiseaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [diseaseName, setDiseaseName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!diseaseName.trim()) {
      Alert.alert('Erreur', 'Le nom de la maladie est requis');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-diseases', {
        batch_id: batch.id,
        disease_name: diseaseName.trim(),
        disease_date: diseaseDate.toISOString(),
        symptoms: symptoms.trim() || undefined,
        treatment: treatment.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Succès', 'Maladie enregistrée avec succès');
      onSuccess();
      onClose();
      // Reset form
      setDiseaseName('');
      setSymptoms('');
      setTreatment('');
      setNotes('');
    } catch (error: any) {
      console.error('Erreur création maladie:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'enregistrer la maladie',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle maladie</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement un porc sain à marquer comme malade
              </Text>
            </View>
          </Card>

          <FormField
            label="Nom de la maladie *"
            value={diseaseName}
            onChangeText={setDiseaseName}
            placeholder="Ex: Diarrhée, Fièvre..."
            style={styles.field}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date de détection</Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(diseaseDate, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={diseaseDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDiseaseDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <FormField
            label="Symptômes"
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Décrivez les symptômes observés"
            multiline
            numberOfLines={3}
            style={styles.field}
          />

          <FormField
            label="Traitement"
            value={treatment}
            onChangeText={setTreatment}
            placeholder="Décrivez le traitement administré"
            multiline
            numberOfLines={3}
            style={styles.field}
          />

          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes optionnelles"
            multiline
            numberOfLines={2}
            style={styles.field}
          />
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Button title="Annuler" onPress={onClose} variant="outline" style={styles.footerButton} />
          <Button
            title="Enregistrer"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !diseaseName.trim()}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function BatchDiseaseScreen() {
  const route = useRoute<RouteProp<{ params: BatchDiseaseRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { batch } = route.params || {};

  const [diseases, setDiseases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (batch?.id) {
      loadDiseases();
    }
  }, [batch?.id]);

  async function loadDiseases() {
    if (!batch?.id) return;

    try {
      const data = await apiClient.get(`/batch-diseases/batch/${batch.id}`);
      setDiseases(data);
    } catch (error: any) {
      console.error('Erreur chargement maladies:', error);
      Alert.alert('Erreur', 'Impossible de charger les maladies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDiseases();
  }

  if (!batch) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.error }]}>Bande non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StandardHeader icon="medical" title={`Maladies - ${batch.pen_name}`} subtitle={`${batch.total_count} porc(s)`} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sickCount = diseases.filter((d) => d.status === 'sick').length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="medical"
        title={`Maladies - ${batch.pen_name}`}
        subtitle={`${batch.total_count} porc(s)`}
        badge={sickCount}
        badgeColor={colors.error}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {diseases.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="medical-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune maladie enregistrée
            </Text>
          </Card>
        ) : (
          diseases.map((disease) => (
            <DiseaseCard key={disease.id} disease={disease} onUpdate={loadDiseases} />
          ))
        )}

        <Button
          title="Nouvelle maladie"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateDiseaseModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={loadDiseases}
      />
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  diseaseCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pigName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  cardContent: {
    gap: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  symptomsContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  symptomsLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  symptomsText: {
    fontSize: FONT_SIZES.sm,
  },
  treatmentContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  treatmentLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  treatmentText: {
    fontSize: FONT_SIZES.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  addButton: {
    marginTop: SPACING.md,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
});

