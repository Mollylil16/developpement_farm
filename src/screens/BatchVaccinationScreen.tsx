/**
 * Écran de vaccination par batch
 * Permet de vacciner plusieurs porcs à la fois avec sélection automatique
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
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type BatchVaccinationRouteParams = {
  batch: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface VaccineCardProps {
  type: string;
  vaccinated: number;
  notVaccinated: number;
  total: number;
  onVaccinate: () => void;
}

const VaccineCard: React.FC<VaccineCardProps> = ({
  type,
  vaccinated,
  notVaccinated,
  total,
  onVaccinate,
}) => {
  const { colors } = useTheme();
  const percentage = total > 0 ? Math.round((vaccinated / total) * 100) : 0;

  const typeLabels: Record<string, string> = {
    vitamines: '💊 Vitamines',
    deparasitant: '🐛 Déparasitant',
    fer: '⚡ Fer',
    antibiotiques: '💉 Antibiotiques',
    autre: '🔬 Autre',
  };

  return (
    <Card elevation="small" padding="medium" style={styles.vaccineCard}>
      <View style={styles.vaccineCardHeader}>
        <Text style={[styles.vaccineType, { color: colors.text }]}>
          {typeLabels[type] || type}
        </Text>
        <Text style={[styles.vaccinePercentage, { color: colors.primary }]}>
          {percentage}%
        </Text>
      </View>

      <View style={styles.vaccineStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Vaccinés
          </Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {vaccinated}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Non vaccinés
          </Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {notVaccinated}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {total}
          </Text>
        </View>
      </View>

      <Button
        title={`Vacciner ${notVaccinated} porc(s)`}
        onPress={onVaccinate}
        variant="primary"
        size="medium"
        disabled={notVaccinated === 0}
        style={styles.vaccinateButton}
      />
    </Card>
  );
};

interface VaccinateBatchModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  vaccineType: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VaccinateBatchModal: React.FC<VaccinateBatchModalProps> = ({
  visible,
  batch,
  vaccineType,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [count, setCount] = useState(batch.total_count.toString());
  const [productName, setProductName] = useState('');
  const [dosage, setDosage] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('suivi_normal');
  const [loading, setLoading] = useState(false);

  const reasonLabels: Record<string, string> = {
    suivi_normal: 'Suivi normal',
    renforcement: 'Renforcement',
    prevention: 'Prévention',
    urgence: 'Urgence',
  };

  async function handleSubmit() {
    if (!productName.trim()) {
      Alert.alert('Erreur', 'Le nom du produit est requis');
      return;
    }

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
      await apiClient.post('/batch-vaccinations/vaccinate', {
        batch_id: batch.id,
        count: countNum,
        vaccine_type: vaccineType,
        product_name: productName.trim(),
        dosage: dosage.trim() || undefined,
        vaccination_date: date.toISOString(),
        reason,
      });

      Alert.alert('Succès', `${countNum} porc(s) vacciné(s) avec succès`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur vaccination:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible de vacciner les porcs',
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Vacciner la bande
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement {count} porc(s) à vacciner
                (priorité aux non vaccinés)
              </Text>
            </View>
          </Card>

          <FormField
            label="Type de vaccin"
            value={vaccineType}
            editable={false}
            style={styles.field}
          />

          <FormField
            label="Nombre à vacciner"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder={`Max: ${batch.total_count}`}
            style={styles.field}
          />

          <FormField
            label="Produit utilisé *"
            value={productName}
            onChangeText={setProductName}
            placeholder="Nom du produit"
            style={styles.field}
          />

          <FormField
            label="Dosage"
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ex: 2ml par porc"
            style={styles.field}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Date de vaccination
            </Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(date, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Raison</Text>
            <View
              style={[
                styles.pickerContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={reason}
                onValueChange={setReason}
                style={[styles.picker, { color: colors.text }]}
              >
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <Picker.Item key={value} label={label} value={value} />
                ))}
              </Picker>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Button
            title="Annuler"
            onPress={onClose}
            variant="outline"
            style={styles.footerButton}
          />
          <Button
            title={`Vacciner ${count} porc(s)`}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !productName.trim()}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function BatchVaccinationScreen() {
  const route = useRoute<RouteProp<{ params: BatchVaccinationRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { batch } = route.params || {};

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('vitamines');

  useEffect(() => {
    if (batch?.id) {
      loadStatus();
    }
  }, [batch?.id]);

  async function loadStatus() {
    if (!batch?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-vaccinations/batch/${batch.id}/status`);
      setStatus(data);
    } catch (error: any) {
      console.error('Erreur chargement statut:', error);
      Alert.alert('Erreur', 'Impossible de charger le statut des vaccinations');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(vaccineType: string) {
    setSelectedVaccineType(vaccineType);
    setModalVisible(true);
  }

  if (!batch) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Bande non trouvée
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="medical"
        title={`Vaccinations - ${batch.pen_name}`}
        subtitle={`${batch.total_count} porc(s)`}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadStatus}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {status?.by_vaccine &&
          Object.entries(status.by_vaccine).map(([type, stats]: [string, any]) => (
            <VaccineCard
              key={type}
              type={type}
              vaccinated={stats.vaccinated}
              notVaccinated={stats.not_vaccinated}
              total={stats.total}
              onVaccinate={() => handleOpenModal(type)}
            />
          ))}
      </ScrollView>

      <VaccinateBatchModal
        visible={modalVisible}
        batch={batch}
        vaccineType={selectedVaccineType}
        onClose={() => setModalVisible(false)}
        onSuccess={loadStatus}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.medium,
  },
  vaccineCard: {
    marginBottom: SPACING.medium,
  },
  vaccineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  vaccineType: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  vaccinePercentage: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
  },
  vaccineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.medium,
    paddingVertical: SPACING.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.small,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
  },
  vaccinateButton: {
    marginTop: SPACING.small,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.medium,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.medium,
  },
  infoCard: {
    marginBottom: SPACING.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.small,
    fontSize: FONT_SIZES.small,
  },
  field: {
    marginBottom: SPACING.medium,
  },
  label: {
    fontSize: FONT_SIZES.small,
    fontWeight: '500',
    marginBottom: SPACING.xsmall,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FONT_SIZES.medium,
  },
  pickerContainer: {
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.medium,
    borderTopWidth: 1,
    gap: SPACING.small,
  },
  footerButton: {
    flex: 1,
  },
  errorText: {
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    marginTop: SPACING.large,
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONT_SIZES.medium,
  },
});

