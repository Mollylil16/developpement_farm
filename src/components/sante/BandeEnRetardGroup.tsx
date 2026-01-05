/**
 * BandeEnRetardGroup - Composant pour afficher une bande avec animaux en retard
 * Utilisé dans le calendrier de vaccination en mode bande
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import { Batch } from '../../types/batch';
import { TypeProphylaxie, CalendrierTypeAge, Vaccination } from '../../types/sante';
import { ProductionAnimal } from '../../types/production';
import AnimalEnRetardItem from './AnimalEnRetardItem';

interface AnimalCalendrier {
  animal: ProductionAnimal;
  nom: string;
  categorie: string;
  ageJours: number;
  prochainTraitement?: CalendrierTypeAge;
  dernierTraitement?: Vaccination;
  enRetard: boolean;
}

interface BandeEnRetardGroupProps {
  bandeData: {
    batchId: string;
    batch: Batch | null;
    animaux: AnimalCalendrier[];
    nombreEnRetard: number;
  };
  type: TypeProphylaxie;
  couleur: string;
  onVaccinerBande: (batchId: string, animauxIds: string[]) => void;
}

export default function BandeEnRetardGroup({
  bandeData,
  type,
  couleur,
  onVaccinerBande,
}: BandeEnRetardGroupProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const animauxIds = bandeData.animaux.map((a) => a.animal.id);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderLeftColor: colors.error,
          ...colors.shadow.small,
        },
      ]}
    >
      {/* Header de la bande */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="home" size={20} color={couleur} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.nomBande, { color: colors.text }]}>
              {bandeData.batch?.pen_name || `Bande ${bandeData.batchId.slice(0, 6)}`}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {bandeData.nombreEnRetard} sujet{bandeData.nombreEnRetard > 1 ? 's' : ''} en retard
              {bandeData.batch && ` • ${bandeData.batch.total_count} sujet(s) total`}
            </Text>
          </View>
        </View>

        <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeRetardTexte}>{bandeData.nombreEnRetard}</Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Liste des animaux (expandable) */}
      {expanded && (
        <View style={styles.animauxContainer}>
          {bandeData.animaux.map((item) => (
            <AnimalEnRetardItem
              key={item.animal.id}
              item={item}
              couleur={couleur}
              showVaccinerButton={false}
            />
          ))}

          {/* Bouton vacciner toute la bande */}
          <TouchableOpacity
            style={[styles.boutonVaccinerBande, { backgroundColor: couleur }]}
            onPress={() => onVaccinerBande(bandeData.batchId, animauxIds)}
          >
            <Ionicons name="medical" size={16} color="#FFF" />
            <Text style={styles.boutonVaccinerBandeTexte}>
              Vacciner cette bande ({bandeData.nombreEnRetard})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nomBande: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  meta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  badgeRetard: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  badgeRetardTexte: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  animauxContainer: {
    marginTop: SPACING.sm,
    paddingLeft: SPACING.md,
    gap: SPACING.xs,
  },
  boutonVaccinerBande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  boutonVaccinerBandeTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
});

