/**
 * Barre de recherche pour le Marketplace
 * Avec filtres rapides et tri
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import type { MarketplaceSortOption } from '../../types/marketplace';

interface MarketplaceSearchBarProps {
  onSearch: (query: string) => void;
  onFilterPress: () => void;
  onSortChange: (sort: MarketplaceSortOption) => void;
  currentSort: MarketplaceSortOption;
  filterCount?: number;
}

export default function MarketplaceSearchBar({
  onSearch,
  onFilterPress,
  onSortChange,
  currentSort,
  filterCount = 0,
}: MarketplaceSearchBarProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const sortOptions: Array<{ value: MarketplaceSortOption; label: string; icon: string }> = [
    { value: 'distance', label: 'Distance', icon: 'location' },
    { value: 'price_asc', label: 'Prix croissant', icon: 'arrow-up' },
    { value: 'price_desc', label: 'Prix décroissant', icon: 'arrow-down' },
    { value: 'recent', label: 'Plus récent', icon: 'time' },
    { value: 'rating', label: 'Mieux notés', icon: 'star' },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === currentSort)?.label || 'Tri';

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher une ferme, une race..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Boutons de contrôle */}
      <View style={styles.controlsRow}>
        {/* Bouton Filtres */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            filterCount > 0 && { borderColor: colors.primary },
          ]}
          onPress={onFilterPress}
        >
          <Ionicons
            name="filter"
            size={18}
            color={filterCount > 0 ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.controlButtonText,
              { color: filterCount > 0 ? colors.primary : colors.text },
            ]}
          >
            Filtres
          </Text>
          {filterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.filterBadgeText, { color: colors.textInverse }]}>
                {filterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Bouton Tri */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setSortMenuVisible(!sortMenuVisible)}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.textSecondary} />
          <Text style={[styles.controlButtonText, { color: colors.text }]}>
            {currentSortLabel}
          </Text>
          <Ionicons
            name={sortMenuVisible ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Menu de tri (dropdown) */}
      {sortMenuVisible && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface }]}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                currentSort === option.value && { backgroundColor: colors.surfaceLight },
              ]}
              onPress={() => {
                onSortChange(option.value);
                setSortMenuVisible(false);
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={18}
                color={currentSort === option.value ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  {
                    color: currentSort === option.value ? colors.primary : colors.text,
                    fontWeight:
                      currentSort === option.value
                        ? typography.fontWeights.semibold
                        : typography.fontWeights.regular,
                  },
                ]}
              >
                {option.label}
              </Text>
              {currentSort === option.value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    backgroundColor: MarketplaceTheme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
    gap: MarketplaceTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontFamily: MarketplaceTheme.typography.fontFamily,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    gap: MarketplaceTheme.spacing.xs,
  },
  controlButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  sortMenu: {
    marginTop: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.medium,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    gap: MarketplaceTheme.spacing.sm,
  },
  sortOptionText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
});

