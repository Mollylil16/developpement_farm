/**
 * GestationScreen - Écran unifié de gestion des gestations
 *
 * Supporte les deux modes d'élevage :
 * - Mode Individuel : Utilise GestationsListComponent (référence principale)
 * - Mode Bande : Affiche les gestations batch avec statistiques simplifiées
 *
 * Architecture:
 * - Détection automatique du mode via useModeElevage() et paramètres de route
 * - Mode individuel : Réutilise GestationsListComponent (composant complet avec stats/calendrier)
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
import { useAppSelector } from '../store/hooks';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import GestationsListComponent from '../components/GestationsListComponent';
import apiClient from '../services/api/apiClient';
import { Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

// Type pour les paramètres de route (mode batch)
type GestationRouteParams = {
  batch?: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface GestationCardProps {
  gestation: any;
  isBatchMode: boolean;
}

const GestationCard: React.FC<GestationCardProps> = ({ gestation, isBatchMode }) => {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pregnant':
      case 'en_cours':
        return colors.success;
      case 'delivered':
      case 'terminee':
        return colors.primary;
      case 'aborted':
      case 'avortee':
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
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'avortee':
        return 'Avortée';
      default:
        return status || 'Non spécifié';
    }
  };

  return (
    <Card elevation="small" padding="medium" style={styles.gestationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gestation.status || gestation.statut) + '20' }]}>
            <Ionicons name="heart" size={20} color={getStatusColor(gestation.status || gestation.statut)} />
          </View>
          <View>
            <Text style={[styles.gestationTitle, { color: colors.text }]}>
              {isBatchMode
                ? gestation.pig_name || 'Truie'
                : gestation.truie_nom || gestation.truie_id || 'Truie'}
            </Text>
            <Text style={[styles.statusText, { color: getStatusColor(gestation.status || gestation.statut) }]}>
              {getStatusLabel(gestation.status || gestation.statut)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sautage :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {format(
              new Date(gestation.mating_date || gestation.date_sautage),
              'dd MMM yyyy',
              { locale: fr }
            )}
          </Text>
        </View>

        {(gestation.expected_delivery_date || gestation.date_mise_bas_prevue) && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas prévue :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {format(
                new Date(gestation.expected_delivery_date || gestation.date_mise_bas_prevue),
                'dd MMM yyyy',
                { locale: fr }
              )}
            </Text>
          </View>
        )}

        {(gestation.actual_delivery_date || gestation.date_mise_bas_reelle) && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas réelle :</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              {format(
                new Date(gestation.actual_delivery_date || gestation.date_mise_bas_reelle),
                'dd MMM yyyy',
                { locale: fr }
              )}
            </Text>
          </View>
        )}

        {((gestation.status === 'delivered' || gestation.statut === 'terminee') && 
          (gestation.piglets_alive_count || gestation.piglets_born_count || gestation.nombre_porcelets_vivants || gestation.nombre_porcelets_nes)) && (
          <View style={styles.pigletsInfo}>
            <Text style={[styles.pigletsLabel, { color: colors.textSecondary }]}>Porcelets :</Text>
            <Text style={[styles.pigletsValue, { color: colors.text }]}>
              {gestation.piglets_alive_count || gestation.nombre_porcelets_vivants || 0} vivants / {gestation.piglets_born_count || gestation.nombre_porcelets_nes || 0} nés
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

// Modal pour créer une gestation batch
interface CreateBatchGestationModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBatchGestationModal: React.FC<CreateBatchGestationModalProps> = ({
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
      // Reset form
      setPigletsExpected('10');
      setNotes('');
    } catch (error: any) {
      console.error('Erreur création gestation:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'enregistrer la gestation',
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
      </SafeAreaView>
    </Modal>
  );
};

export default function GestationScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: GestationRouteParams }, 'params'>>();
  const mode = useModeElevage();
  const { projetActif } = useAppSelector((state) => state.projet);
  
  // Paramètres batch (si navigation depuis une bande)
  const batch = route.params?.batch;
  const isBatchMode = mode === 'bande' || !!batch;
  
  // État pour les gestations batch
  const [gestations, setGestations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Charger les données batch si nécessaire
  useEffect(() => {
    if (isBatchMode && batch?.id) {
      loadBatchGestations();
    }
  }, [batch?.id, isBatchMode]);

  async function loadBatchGestations() {
    if (!batch?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-gestations/batch/${batch.id}`);
      setGestations(data || []);
    } catch (error: any) {
      console.error('Erreur chargement gestations batch:', error);
      Alert.alert('Erreur', 'Impossible de charger les gestations');
      setGestations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    if (isBatchMode && batch?.id) {
      await loadBatchGestations();
    }
  }

  if (!projetActif) {
    return null; // Géré par ProtectedScreen parent
  }

  // Mode individuel : utiliser GestationsListComponent (référence principale)
  if (!isBatchMode || !batch) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <GestationsListComponent />
        <ChatAgentFAB />
      </SafeAreaView>
    );
  }

  // Mode batch : affichage adapté
  const title = `Gestations - ${batch.pen_name}`;
  const subtitle = `${batch.total_count} porc(s)`;
  const pregnantCount = gestations.filter((g) => g.status === 'pregnant').length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="heart"
        title={title}
        subtitle={subtitle}
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
        {loading && !refreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement...
            </Text>
          </View>
        ) : gestations.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune gestation enregistrée
            </Text>
          </Card>
        ) : (
          <>
            {/* Carte de statistiques */}
            <Card elevation="small" padding="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total gestations
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {gestations.length}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    En cours
                  </Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {pregnantCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Terminées
                  </Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {gestations.filter((g) => g.status === 'delivered').length}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Liste des gestations */}
            {gestations.map((gestation) => (
              <GestationCard key={gestation.id} gestation={gestation} isBatchMode={true} />
            ))}
          </>
        )}

        <Button
          title="Nouvelle gestation"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateBatchGestationModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          loadBatchGestations();
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
  gestationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginTop: 2,
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

