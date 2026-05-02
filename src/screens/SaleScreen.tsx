/**
 * SaleScreen - Écran unifié de gestion des ventes
 *
 * Supporte les deux modes d'élevage :
 * - Mode Individuel : Ventes par animal (via revenus avec catégorie vente_porc)
 * - Mode Bande : Ventes par bande (batch)
 *
 * Architecture:
 * - Détection automatique du mode via useModeElevage() et paramètres de route
 * - Affichage conditionnel selon le mode
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
import { selectAllRevenus } from '../store/selectors/financeSelectors';
import { loadRevenus } from '../store/slices/financeSlice';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import RevenuFormModal from '../components/RevenuFormModal';
import apiClient from '../services/api/apiClient';
import { Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

// Type pour les paramètres de route (mode batch)
type SaleRouteParams = {
  batch?: {
    id: string;
    pen_name: string;
    total_count: number;
  };
  animalId?: string; // Mode individuel : animal pré-sélectionné
};

interface SaleCardProps {
  sale: any;
  isBatchMode: boolean;
}

const SaleCard: React.FC<SaleCardProps> = ({ sale, isBatchMode }) => {
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
              {isBatchMode
                ? `Vente de ${sale.count || 1} porc(s)`
                : sale.description || sale.animal_code || 'Vente de porc'}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(
                new Date(sale.sale_date || sale.date),
                'dd MMM yyyy',
                { locale: fr }
              )}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountValue, { color: colors.success }]}>
            {formatCurrency(isBatchMode ? sale.total_price : sale.montant)}
          </Text>
          {isBatchMode && sale.count > 1 && (
            <Text style={[styles.amountPerPig, { color: colors.textSecondary }]}>
              {formatCurrency(sale.total_price / sale.count)} / porc
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardContent}>
        {isBatchMode ? (
          <>
            {sale.buyer_name && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Acheteur :</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {sale.buyer_name}
                </Text>
              </View>
            )}
            {sale.total_weight_kg && (
              <View style={styles.infoRow}>
                <Ionicons name="scale-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids total :</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {sale.total_weight_kg.toFixed(1)} kg
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {sale.poids_kg && (
              <View style={styles.infoRow}>
                <Ionicons name="scale-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids :</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {sale.poids_kg.toFixed(1)} kg
                </Text>
              </View>
            )}
          </>
        )}

        {(sale.notes || sale.commentaire) && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes :</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>
              {sale.notes || sale.commentaire}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

export default function SaleScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: SaleRouteParams }, 'params'>>();
  const mode = useModeElevage();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  
  // Paramètres batch (si navigation depuis une bande)
  const batch = route.params?.batch;
  const animalId = route.params?.animalId;
  const isBatchMode = mode === 'bande' || !!batch;
  
  // État pour les ventes
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Redux pour mode individuel
  const allRevenus = useAppSelector(selectAllRevenus);
  const ventesIndividuelles = React.useMemo(() => {
    return (allRevenus || []).filter((r) => r.categorie === 'vente_porc');
  }, [allRevenus]);

  // Charger les données selon le mode
  useEffect(() => {
    if (isBatchMode && batch?.id) {
      loadBatchSales();
    } else if (projetActif?.id) {
      loadIndividualSales();
    }
  }, [batch?.id, projetActif?.id, isBatchMode]);

  async function loadBatchSales() {
    if (!batch?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-sales/batch/${batch.id}/history`);
      setSales(data || []);
    } catch (error: any) {
      console.error('Erreur chargement ventes batch:', error);
      Alert.alert('Erreur', 'Impossible de charger les ventes');
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadIndividualSales() {
    if (!projetActif?.id) return;

    setLoading(true);
    try {
      await dispatch(loadRevenus(projetActif.id)).unwrap();
      // Les ventes sont dans Redux, on les récupère via le sélecteur
    } catch (error: any) {
      console.error('Erreur chargement ventes individuelles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    if (isBatchMode && batch?.id) {
      await loadBatchSales();
    } else {
      await loadIndividualSales();
    }
  }

  // Calculer les statistiques
  const stats = React.useMemo(() => {
    if (isBatchMode) {
      const total = sales.length;
      const totalRevenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
      const totalPigsSold = sales.reduce((sum, s) => sum + (s.count || 0), 0);
      return { total, totalRevenue, totalPigsSold };
    } else {
      const filtered = animalId
        ? ventesIndividuelles.filter((v) => v.animal_id === animalId)
        : ventesIndividuelles;
      const total = filtered.length;
      const totalRevenue = filtered.reduce((sum, v) => sum + (v.montant || 0), 0);
      return { total, totalRevenue, totalPigsSold: total };
    }
  }, [sales, ventesIndividuelles, animalId, isBatchMode]);

  // Obtenir les ventes à afficher
  const displaySales = React.useMemo(() => {
    if (isBatchMode) {
      return sales;
    } else {
      return animalId
        ? ventesIndividuelles.filter((v) => v.animal_id === animalId)
        : ventesIndividuelles;
    }
  }, [sales, ventesIndividuelles, animalId, isBatchMode]);

  if (!projetActif) {
    return null; // Géré par ProtectedScreen parent
  }

  const title = isBatchMode
    ? `Ventes - ${batch?.pen_name || 'Bande'}`
    : animalId
    ? 'Ventes - Animal'
    : 'Ventes';
  const subtitle = isBatchMode
    ? `${batch?.total_count || 0} porc(s)`
    : `${stats.total} vente(s)`;

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
      <StandardHeader icon="cash" title={title} subtitle={subtitle} />

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
        ) : displaySales.length === 0 ? (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune vente enregistrée
            </Text>
          </Card>
        ) : (
          <>
            {/* Carte de statistiques */}
            <Card elevation="small" padding="medium" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total ventes
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
                </View>
                {isBatchMode && (
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Porcs vendus
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {stats.totalPigsSold}
                    </Text>
                  </View>
                )}
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Revenu total
                  </Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {formatCurrency(stats.totalRevenue)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Liste des ventes */}
            {displaySales.map((sale) => (
              <SaleCard key={sale.id} sale={sale} isBatchMode={isBatchMode} />
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

      {/* Modal de création de vente */}
      {isBatchMode && batch ? (
        <CreateBatchSaleModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            loadBatchSales();
            setModalVisible(false);
          }}
          batch={batch}
        />
      ) : (
        <RevenuFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            loadIndividualSales();
            setModalVisible(false);
          }}
          animalId={animalId}
        />
      )}

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

// Modal pour créer une vente batch
interface CreateBatchSaleModalProps {
  visible: boolean;
  batch: { id: string; pen_name: string; total_count: number };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBatchSaleModal: React.FC<CreateBatchSaleModalProps> = ({
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
  const [totalWeight, setTotalWeight] = useState('');
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

    const weight = parseFloat(totalWeight.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Erreur', 'Le poids total doit être supérieur à 0');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-sales', {
        batch_id: batch.id,
        count: countNum,
        total_price: amount,
        total_weight_kg: weight,
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
      setTotalWeight('');
      setBuyerName('');
      setNotes('');
    } catch (error: any) {
      console.error('Erreur création vente:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || "Impossible d'enregistrer la vente",
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
            label="Poids total (kg) *"
            value={totalWeight}
            onChangeText={(text) => setTotalWeight(text.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="Ex: 450.5"
            style={styles.field}
          />

          <FormField
            label="Montant total (FCFA) *"
            value={totalAmount}
            onChangeText={(text) => setTotalAmount(text.replace(/[^\d.,]/g, ''))}
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
            disabled={loading || !totalAmount.trim() || !totalWeight.trim()}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
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

