/**
 * Composant Carte de Sujet pour Pesées
 * Affiche une carte pour un animal (mode individuel) ou une bande (mode bande)
 * avec les métriques de pesée pertinentes
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import Button from '../Button';
import type { ProductionAnimal } from '../../types/production';
import type { ProductionPesee } from '../../types/production';
import type { Batch } from '../../types/batch';
import type { BatchWeighingSummary } from '../../types/batch';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SujetPeseeCardProps {
  // Mode individuel
  animal?: ProductionAnimal;
  dernierePesee?: ProductionPesee;

  // Mode bande
  batch?: Batch;
  dernierePeseeBatch?: BatchWeighingSummary;

  // Commun
  mode: 'individuel' | 'bande';
  gmq?: number;
  enRetard?: boolean;
  joursDepuisDernierePesee?: number | null;

  // Actions
  onViewDetails: () => void;
  onNouvellePesee: () => void;
}

interface MetricBoxProps {
  label: string;
  value: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
}

const MetricBox: React.FC<MetricBoxProps> = ({ label, value, color, icon, size = 'medium' }) => {
  const { colors } = useTheme();
  const fontSize = size === 'large' ? FONT_SIZES.lg : size === 'medium' ? FONT_SIZES.md : FONT_SIZES.sm;

  return (
    <View style={[styles.metricBox, { backgroundColor: color + '15' }]}>
      {icon && <Ionicons name={icon} size={16} color={color} style={styles.metricIcon} />}
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color, fontSize }]}>{value}</Text>
    </View>
  );
};

export default function SujetPeseeCard({
  animal,
  batch,
  mode,
  dernierePesee,
  dernierePeseeBatch,
  gmq,
  enRetard,
  joursDepuisDernierePesee,
  onViewDetails,
  onNouvellePesee,
}: SujetPeseeCardProps) {
  const { colors } = useTheme();

  // Données adaptatives selon le mode
  const sujetData = React.useMemo(() => {
    if (mode === 'bande' && batch) {
      const poidsActuel = dernierePeseeBatch?.average_weight_kg || batch.average_weight_kg || 0;
      return {
        id: batch.id,
        nom: batch.pen_name || batch.id,
        poidsActuel,
        nombreSujets: batch.total_count || 0,
        icon: 'home' as const,
        subtitle: `${batch.category?.replace(/_/g, ' ') || 'Bande'} • ${batch.total_count || 0} sujet(s)`,
      };
    } else if (mode === 'individuel' && animal) {
      const poidsActuel = dernierePesee?.poids_kg || 0;
      return {
        id: animal.id,
        nom: animal.code || animal.id,
        poidsActuel,
        nombreSujets: 1,
        icon: 'paw' as const,
        subtitle: `${animal.race || 'N/A'} • ${animal.sexe || 'N/A'}`,
      };
    }
    return null;
  }, [mode, animal, batch, dernierePesee, dernierePeseeBatch]);

  if (!sujetData) {
    return null;
  }

  // Formater la date de dernière pesée
  const dernierePeseeText = React.useMemo(() => {
    if (joursDepuisDernierePesee === null || joursDepuisDernierePesee === undefined) {
      return 'Aucune pesée';
    }
    if (joursDepuisDernierePesee === 0) {
      return "Aujourd'hui";
    }
    if (joursDepuisDernierePesee === 1) {
      return 'Il y a 1 jour';
    }
    return `Il y a ${joursDepuisDernierePesee} jours`;
  }, [joursDepuisDernierePesee]);

  // Date de dernière pesée pour le formatage complet
  const dernierePeseeDate = mode === 'bande'
    ? dernierePeseeBatch?.weighing_date
    : dernierePesee?.date;

  const dernierePeseeDateFormatted = dernierePeseeDate
    ? format(new Date(dernierePeseeDate), 'dd MMM yyyy', { locale: fr })
    : null;

  return (
    <Card elevation="small" padding="medium" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={sujetData.icon} size={24} color={colors.primary} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {sujetData.nom}
            </Text>
            {enRetard && (
              <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="alert-circle" size={12} color={colors.error} />
                <Text style={[styles.badgeText, { color: colors.error }]}>En retard</Text>
              </View>
            )}
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {sujetData.subtitle}
          </Text>

          {dernierePeseeDateFormatted && (
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Dernière pesée : {dernierePeseeDateFormatted}
            </Text>
          )}
        </View>
      </View>

      {/* Métriques */}
      <View style={styles.metrics}>
        <MetricBox
          label="Poids actuel"
          value={`${sujetData.poidsActuel.toFixed(1)} kg`}
          color={colors.primary}
          icon="scale"
          size="large"
        />

        {gmq !== undefined && gmq !== null && (
          <MetricBox
            label="GMQ"
            value={`${gmq.toFixed(0)} g/j`}
            icon={gmq >= 500 ? 'trending-up' : 'trending-down'}
            color={gmq >= 500 ? colors.success : colors.warning}
            size="medium"
          />
        )}

        {joursDepuisDernierePesee !== undefined && joursDepuisDernierePesee !== null && (
          <MetricBox
            label="Dernière pesée"
            value={dernierePeseeText}
            icon="time"
            color={enRetard ? colors.error : colors.info || colors.primary}
            size="small"
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Voir détails"
          variant="outline"
          size="small"
          onPress={onViewDetails}
          style={styles.actionButton}
        />
        <Button
          title="Nouvelle pesée"
          variant="primary"
          size="small"
          onPress={onNouvellePesee}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
  },
  metrics: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricBox: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: SPACING.xs / 2,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
    textAlign: 'center',
  },
  metricValue: {
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionButton: {
    flex: 1,
  },
});

