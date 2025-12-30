import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, SlidersHorizontal, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import Button from '../Button';
import Card from '../Card';
import { Batch } from '../../types/batch';
import apiClient from '../../services/api/apiClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DEFAULT_GMQ = 0.4;
const CHART_HEIGHT = 140;

type BatchWeighingHistory = {
  id: string;
  weighing_date: string;
  average_weight_kg: number;
  min_weight_kg?: number;
  max_weight_kg?: number;
  count?: number;
};

const GMQ_PRESETS: Record<Batch['category'], number[]> = {
  truie_reproductrice: [0.28, 0.32, 0.36],
  verrat_reproducteur: [0.35, 0.4, 0.45],
  porcelets: [0.35, 0.4, 0.45],
  porcs_croissance: [0.55, 0.6, 0.65],
  porcs_engraissement: [0.7, 0.75, 0.8],
};

interface BatchSettingsModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
  onSaved: () => void;
}

export default function BatchSettingsModal({
  visible,
  batch,
  onClose,
  onSaved,
}: BatchSettingsModalProps) {
  const { colors } = useTheme();
  const [gmqInput, setGmqInput] = useState<string>('');
  const [history, setHistory] = useState<BatchWeighingHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = GMQ_PRESETS[batch.category] || [0.35, 0.4, 0.45];

  useEffect(() => {
    if (visible) {
      const initialValue = (
        batch.avg_daily_gain ?? presets[presets.length - 1] ?? DEFAULT_GMQ
      )
        .toFixed(2)
        .replace('.', ',');
      setGmqInput(initialValue);
      setError(null);
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, batch.id]);

  const loadHistory = useCallback(async () => {
    if (!batch.id) return;
    setLoadingHistory(true);
    try {
      const response = await apiClient.get<BatchWeighingHistory[]>(
        `/batch-weighings/batch/${batch.id}/history?limit=12`,
      );
      setHistory(response || []);
    } catch (err) {
      console.warn('[BatchSettingsModal] Erreur chargement historiques', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [batch.id]);

  const parsedGmq = useMemo(() => {
    const normalized = gmqInput.replace(',', '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }, [gmqInput]);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    return [...history]
      .sort(
        (a, b) =>
          new Date(a.weighing_date).getTime() - new Date(b.weighing_date).getTime(),
      )
      .slice(-8);
  }, [history]);

  const maxWeight = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce(
      (max, item) =>
        item.average_weight_kg && item.average_weight_kg > max
          ? item.average_weight_kg
          : max,
      0,
    );
  }, [chartData]);

  const trendValue = useMemo(() => {
    if (chartData.length < 2) return 0;
    return (
      (chartData[chartData.length - 1].average_weight_kg || 0) -
      (chartData[0].average_weight_kg || 0)
    );
  }, [chartData]);

  const handlePresetSelect = (value: number) => {
    setGmqInput(value.toFixed(2).replace('.', ','));
    setError(null);
  };

  const handleSave = async () => {
    if (!parsedGmq || parsedGmq < 0.01) {
      setError('Veuillez saisir un GMQ valide (ex: 0,45)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/batch-pigs/batch/${batch.id}/settings`, {
        avg_daily_gain: parsedGmq,
      });
      Alert.alert('GMQ mis à jour', 'Le gain moyen quotidien a été enregistré.');
      onSaved();
    } catch (err: any) {
      console.error('[BatchSettingsModal] Erreur maj GMQ', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de mettre à jour le GMQ';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Paramètres de la loge
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* GMQ editor */}
          <Card style={styles.card} elevation="small" padding="large">
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <SlidersHorizontal size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Gain moyen quotidien
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Indiquez la progression moyenne de poids (kg/jour)
                  </Text>
                </View>
              </View>
              <Text style={[styles.badge, { color: colors.primary, borderColor: colors.primary }]}>
                {batch.pen_name}
              </Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  GMQ (kg / jour)
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  value={gmqInput}
                  onChangeText={(text) => {
                    setGmqInput(text);
                    setError(null);
                  }}
                  placeholder="0,45"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.currentValue}>
                <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
                  Actuel
                </Text>
                <Text style={[styles.currentValueText, { color: colors.text }]}>
                  {(batch.avg_daily_gain ?? presets[presets.length - 1] ?? DEFAULT_GMQ)
                    .toFixed(2)
                    .replace('.', ',')}
                </Text>
              </View>
            </View>

            <View style={styles.presetsWrapper}>
              <Text style={[styles.presetsLabel, { color: colors.textSecondary }]}>
                Recommandations pour{' '}
                <Text style={{ color: colors.text }}>
                  {batch.category.replace(/_/g, ' ')}
                </Text>
              </Text>
              <View style={styles.presetsRow}>
                {presets.map((value) => {
                  const formatted = value.toFixed(2).replace('.', ',');
                  const isActive = gmqInput.replace('.', ',') === formatted;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.presetChip,
                        {
                          borderColor: isActive ? colors.primary : colors.border,
                          backgroundColor: isActive
                            ? colors.primary + '15'
                            : colors.surfaceVariant || colors.surface,
                        },
                      ]}
                      onPress={() => handlePresetSelect(value)}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          { color: isActive ? colors.primary : colors.text },
                        ]}
                      >
                        {formatted} kg/j
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

            <Button
              title="Enregistrer le GMQ"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              fullWidth
            />
          </Card>

          {/* History & chart */}
          <Card style={styles.card} elevation="small" padding="large">
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <TrendingUp size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Historique des pesées
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Comparer le poids moyen mesuré
                  </Text>
                </View>
              </View>
              {trendValue !== 0 && (
                <Text
                  style={[
                    styles.trendBadge,
                    {
                      color: trendValue >= 0 ? colors.success : colors.error,
                      borderColor: trendValue >= 0 ? colors.success : colors.error,
                    },
                  ]}
                >
                  {trendValue >= 0 ? '+' : ''}
                  {trendValue.toFixed(1)} kg
                </Text>
              )}
            </View>

            {loadingHistory ? (
              <View style={styles.loadingHistory}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textSecondary }}>
                  Chargement des pesées...
                </Text>
              </View>
            ) : chartData.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Aucune pesée récente pour cette loge. Enregistrez une pesée pour voir la
                  tendance.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.chartContainer}>
                  {chartData.map((item) => {
                    const weight = item.average_weight_kg || 0;
                    const barHeight =
                      maxWeight > 0 ? Math.max(8, (weight / maxWeight) * CHART_HEIGHT) : 8;
                    return (
                      <View
                        key={item.id}
                        style={[styles.chartBarWrapper, { height: CHART_HEIGHT }]}
                      >
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: barHeight,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.chartLabel,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {format(new Date(item.weighing_date), 'dd/MM', { locale: fr })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.historyList}>
                  {chartData
                    .slice()
                    .reverse()
                    .map((item) => (
                      <View
                        key={`${item.id}-detail`}
                        style={[
                          styles.historyItem,
                          { borderBottomColor: colors.divider },
                        ]}
                      >
                        <View>
                          <Text style={[styles.historyDate, { color: colors.text }]}>
                            {format(new Date(item.weighing_date), 'dd MMM yyyy', {
                              locale: fr,
                            })}
                          </Text>
                          <Text
                            style={[styles.historyCount, { color: colors.textSecondary }]}
                          >
                            {item.count || 0} porc(s) pesé(s)
                          </Text>
                        </View>
                        <View style={styles.historyWeights}>
                          <Text style={[styles.historyWeightValue, { color: colors.text }]}>
                            {(item.average_weight_kg || 0).toFixed(1)} kg
                          </Text>
                          {item.min_weight_kg != null && item.max_weight_kg != null && (
                            <Text
                              style={[styles.historyRange, { color: colors.textSecondary }]}
                            >
                              {item.min_weight_kg.toFixed(0)} - {item.max_weight_kg.toFixed(0)} kg
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              </>
            )}
          </Card>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
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
  card: {
    borderRadius: BORDER_RADIUS.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  badge: {
    fontSize: FONT_SIZES.sm,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  currentValue: {
    width: 110,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
  },
  currentLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  currentValueText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  presetsWrapper: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetsLabel: {
    fontSize: FONT_SIZES.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  presetText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  errorText: {
    marginBottom: SPACING.sm,
  },
  loadingHistory: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  emptyHistory: {
    paddingVertical: SPACING.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm / 2,
  },
  chartBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  chartBar: {
    width: 18,
    borderRadius: BORDER_RADIUS.sm,
  },
  chartLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  historyList: {
    borderTopWidth: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  historyCount: {
    fontSize: FONT_SIZES.xs,
  },
  historyWeights: {
    alignItems: 'flex-end',
  },
  historyWeightValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  historyRange: {
    fontSize: FONT_SIZES.xs,
  },
  trendBadge: {
    fontSize: FONT_SIZES.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    fontWeight: FONT_WEIGHTS.medium,
  },
});


