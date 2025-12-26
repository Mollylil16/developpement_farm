/**
 * Écran de gestion des gestations par batch
 * Permet d'enregistrer et suivre les gestations des truies
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
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
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

type BatchGestationRouteParams = {
  batch: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface GestationCardProps {
  gestation: any;
  onUpdate: () => void;
}

const GestationCard: React.FC<GestationCardProps> = ({ gestation, onUpdate }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pregnant':
        return colors.success;
      case 'delivered':
        return colors.primary;
      case 'aborted':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pregnant':
        return 'En cours';
      case 'delivered':
        return 'Mise bas effectuée';
      case 'aborted':
        return 'Avortement';
      default:
        return status;
    }
  };

  return (
    <Card elevation="small" padding="medium" style={styles.gestationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gestation.status) + '20' }]}>
            <Ionicons name="heart" size={20} color={getStatusColor(gestation.status)} />
          </View>
          <View>
            <Text style={[styles.pigName, { color: colors.text }]}>
              {gestation.pig_name || 'Truie'}
            </Text>
            <Text style={[styles.statusText, { color: getStatusColor(gestation.status) }]}>
              {getStatusLabel(gestation.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sautage :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {format(new Date(gestation.mating_date), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas prévue :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {format(new Date(gestation.expected_delivery_date), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>

        {gestation.actual_delivery_date && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas réelle :</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              {format(new Date(gestation.actual_delivery_date), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        )}

        {gestation.status === 'delivered' && (
          <View style={styles.pigletsInfo}>
            <Text style={[styles.pigletsLabel, { color: colors.textSecondary }]}>Porcelets :</Text>
            <Text style={[styles.pigletsValue, { color: colors.text }]}>
              {gestation.piglets_alive_count || 0} vivants / {gestation.piglets_born_count || 0} nés
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

interface CreateGestationModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGestationModal: React.FC<CreateGestationModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [matingDate, setMatingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pigletsExpected, setPigletsExpected] = useState('10');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    try {
      await apiClient.post('/batch-gestations', {
        batch_id: batch.id,
        mating_date: matingDate.toISOString(),
        piglets_expected: parseInt(pigletsExpected) || 10,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Succès', 'Gestation enregistrée avec succès');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur création gestation:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible d\'enregistrer la gestation');
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
      <RNSSafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle gestation</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement une truie non gestante
              </Text>
            </View>
          </Card>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date de sautage</Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(matingDate, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={matingDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setMatingDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <FormField
            label="Nombre de porcelets prévu"
            value={pigletsExpected}
            onChangeText={setPigletsExpected}
            keyboardType="number-pad"
            placeholder="Ex: 10"
            style={styles.field}
          />

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
            style={styles.footerButton}
          />
        </View>
      </RNSSafeAreaView>
    </Modal>
  );
};

export default function BatchGestationScreen() {
  const route = useRoute<RouteProp<{ params: BatchGestationRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { batch } = route.params || {};

  const [gestations, setGestations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (batch?.id) {
      loadGestations();
    }
  }, [batch?.id]);

  async function loadGestations() {
    if (!batch?.id) return;

    try {
      const data = await apiClient.get(`/batch-gestations/batch/${batch.id}`);
      setGestations(data);
    } catch (error: any) {
      console.error('Erreur chargement gestations:', error);
      Alert.alert('Erreur', 'Impossible de charger les gestations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadGestations();
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
        <StandardHeader icon="heart" title={`Gestations - ${batch.pen_name}`} subtitle={`${batch.total_count} porc(s)`} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pregnantCount = gestations.filter((g) => g.status === 'pregnant').length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="heart"
        title={`Gestations - ${batch.pen_name}`}
        subtitle={`${batch.total_count} porc(s)`}
        badge={pregnantCount}
        badgeColor={colors.success}
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
        {gestations.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune gestation enregistrée
            </Text>
          </Card>
        ) : (
          gestations.map((gestation) => (
            <GestationCard key={gestation.id} gestation={gestation} onUpdate={loadGestations} />
          ))
        )}

        <Button
          title="Nouvelle gestation"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color={colors.primary} />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateGestationModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={loadGestations}
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
  gestationCard: {
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
  pigletsInfo: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  pigletsLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  pigletsValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
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

