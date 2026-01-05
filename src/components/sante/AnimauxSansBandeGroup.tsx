/**
 * AnimauxSansBandeGroup - Composant pour afficher les animaux en retard sans bande
 * Utilisé dans le calendrier de vaccination en mode bande
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
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

interface AnimauxSansBandeGroupProps {
  animaux: AnimalCalendrier[];
  type: TypeProphylaxie;
  couleur: string;
  onVaccinerAnimal: (animalId: string) => void;
}

export default function AnimauxSansBandeGroup({
  animaux,
  type,
  couleur,
  onVaccinerAnimal,
}: AnimauxSansBandeGroupProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (animaux.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderLeftColor: colors.warning,
          ...colors.shadow.small,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="warning" size={20} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.nomGroupe, { color: colors.text }]}>Sans bande</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {animaux.length} sujet{animaux.length > 1 ? 's' : ''} en retard
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.animauxContainer}>
          {animaux.map((item) => (
            <AnimalEnRetardItem
              key={item.animal.id}
              item={item}
              couleur={couleur}
              showVaccinerButton={true}
              onVacciner={onVaccinerAnimal}
            />
          ))}
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
  nomGroupe: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  meta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  animauxContainer: {
    marginTop: SPACING.sm,
    paddingLeft: SPACING.md,
    gap: SPACING.xs,
  },
});

