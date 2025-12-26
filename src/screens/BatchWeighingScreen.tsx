/**
 * Écran de gestion des pesées par batch
 * Permet d'enregistrer et suivre les pesées des porcs
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

type BatchWeighingRouteParams = {
  batch: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface WeighingCardProps {
  weighing: any;
  onUpdate: () => void;
}

const WeighingCard: React.FC<WeighingCardProps> = ({ weighing, onUpdate }) => {
  const { colors } = useTheme();

  return (
    <Card elevation="small" padding="medium" style={styles.weighingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="scale" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.pigName, { color: colors.text }]}>
              {weighing.pig_name || 'Porc'}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(new Date(weighing.weighing_date), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
        <View style={styles.weightContainer}>
          <Text style={[styles.weightValue, { color: colors.primary }]}>
            {weighing.weight_kg} kg
          </Text>
        </View>
      </View>

      {weighing.notes && (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes :</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>{weighing.notes}</Text>
        </View>
      )}
    </Card>
  );
};

interface CreateWeighingModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateWeighingModal: React.FC<CreateWeighingModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [weighingDate, setWeighingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [count, setCount] = useState('1');
  const [averageWeight, setAverageWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > batch.total_count) {
      Alert.alert(
        'Erreur',
        `Le nombre doit être entre 1 et ${batch.total_count}`,
      );
      return;
    }

    const avgWeight = parseFloat(averageWeight);
    if (isNaN(avgWeight) || avgWeight <= 0) {
      Alert.alert('Erreur', 'Le poids moyen doit être supérieur à 0');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-weighings', {
        batch_id: batch.id,
        count: countNum,
        average_weight_kg: avgWeight,
        weighing_date: weighingDate.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Succès', `${countNum} pesée(s) enregistrée(s) avec succès`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur création pesée:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'enregistrer la pesée',
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle pesée</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement {count} porc(s) à peser
                (priorité aux non pesés récemment)
              </Text>
            </View>
          </Card>

          <FormField
            label="Nombre de porcs à peser"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder={`Max: ${batch.total_count}`}
            style={styles.field}
          />

          <FormField
            label="Poids moyen (kg) *"
            value={averageWeight}
            onChangeText={setAverageWeight}
            keyboardType="decimal-pad"
            placeholder="Ex: 45.5"
            style={styles.field}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date de pesée</Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(weighingDate, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={weighingDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setWeighingDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes optionnelles"
            multiline
            numberOfLines={3}
            style={styles.field}
          />
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Button title="Annuler" onPress={onClose} variant="outline" style={styles.footerButton} />
          <Button
            title="Enregistrer"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !averageWeight.trim()}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function BatchWeighingScreen() {
  const route = useRoute<RouteProp<{ params: BatchWeighingRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { batch } = route.params || {};

  const [weighings, setWeighings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (batch?.id) {
      loadWeighings();
    }
  }, [batch?.id]);

  async function loadWeighings() {
    if (!batch?.id) return;

    try {
      const data = await apiClient.get(`/batch-weighings/batch/${batch.id}`);
      setWeighings(data);
    } catch (error: any) {
      console.error('Erreur chargement pesées:', error);
      Alert.alert('Erreur', 'Impossible de charger les pesées');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadWeighings();
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
        <StandardHeader icon="scale" title={`Pesées - ${batch.pen_name}`} subtitle={`${batch.total_count} porc(s)`} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const averageWeight = weighings.length > 0
    ? weighings.reduce((sum, w) => sum + (w.weight_kg || 0), 0) / weighings.length
    : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="scale"
        title={`Pesées - ${batch.pen_name}`}
        subtitle={`${batch.total_count} porc(s)`}
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
        {weighings.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="scale-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune pesée enregistrée
            </Text>
          </Card>
        ) : (
          <>
            <Card elevation="small" padding="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total pesées</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{weighings.length}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids moyen</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {averageWeight.toFixed(1)} kg
                  </Text>
                </View>
              </View>
            </Card>

            {weighings.map((weighing) => (
              <WeighingCard key={weighing.id} weighing={weighing} onUpdate={loadWeighings} />
            ))}
          </>
        )}

        <Button
          title="Nouvelle pesée"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateWeighingModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={loadWeighings}
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
  weighingCard: {
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
  iconBadge: {
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
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  weightContainer: {
    alignItems: 'flex-end',
  },
  weightValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  notesContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
  },
  statsCard: {
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
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

