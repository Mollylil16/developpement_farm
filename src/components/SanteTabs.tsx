/**
 * SanteTabs - Onglets de navigation de l'écran Santé
 * 
 * Permet de naviguer entre les différents modules sanitaires
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeIconName } from '../utils/iconValidation';
import { OngletType } from '../hooks/useSanteLogic';

interface Onglet {
  id: OngletType;
  label: string;
  icon: string;
  badge: number;
}

interface SanteTabsProps {
  onglets: Onglet[];
  ongletActif: OngletType;
  onTabChange: (onglet: OngletType) => void;
}

export default function SanteTabs({ onglets, ongletActif, onTabChange }: SanteTabsProps) {
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
              {onglet.badge > 0 && (
                <View style={[styles.ongletBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.ongletBadgeText}>{onglet.badge}</Text>
                </View>
              )}
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
  ongletBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ongletBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

