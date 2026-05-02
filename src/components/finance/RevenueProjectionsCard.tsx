/**
 * Carte regroupant toutes les projections de revenus
 * - Configuration des prix
 * - Revenus prévisionnels (VIF et Carcasse)
 * - Comparaison des options
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import PriceConfigCard from './PriceConfigCard';
import ProjectedRevenueCard from './ProjectedRevenueCard';
import ComparisonCard from './ComparisonCard';

type SectionType = 'config' | 'vif' | 'carcasse' | 'comparaison';

interface RevenueProjectionsCardProps {
  onPriceUpdate?: () => void;
}

export default function RevenueProjectionsCard({ onPriceUpdate }: RevenueProjectionsCardProps) {
  const { colors } = useTheme();
  const [activeSection, setActiveSection] = useState<SectionType>('config');

  const sections = [
    { id: 'config' as SectionType, label: 'Config. Prix', icon: '⚙️' },
    { id: 'vif' as SectionType, label: 'VIF', icon: '🐷' },
    { id: 'carcasse' as SectionType, label: 'Carcasse', icon: '🥩' },
    { id: 'comparaison' as SectionType, label: 'Comparaison', icon: '⚖️' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'config':
        return <PriceConfigCard onPriceUpdate={onPriceUpdate} />;
      case 'vif':
        return <ProjectedRevenueCard type="vif" />;
      case 'carcasse':
        return <ProjectedRevenueCard type="carcasse" />;
      case 'comparaison':
        return <ComparisonCard />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header avec titre */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>💰 Projections de Revenus</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Configuration et prévisions
        </Text>
      </View>

      {/* Tabs de navigation */}
      <View style={styles.tabsContainer}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.tab,
              {
                backgroundColor:
                  activeSection === section.id ? colors.primary + '15' : 'transparent',
                borderBottomWidth: activeSection === section.id ? 2 : 0,
                borderBottomColor: colors.primary,
              },
            ]}
            onPress={() => setActiveSection(section.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{section.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeSection === section.id ? colors.primary : colors.textSecondary,
                  fontWeight: activeSection === section.id ? '600' : '400',
                },
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
    marginBottom: SPACING.xs / 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: SPACING.xs / 2,
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  content: {
    // Le contenu est rendu sans padding car les composants enfants ont déjà leur propre padding
  },
});
