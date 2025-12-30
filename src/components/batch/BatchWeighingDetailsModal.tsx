import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, RefreshCcw, PiggyBank, Weight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import Card from '../Card';
import Button from '../Button';
import apiClient from '../../services/api/apiClient';
import { Batch, BatchWeighingDetail, BatchWeighingSummary } from '../../types/batch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BatchWeighingDetailsModalProps {
  visible: boolean;
  weighingId: string | null;
  batch?: Batch | null;
  initialSummary?: BatchWeighingSummary | null;
  onClose: () => void;
}

interface BatchWeighingApiResponse {
  weighing: BatchWeighingSummary;
  details: BatchWeighingDetail[];
}

export default function BatchWeighingDetailsModal({
  visible,
  weighingId,
  batch,
  initialSummary,
  onClose,
}: BatchWeighingDetailsModalProps) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<BatchWeighingSummary | null>(
    initialSummary || null,
  );
  const [details, setDetails] = useState<BatchWeighingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = useMemo(() => {
    if (!summary?.weighing_date) return null;
    try {
      return format(new Date(summary.weighing_date), 'dd MMM yyyy - HH:mm', {
        locale: fr,
      });
    } catch (err) {
      return summary.weighing_date;
    }
  }, [summary?.weighing_date]);

  const fetchDetails = useCallback(async () => {
    if (!weighingId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<BatchWeighingApiResponse>(
        `/batch-weighings/${weighingId}/details`,
      );
      setSummary(response.weighing || null);
      setDetails(response.details || []);
    } catch (err: any) {
      console.error('[BatchWeighingDetailsModal] Failed to load details', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Impossible de charger les détails de la pesée";
      setError(message);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, [weighingId]);

  useEffect(() => {
    if (visible && weighingId) {
      setSummary(initialSummary || null);
      fetchDetails();
    }
    if (!visible) {
      setDetails([]);
      setError(null);
    }
  }, [visible, weighingId, initialSummary, fetchDetails]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Détails de la pesée</Text>
          <TouchableOpacity
            onPress={fetchDetails}
            style={styles.refreshButton}
            disabled={loading}
          >
            <RefreshCcw size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.summaryCard} elevation="small" padding="large">
            <View style={styles.summaryHeader}>
              <View>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {batch?.pen_name || summary?.pen_name || 'Loge'}
                </Text>
                <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                  {formattedDate || 'Date inconnue'}
                </Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>
                  {summary?.count ?? details.length} porcs
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryMetric}>
                <Weight size={18} color={colors.primary} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Poids moyen
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {(summary?.average_weight_kg ?? 0).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <PiggyBank size={18} color={colors.success} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Fourchette
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {(summary?.min_weight_kg ?? 0).toFixed(0)} -{' '}
                  {(summary?.max_weight_kg ?? 0).toFixed(0)} kg
                </Text>
              </View>
            </View>

            {summary?.notes && (
              <View
                style={[
                  styles.notesBox,
                  { backgroundColor: colors.surfaceVariant || colors.surface },
                ]}
              >
                <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
                  Notes
                </Text>
                <Text style={[styles.notesText, { color: colors.text }]}>
                  {summary.notes}
                </Text>
              </View>
            )}
          </Card>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: SPACING.sm }}>
                Chargement des affectations...
              </Text>
            </View>
          ) : error ? (
            <Card style={styles.errorCard} elevation="small" padding="medium">
              <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text>
              <Button
                title="Réessayer"
                onPress={fetchDetails}
                style={{ marginTop: SPACING.sm }}
              />
            </Card>
          ) : details.length === 0 ? (
            <Card style={styles.errorCard} elevation="small" padding="medium">
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Aucun détail enregistré pour cette pesée.
              </Text>
            </Card>
          ) : (
            <Card style={styles.detailsCard} elevation="small" padding="large">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Répartition par sujet
              </Text>

              {details.map((item) => {
                const pigLabel = item.pig_name || `Sujet ${item.pig_id.slice(-4)}`;
                const sexLabel =
                  item.sex === 'male'
                    ? 'Mâle'
                    : item.sex === 'female'
                    ? 'Femelle'
                    : item.sex === 'castrated'
                    ? 'Castré'
                    : 'N/A';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.detailRow,
                      { borderBottomColor: colors.divider },
                    ]}
                  >
                    <View>
                      <Text style={[styles.detailName, { color: colors.text }]}>
                        {pigLabel}
                      </Text>
                      <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>
                        {sexLabel}
                      </Text>
                    </View>
                    <View style={styles.detailWeight}>
                      <Text style={[styles.weightValue, { color: colors.primary }]}>
                        {item.weight_kg.toFixed(1)} kg
                      </Text>
                      {item.entry_date && (
                        <Text
                          style={[styles.detailSubtitle, { color: colors.textSecondary }]}
                        >
                          Entrée {format(new Date(item.entry_date), 'dd/MM', { locale: fr })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  summarySubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  countPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  summaryMetric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderColor: '#00000010',
    gap: SPACING.xs,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  notesBox: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  notesLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  loadingBox: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorCard: {
    borderRadius: BORDER_RADIUS.md,
  },
  detailsCard: {
    borderRadius: BORDER_RADIUS.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  detailName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  detailSubtitle: {
    fontSize: FONT_SIZES.xs,
  },
  detailWeight: {
    alignItems: 'flex-end',
  },
  weightValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});


