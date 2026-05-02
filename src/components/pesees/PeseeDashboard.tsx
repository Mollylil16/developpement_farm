/**
 * Composant Dashboard pour les statistiques globales des pesées
 * Fonctionne pour les modes individuel et bande
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import { usePeseesStats } from '../../hooks/pesees/usePeseesStats';
import { useModeElevage } from '../../hooks/useModeElevage';

interface PeseeDashboardProps {
  projetId: string | undefined;
  periode?: '7j' | '30j' | '90j' | 'tout';
  onPeriodeChange?: (periode: '7j' | '30j' | '90j' | 'tout') => void;
}

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  showBadge?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, icon, color, showBadge }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.statBox, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>!</Text>
        </View>
      )}
    </View>
  );
};

export default function PeseeDashboard({
  projetId,
  periode: periodeProp = '30j',
  onPeriodeChange,
}: PeseeDashboardProps) {
  const { colors } = useTheme();
  const mode = useModeElevage();
  const [periodeLocal, setPeriodeLocal] = useState<'7j' | '30j' | '90j' | 'tout'>(periodeProp);

  const periode = periodeProp || periodeLocal;

  const { data: stats, loading, error } = usePeseesStats({
    projetId,
    mode,
    periode,
    enabled: !!projetId,
  });

  const handlePeriodeChange = (newPeriode: '7j' | '30j' | '90j' | 'tout') => {
    setPeriodeLocal(newPeriode);
    onPeriodeChange?.(newPeriode);
  };

  if (!projetId) {
    return null;
  }

  if (loading) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des statistiques...
          </Text>
        </View>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'Erreur lors du chargement des statistiques'}
          </Text>
        </View>
      </Card>
    );
  }

  // Formater la date de dernière pesée
  const dernierePeseeText = stats.derniere_pesee_date
    ? (() => {
        try {
          return formatDistanceToNow(new Date(stats.derniere_pesee_date), {
            addSuffix: true,
            locale: fr,
          });
        } catch {
          return format(new Date(stats.derniere_pesee_date), 'dd/MM/yyyy', { locale: fr });
        }
      })()
    : 'Aucune pesée';

  return (
    <Card elevation="medium" padding="large" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'bande' ? '📊 Progression Globale de la Ferme' : '📊 Vue d\'ensemble du Cheptel'}
        </Text>
      </View>

      {/* Grille de statistiques */}
      <View style={styles.statsGrid}>
        <StatBox
          label={mode === 'bande' ? 'Poids moyen' : 'Poids moyen'}
          value={`${stats.poids_moyen.toFixed(1)} kg`}
          icon="scale"
          color={colors.primary}
        />

        <StatBox
          label="GMQ moyen"
          value={`${stats.gmq_moyen.toFixed(0)} g/j`}
          icon="trending-up"
          color={colors.success}
        />

        <StatBox
          label="Dernière pesée"
          value={dernierePeseeText}
          icon="time"
          color={colors.info || colors.primary}
        />

        <StatBox
          label={mode === 'bande' ? 'Loges' : 'Animaux'}
          value={stats.total_animaux.toString()}
          icon={mode === 'bande' ? 'home' : 'paw'}
          color={colors.warning}
        />

        <StatBox
          label="En retard"
          value={stats.nb_en_retard.toString()}
          icon="alert-circle"
          color={colors.error}
          showBadge={stats.nb_en_retard > 0}
        />

        <StatBox
          label="Objectifs"
          value={`${stats.objectifs_atteints} / ${stats.total_animaux}`}
          icon="checkmark-circle"
          color={colors.success}
        />
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Période :</Text>
        <View style={styles.periodButtons}>
          {(['7j', '30j', '90j', 'tout'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                {
                  backgroundColor: periode === p ? colors.primary : colors.surface,
                  borderColor: periode === p ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handlePeriodeChange(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color: periode === p ? '#fff' : colors.text,
                    fontWeight: periode === p ? FONT_WEIGHTS.bold : FONT_WEIGHTS.medium,
                  },
                ]}
              >
                {p === 'tout' ? 'Tout' : p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    position: 'relative',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
  },
  periodSelector: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  periodLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});

