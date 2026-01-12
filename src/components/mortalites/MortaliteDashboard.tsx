/**
 * Composant Dashboard pour les statistiques globales des mortalités
 * Design cohérent avec PeseeDashboard
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format, subDays, subMonths, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import { useAppSelector } from '../../store/hooks';
import { selectAllMortalites, selectStatistiquesMortalite } from '../../store/selectors/mortalitesSelectors';

interface MortaliteDashboardProps {
  projetId: string | undefined;
  periode?: '7j' | '30j' | '90j' | 'tout';
  onPeriodeChange?: (periode: '7j' | '30j' | '90j' | 'tout') => void;
  totalAnimaux?: number; // Nombre total d'animaux pour calculer le taux
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

export default function MortaliteDashboard({
  projetId,
  periode: periodeProp = '30j',
  onPeriodeChange,
  totalAnimaux = 0,
}: MortaliteDashboardProps) {
  const { colors } = useTheme();
  const [periodeLocal, setPeriodeLocal] = useState<'7j' | '30j' | '90j' | 'tout'>(periodeProp);
  
  const mortalites = useAppSelector(selectAllMortalites);
  const statistiques = useAppSelector(selectStatistiquesMortalite);

  const periode = periodeProp || periodeLocal;

  const handlePeriodeChange = (newPeriode: '7j' | '30j' | '90j' | 'tout') => {
    setPeriodeLocal(newPeriode);
    onPeriodeChange?.(newPeriode);
  };

  if (!projetId) {
    return null;
  }

  // Calculer les mortalités filtrées par période
  const getDateLimit = () => {
    const now = new Date();
    switch (periode) {
      case '7j':
        return subDays(now, 7);
      case '30j':
        return subDays(now, 30);
      case '90j':
        return subMonths(now, 3);
      default:
        return null;
    }
  };

  const dateLimit = getDateLimit();
  const mortalitesFiltrees = mortalites.filter((m) => {
    if (m.projet_id !== projetId) return false;
    if (!dateLimit) return true;
    try {
      const dateMortalite = parseISO(m.date_mortalite);
      return isAfter(dateMortalite, dateLimit);
    } catch {
      return true;
    }
  });

  // Statistiques calculées
  const totalMortalites = mortalitesFiltrees.length;
  const tauxMortalite = totalAnimaux > 0 
    ? ((totalMortalites / (totalAnimaux + totalMortalites)) * 100).toFixed(1) 
    : '0.0';

  // Grouper par catégorie
  const parCategorie: Record<string, number> = {};
  mortalitesFiltrees.forEach((m) => {
    const cat = m.categorie || 'Autre';
    parCategorie[cat] = (parCategorie[cat] || 0) + 1;
  });

  // Catégorie la plus fréquente
  const categoriePrincipale = Object.entries(parCategorie)
    .sort(([, a], [, b]) => b - a)[0];

  // Dernière mortalité
  const derniereMortalite = mortalitesFiltrees
    .sort((a, b) => {
      try {
        return new Date(b.date_mortalite).getTime() - new Date(a.date_mortalite).getTime();
      } catch {
        return 0;
      }
    })[0];

  const derniereMortaliteText = derniereMortalite?.date_mortalite
    ? (() => {
        try {
          return formatDistanceToNow(new Date(derniereMortalite.date_mortalite), {
            addSuffix: true,
            locale: fr,
          });
        } catch {
          return format(new Date(derniereMortalite.date_mortalite), 'dd/MM/yyyy', { locale: fr });
        }
      })()
    : 'Aucune';

  // Nombre de mortalités cette semaine vs semaine précédente
  const uneSemaineAvant = subDays(new Date(), 7);
  const deuxSemainesAvant = subDays(new Date(), 14);
  const mortalitesSemaineCourante = mortalitesFiltrees.filter((m) => {
    try {
      return isAfter(parseISO(m.date_mortalite), uneSemaineAvant);
    } catch {
      return false;
    }
  }).length;

  const mortalitesSemainePrecedente = mortalitesFiltrees.filter((m) => {
    try {
      const date = parseISO(m.date_mortalite);
      return isAfter(date, deuxSemainesAvant) && !isAfter(date, uneSemaineAvant);
    } catch {
      return false;
    }
  }).length;

  const tendance = mortalitesSemaineCourante > mortalitesSemainePrecedente 
    ? 'hausse' 
    : mortalitesSemaineCourante < mortalitesSemainePrecedente 
      ? 'baisse' 
      : 'stable';

  return (
    <Card elevation="medium" padding="large" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color={colors.error} />
        <Text style={[styles.title, { color: colors.text }]}>
          📊 Suivi des Mortalités
        </Text>
      </View>

      {/* Grille de statistiques */}
      <View style={styles.statsGrid}>
        <StatBox
          label="Total décès"
          value={totalMortalites.toString()}
          icon="skull-outline"
          color={colors.error}
          showBadge={totalMortalites > 0}
        />

        <StatBox
          label="Taux de mortalité"
          value={`${tauxMortalite}%`}
          icon="pulse-outline"
          color={parseFloat(tauxMortalite) > 5 ? colors.error : colors.warning}
        />

        <StatBox
          label="Dernière mortalité"
          value={derniereMortaliteText}
          icon="time"
          color={colors.info || colors.primary}
        />

        <StatBox
          label="Cette semaine"
          value={mortalitesSemaineCourante.toString()}
          icon={tendance === 'hausse' ? 'trending-up' : tendance === 'baisse' ? 'trending-down' : 'remove-outline'}
          color={tendance === 'hausse' ? colors.error : tendance === 'baisse' ? colors.success : colors.textSecondary}
        />

        <StatBox
          label="Cause principale"
          value={categoriePrincipale ? `${categoriePrincipale[0]}` : 'N/A'}
          icon="medical"
          color={colors.primary}
        />

        <StatBox
          label="Catégories"
          value={Object.keys(parCategorie).length.toString()}
          icon="list"
          color={colors.secondary || colors.primary}
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
});
