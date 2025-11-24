/**
 * FinanceTabs - Onglets de navigation de l'écran Finance
 * 
 * Permet de naviguer entre les différents modules financiers
 * Style harmonisé avec le menu Santé
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeIconName } from '../utils/iconValidation';

export type FinanceOngletType = 'vue_ensemble' | 'charges_fixes' | 'depenses' | 'revenus' | 'bilan';

interface FinanceOnglet {
  id: FinanceOngletType;
  label: string;
  icon: string;
}

interface FinanceTabsProps {
  onglets: FinanceOnglet[];
  ongletActif: FinanceOngletType;
  onTabChange: (onglet: FinanceOngletType) => void;
}

export default function FinanceTabs({ onglets, ongletActif, onTabChange }: FinanceTabsProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.ongletsContainer, { backgroundColor: colors.surface }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ongletsContent}
      >
        {onglets.map((onglet) => (
          <TouchableOpacity
            key={onglet.id}
            style={[
              styles.onglet,
              ongletActif === onglet.id && {
                backgroundColor: colors.primary + '20',
                borderBottomColor: colors.primary,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => onTabChange(onglet.id)}
          >
            <View style={styles.ongletIconContainer}>
              <Ionicons
                name={normalizeIconName(onglet.icon, 'help-circle-outline')}
                size={24}
                color={ongletActif === onglet.id ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.ongletLabel,
                {
                  color: ongletActif === onglet.id ? colors.primary : colors.textSecondary,
                  fontWeight: ongletActif === onglet.id ? '600' : '400',
                },
              ]}
            >
              {onglet.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ongletsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  ongletsContent: {
    paddingHorizontal: 8,
  },
  onglet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  ongletIconContainer: {
    position: 'relative',
  },
  ongletLabel: {
    fontSize: 12,
  },
});

