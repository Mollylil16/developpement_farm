/**
 * Carte de Sujet pour le Marketplace
 * Affiche les informations d'un sujet (animal) disponible à la vente
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SubjectCard as SubjectCardType } from '../../types/marketplace';
import { MarketplaceTheme, glassmorphismStyle, badgeStyle } from '../../styles/marketplace.theme';
import { formatPrice } from '../../services/PricingService';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('SubjectCard');

// Créer le composant animé une seule fois en dehors du composant
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface SubjectCardProps {
  subject: SubjectCardType;
  onPress: () => void;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
}

function SubjectCard({
  subject,
  onPress,
  selected = false,
  selectable = false,
  onSelect,
}: SubjectCardProps) {
  const { colors, spacing, typography, borderRadius, animations } = MarketplaceTheme;

  // Animations glassmorphism (fade in + slide up)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animations.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animations.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Couleur du statut de santé
  const getHealthColor = (status: 'good' | 'attention' | 'critical') => {
    switch (status) {
      case 'good':
        return colors.success;
      case 'attention':
        return colors.warning;
      case 'critical':
        return colors.error;
    }
  };

  // Icône du statut de santé
  const getHealthIcon = (status: 'good' | 'attention' | 'critical') => {
    switch (status) {
      case 'good':
        return 'checkmark-circle';
      case 'attention':
        return 'alert-circle';
      case 'critical':
        return 'close-circle';
    }
  };

  const handlePress = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectCard.tsx:73',message:'handlePress appelé',data:{subjectId:subject.id,subjectCode:subject.code,available:subject.available,selectable},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (selectable && onSelect) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectCard.tsx:75',message:'Mode sélection activé',data:{subjectId:subject.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      onSelect();
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectCard.tsx:77',message:'Appel onPress',data:{subjectId:subject.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      onPress();
    }
  };

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectCard.tsx:81',message:'SubjectCard rendu',data:{subjectId:subject.id,available:subject.available,onPressDefined:!!onPress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }, [subject.id, subject.available, onPress]);
  // #endregion

  return (
    <AnimatedTouchable
      style={[
        styles.container,
        glassmorphismStyle(false),
        selected && { borderColor: colors.primary, borderWidth: 2.5 },
        !subject.available && !selected && { opacity: 0.6 },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={!subject.available}
      // #region agent log
      onPressIn={() => {
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectCard.tsx:90',message:'onPressIn déclenché',data:{subjectId:subject.id,available:subject.available,disabled:!subject.available},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }}
      // #endregion
    >
        {/* Checkbox pour sélection multiple */}
        {selectable && (
          <View style={styles.checkboxContainer}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              {selected && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.code, { color: colors.text }]}>#{subject.code}</Text>
            <Text style={[styles.race, { color: colors.textSecondary }]}>{subject.race}</Text>
          </View>

          {/* Badge de disponibilité */}
          {!subject.available && (
            <View style={[badgeStyle('sold')]}>
              <Text style={[styles.badgeText, { color: colors.badgeSold }]}>Réservé</Text>
            </View>
          )}
        </View>

        {/* Stats principales */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={18} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{subject.weight} kg</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Âge</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{subject.age} mois</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons
              name={getHealthIcon(subject.healthStatus)}
              size={18}
              color={getHealthColor(subject.healthStatus)}
            />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Santé</Text>
            <Text style={[styles.statValue, { color: getHealthColor(subject.healthStatus) }]}>
              {subject.healthStatus === 'good'
                ? 'Bon'
                : subject.healthStatus === 'attention'
                  ? 'Attention'
                  : 'Critique'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Prix et vaccinations */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Prix total</Text>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {formatPrice(subject.totalPrice)}
            </Text>
            <Text style={[styles.pricePerKg, { color: colors.textSecondary }]}>
              {subject.pricePerKg ? subject.pricePerKg.toLocaleString('fr-FR') : '0'} FCFA/kg
            </Text>
          </View>

          <View style={styles.vaccinationBadge}>
            <Ionicons
              name={subject.vaccinations ? 'shield-checkmark' : 'shield-outline'}
              size={16}
              color={subject.vaccinations ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.vaccinationText,
                { color: subject.vaccinations ? colors.success : colors.textSecondary },
              ]}
            >
              {subject.vaccinations ? 'Vaccins à jour' : 'Vaccins incomplets'}
            </Text>
          </View>
        </View>
      </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: MarketplaceTheme.spacing.md,
    marginHorizontal: MarketplaceTheme.spacing.md,
    marginVertical: MarketplaceTheme.spacing.sm,
    position: 'relative',
  },
  checkboxContainer: {
    position: 'absolute',
    top: MarketplaceTheme.spacing.sm,
    right: MarketplaceTheme.spacing.sm,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MarketplaceTheme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  code: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 2,
  },
  race: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  badgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  statValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 2,
  },
  pricePerKg: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  vaccinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    backgroundColor: MarketplaceTheme.colors.surfaceLight,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  vaccinationText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles dans les FlatList
export default React.memo(SubjectCard);
