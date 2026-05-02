/**
 * AnimalEnRetardItem - Composant réutilisable pour afficher un animal en retard
 * Utilisé dans le calendrier de vaccination (mode individuel et mode bande)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import { ProductionAnimal } from '../../types/production';
import { Vaccination, CalendrierTypeAge } from '../../types/sante';

interface AnimalCalendrier {
  animal: ProductionAnimal;
  nom: string;
  categorie: string;
  ageJours: number;
  prochainTraitement?: CalendrierTypeAge;
  dernierTraitement?: Vaccination;
  enRetard: boolean;
}

interface AnimalEnRetardItemProps {
  item: AnimalCalendrier;
  couleur: string;
  showVaccinerButton?: boolean;
  onVacciner?: (animalId: string) => void;
}

export default function AnimalEnRetardItem({
  item,
  couleur,
  showVaccinerButton = false,
  onVacciner,
}: AnimalEnRetardItemProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderLeftColor: item.enRetard ? colors.error : couleur,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nom, { color: colors.text }]}>{item.nom}</Text>
          <Text style={[styles.details, { color: colors.textSecondary }]}>
            {item.categorie} • {item.ageJours}j
          </Text>
        </View>
        {item.enRetard && (
          <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeRetardTexte}>En retard</Text>
          </View>
        )}
      </View>

      {item.dernierTraitement && (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.texte, { color: colors.textSecondary }]}>
            Dernier :{' '}
            {new Date(item.dernierTraitement.date_vaccination).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      )}

      {item.prochainTraitement && (
        <View style={styles.row}>
          <Ionicons
            name="alarm"
            size={14}
            color={item.enRetard ? colors.error : couleur}
          />
          <Text style={[styles.texte, { color: colors.textSecondary }]}>
            {item.prochainTraitement.nom_traitement} ({item.prochainTraitement.age_display})
          </Text>
        </View>
      )}

      {showVaccinerButton && onVacciner && (
        <TouchableOpacity
          style={[styles.boutonVacciner, { backgroundColor: couleur }]}
          onPress={() => onVacciner(item.animal.id)}
        >
          <Ionicons name="medical" size={16} color="#FFF" />
          <Text style={styles.boutonVaccinerTexte}>Vacciner maintenant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  nom: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  details: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  badgeRetard: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRetardTexte: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs / 2,
  },
  texte: {
    fontSize: FONT_SIZES.xs,
    marginLeft: 6,
  },
  boutonVacciner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  boutonVaccinerTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
});

