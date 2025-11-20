/**
 * StandardTabs - Composant onglets standardisé
 * Style cohérent avec Planning Production
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES } from '../constants/theme';

export interface TabItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface StandardTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function StandardTabs({ tabs, activeTab, onTabChange }: StandardTabsProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.ongletsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ongletsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.onglet,
              activeTab === tab.id && {
                backgroundColor: colors.primary + '20',
                borderBottomColor: colors.primary,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.ongletLabel,
                {
                  color: activeTab === tab.id ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab.id ? '600' : '400',
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.description && (
              <Text style={[styles.ongletDescription, { color: colors.textSecondary }]}>
                {tab.description}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ongletsContainer: {
    borderBottomWidth: 1,
  },
  ongletsContent: {
    paddingHorizontal: SPACING.xs,
  },
  onglet: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    gap: 4,
    minWidth: 120,
  },
  ongletLabel: {
    fontSize: FONT_SIZES.sm,
  },
  ongletDescription: {
    fontSize: FONT_SIZES.xs,
  },
});

