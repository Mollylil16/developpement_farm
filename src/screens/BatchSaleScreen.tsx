/**
 * Écran de gestion des ventes par batch
 * Permet d'enregistrer et suivre les ventes des porcs
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

type BatchSaleRouteParams = {
  batch: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

interface SaleCardProps {
  sale: any;
  onUpdate: () => void;
}

const SaleCard: React.FC<SaleCardProps> = ({ sale, onUpdate }) => {
  const { colors } = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card elevation="small" padding="medium" style={styles.saleCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="cash" size={20} color={colors.success} />
          </View>
          <View>
            <Text style={[styles.saleTitle, { color: colors.text }]}>
              Vente de {sale.count} porc(s)
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(new Date(sale.sale_date), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountValue, { color: colors.success }]}>
            {formatCurrency(sale.total_amount)}
          </Text>
          <Text style={[styles.amountPerPig, { color: colors.textSecondary }]}>
            {formatCurrency(sale.total_amount / sale.count)} / porc
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Acheteur :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {sale.buyer_name || 'Non spécifié'}
          </Text>
        </View>

        {sale.notes && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes :</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{sale.notes}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

interface CreateSaleModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSaleModal: React.FC<CreateSaleModalProps> = ({
  visible,
  batch,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [saleDate, setSaleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [count, setCount] = useState('1');
  const [totalAmount, setTotalAmount] = useState('');
  const [buyerName, setBuyerName] = useState('');
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

    const amount = parseFloat(totalAmount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Le montant total doit être supérieur à 0');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-sales', {
        batch_id: batch.id,
        count: countNum,
        total_amount: amount,
        sale_date: saleDate.toISOString(),
        buyer_name: buyerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Succès', `Vente de ${countNum} porc(s) enregistrée avec succès`);
      onSuccess();
      onClose();
      // Reset form
      setCount('1');
      setTotalAmount('');
      setBuyerName('');
      setNotes('');
    } catch (error: any) {
      console.error('Erreur création vente:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'enregistrer la vente',
      );
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.,]/g, '');
    return numericValue;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle vente</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card elevation="small" padding="medium" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Le système sélectionnera automatiquement les {count} porc(s) les plus lourds pour la vente
              </Text>
            </View>
          </Card>

          <FormField
            label="Nombre de porcs à vendre *"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder={`Max: ${batch.total_count}`}
            style={styles.field}
          />

          <FormField
            label="Montant total (FCFA) *"
            value={totalAmount}
            onChangeText={(text) => setTotalAmount(formatCurrency(text))}
            keyboardType="numeric"
            placeholder="Ex: 500000"
            style={styles.field}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date de vente</Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(saleDate, 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={saleDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setSaleDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <FormField
            label="Nom de l'acheteur"
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="Nom optionnel de l'acheteur"
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
            disabled={loading || !totalAmount.trim()}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function BatchSaleScreen() {
  const route = useRoute<RouteProp<{ params: BatchSaleRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { batch } = route.params || {};

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (batch?.id) {
      loadSales();
    }
  }, [batch?.id]);

  async function loadSales() {
    if (!batch?.id) return;

    try {
      const data = await apiClient.get(`/batch-sales/batch/${batch.id}`);
      setSales(data);
    } catch (error: any) {
      console.error('Erreur chargement ventes:', error);
      Alert.alert('Erreur', 'Impossible de charger les ventes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadSales();
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
        <StandardHeader icon="cash" title={`Ventes - ${batch.pen_name}`} subtitle={`${batch.total_count} porc(s)`} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const totalPigsSold = sales.reduce((sum, sale) => sum + (sale.count || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="cash"
        title={`Ventes - ${batch.pen_name}`}
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
        {sales.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune vente enregistrée
            </Text>
          </Card>
        ) : (
          <>
            <Card elevation="small" padding="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total ventes</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{sales.length}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcs vendus</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{totalPigsSold}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revenu total</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                </View>
              </View>
            </Card>

            {sales.map((sale) => (
              <SaleCard key={sale.id} sale={sale} onUpdate={loadSales} />
            ))}
          </>
        )}

        <Button
          title="Nouvelle vente"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      <CreateSaleModal
        visible={modalVisible}
        batch={batch}
        onClose={() => setModalVisible(false)}
        onSuccess={loadSales}
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
  saleCard: {
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
  saleTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  amountPerPig: {
    fontSize: FONT_SIZES.xs,
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
    fontSize: FONT_SIZES.md,
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

