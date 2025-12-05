/**
 * Widget Passage Porcelets → Croissance
 * Affiche le nombre de porcs qui sont passés de porcelet à croissance
 */

import React, { useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux } from '../../store/slices/productionSlice';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { SafeTextWrapper } from '../../utils/textRenderingGuard';

interface TransitionPorceletCroissanceWidgetProps {
  onPress?: () => void;
}

function TransitionPorceletCroissanceWidget({
  onPress,
}: TransitionPorceletCroissanceWidgetProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);

  // Utiliser useRef pour éviter les chargements multiples
  const dataChargeesRef = React.useRef<string | null>(null);

  // Charger les animaux du cheptel (une seule fois par projet)
  useEffect(() => {
    if (!projetActif) {
      dataChargeesRef.current = null;
      return;
    }

    if (dataChargeesRef.current === projetActif.id) return; // Déjà chargé !

    dataChargeesRef.current = projetActif.id;
    dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
  }, [dispatch, projetActif?.id]);

  const animauxLength = animaux.length;

  const countTransition = useMemo(() => {
    if (!projetActif) return 0;

    // Filtrer les animaux actifs du projet et non reproducteurs
    const animauxActifs = animaux.filter(
      (animal) =>
        animal.projet_id === projetActif.id &&
        animal.statut?.toLowerCase() === 'actif' &&
        !animal.reproducteur
    );

    // Compter les animaux en croissance qui étaient initialement des porcelets
    // On considère qu'un animal en croissance qui a un code commençant par "P" était un porcelet
    // ou qu'un animal avec categorie_poids='croissance' était initialement porcelet
    const transitions = animauxActifs.filter((animal) => {
      const isCroissance = animal.categorie_poids === 'croissance';
      const codeStartsWithP = animal.code.toUpperCase().startsWith('P');
      // Si l'animal est en croissance mais son code commence par "P", c'est une transition
      // Ou si l'animal est en croissance (peut avoir été créé directement en croissance)
      return isCroissance && codeStartsWithP;
    });

    return transitions.length;
  }, [projetActif?.id, animauxLength, animaux]);

  if (!projetActif) {
    return null;
  }

  const WidgetContent = (
    <SafeTextWrapper componentName="TransitionPorceletCroissanceWidget">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📈</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Passage porcelets → croissance
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.statContainer}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{countTransition}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {countTransition === 1 ? 'porc' : 'porcs'} passé{countTransition > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </SafeTextWrapper>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Card elevation="medium" padding="large" neomorphism={true}>
          {WidgetContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card elevation="medium" padding="large" neomorphism={true}>
      {WidgetContent}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  divider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  statContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'center',
  },
});

export default memo(TransitionPorceletCroissanceWidget);

