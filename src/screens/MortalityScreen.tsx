/**
 * MortalityScreen - Écran unifié de gestion des mortalités
 *
 * Supporte les deux modes d'élevage :
 * - Mode Individuel : Utilise MortalitesListComponent (référence principale)
 * - Mode Bande : Affiche les mortalités batch avec statistiques simplifiées
 *
 * Architecture:
 * - Détection automatique du mode via useModeElevage() et paramètres de route
 * - Mode individuel : Réutilise MortalitesListComponent (composant complet avec stats/graphiques)
 * - Mode batch : Affichage adapté avec statistiques simplifiées
 * - Même UI pour les deux modes (cohérence visuelle)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useModeElevage } from '../hooks/useModeElevage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import MortalitesListComponent from '../components/MortalitesListComponent';
import MortalitesFormModal from '../components/MortalitesFormModal';
import apiClient from '../services/api/apiClient';
import { Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { Picker } from '@react-native-picker/picker';

// Type pour les paramètres de route (mode batch)
type MortalityRouteParams = {
  batch?: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface MortalityCardProps {
  mortality: any;
  isBatchMode: boolean;
}

const MortalityCard: React.FC<MortalityCardProps> = ({ mortality, isBatchMode }) => {
  const { colors } = useTheme();

  const getCauseColor = (cause: string) => {
    switch (cause) {
      case 'disease':
      case 'Maladie':
        return colors.error;
      case 'accident':
      case 'Accident':
        return colors.warning;
      case 'unknown':
      case 'Cause inconnue':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getCauseLabel = (cause: string) => {
    if (!cause) return 'Non spécifiée';
    switch (cause) {
      case 'disease':
        return 'Maladie';
      case 'accident':
        return 'Accident';
      case 'unknown':
        return 'Cause inconnue';
      default:
        return cause;
    }
  };

  return (
    <Card elevation="small" padding="medium" style={styles.mortalityCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
          </View>
          <View>
            <Text style={[styles.mortalityTitle, { color: colors.text }]}>
              {isBatchMode
                ? mortality.pig_name || 'Porc'
                : mortality.animal_code || `${mortality.nombre_porcs} porc(s)`}
            </Text>
            <Text style={[styles.causeText, { color: getCauseColor(mortality.cause_of_death || mortality.cause) }]}>
              {getCauseLabel(mortality.cause_of_death || mortality.cause)}
            </Text>
            {!isBatchMode && mortality.categorie && (
              <Text style={[styles.categorieText, { color: colors.textSecondary }]}>
                {mortality.categorie}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {format(
              new Date(mortality.death_date || mortality.date),
              'dd MMM yyyy',
              { locale: fr }
            )}
          </Text>
        </View>
      </View>

      {(mortality.notes || mortality.veterinary_report) && (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes :</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>
            {mortality.notes || mortality.veterinary_report}
          </Text>
        </View>
      )}
    </Card>
  );
};

// Modal pour créer une mortalité batch
interface CreateBatchMortalityModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBatchMortalityModal: React.FC<CreateBatchMortalityModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [deathDate, setDeathDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [count, setCount] = useState('1');
  const [cause, setCause] = useState('disease');
  const [veterinaryReport, setVeterinaryReport] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const causeLabels: Record<string, string> = {
    disease: 'Maladie',
    accident: 'Accident',
    unknown: 'Cause inconnue',
  };

  async function handleSubmit() {
    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > batch.total_count) {
      Alert.alert(
        'Erreur',
        `Le nombre doit être entre 1 et ${batch.total_count}`,
      );
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-mortalities', {
        batch_id: batch.id,
        count: countNum,
        death_date: deathDate.toISOString(),
        death_cause: cause,
        veterinary_report: veterinaryReport.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Succès', `${countNum} mortalité(s) enregistrée(s) avec succès`);
      onSuccess();
      onClose();
      // Reset form
      setCount('1');
      setCause('disease');
      setVeterinaryReport('');
      setNotes('');
    } catch (error: any) {
      console.error('Erreur création mortalité:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'enregistrer la mortalité',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle mortalité</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.error} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement un porc malade pour enregistrer la mortalité
              </Text>
            </View>
          </Card>

          <FormField
            label="Nombre de porcs morts *"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder={`Max: ${batch.total_count}`}
            style={styles.field}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date de décès</Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(deathDate, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={deathDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDeathDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Cause du décès</Text>
            <View
              style={[
                styles.pickerContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={cause}
                onValueChange={setCause}
                style={[styles.picker, { color: colors.text }]}
              >
                {Object.entries(causeLabels).map(([value, label]) => (
                  <Picker.Item key={value} label={label} value={value} />
                ))}
              </Picker>
            </View>
          </View>

          <FormField
            label="Rapport vétérinaire"
            value={veterinaryReport}
            onChangeText={setVeterinaryReport}
            placeholder="Rapport vétérinaire optionnel"
            multiline
            numberOfLines={3}
            style={styles.field}
          />

          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes optionnelles sur les circonstances du décès"
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
      </SafeAreaView>
    </Modal>
  );
};

export default function MortalityScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: MortalityRouteParams }, 'params'>>();
  const mode = useModeElevage();
  const { projetActif } = useAppSelector((state) => state.projet);
  
  // Paramètres batch (si navigation depuis une bande)
  const batch = route.params?.batch;
  const isBatchMode = mode === 'bande' || !!batch;
  
  // État pour les mortalités batch
  const [mortalities, setMortalities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Charger les données batch si nécessaire
  useEffect(() => {
    if (isBatchMode && batch?.id) {
      loadBatchMortalities();
    }
  }, [batch?.id, isBatchMode]);

  async function loadBatchMortalities() {
    if (!batch?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-mortalities/batch/${batch.id}`);
      setMortalities(data || []);
    } catch (error: any) {
      console.error('Erreur chargement mortalités batch:', error);
      Alert.alert('Erreur', 'Impossible de charger les mortalités');
      setMortalities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    if (isBatchMode && batch?.id) {
      await loadBatchMortalities();
    }
  }

  if (!projetActif) {
    return null; // Géré par ProtectedScreen parent
  }

  // Mode individuel : utiliser MortalitesListComponent (référence principale)
  if (!isBatchMode || !batch) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <MortalitesListComponent />
        <ChatAgentFAB />
      </SafeAreaView>
    );
  }

  // Mode batch : affichage adapté
  const title = `Mortalités - ${batch.pen_name}`;
  const subtitle = `${batch.total_count} porc(s)`;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="close-circle"
        title={title}
        subtitle={subtitle}
        badge={mortalities.length}
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
        {loading && !refreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement...
            </Text>
          </View>
        ) : mortalities.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="close-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune mortalité enregistrée
            </Text>
          </Card>
        ) : (
          <>
            {/* Carte de statistiques */}
            <Card elevation="small" padding="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total mortalités
                  </Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {mortalities.length}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Taux de mortalité
                  </Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {batch.total_count > 0
                      ? ((mortalities.length / batch.total_count) * 100).toFixed(1)
                      : 0}%
                  </Text>
                </View>
              </View>
            </Card>

            {/* Liste des mortalités */}
            {mortalities.map((mortality) => (
              <MortalityCard key={mortality.id} mortality={mortality} isBatchMode={true} />
            ))}
          </>
        )}

        <Button
          title="Nouvelle mortalité"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateBatchMortalityModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          loadBatchMortalities();
          setModalVisible(false);
        }}
      />

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_SIZES.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
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
  mortalityCard: {
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
  mortalityTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  causeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  categorieText: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
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
  pickerContainer: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
});

