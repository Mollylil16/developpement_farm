/**
 * Header du cheptel avec filtres et recherche
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import Button from '../Button';

interface CheptelHeaderProps {
  totalCount: number;
  countByCategory: { truies: number; verrats: number; porcelets: number };
  filterCategorie: 'tous' | 'truie' | 'verrat' | 'porcelet';
  searchQuery: string;
  historiqueCount: number;
  onFilterChange: (categorie: 'tous' | 'truie' | 'verrat' | 'porcelet') => void;
  onSearchChange: (query: string) => void;
  onNavigateToHistorique: () => void;
  onAddAnimal: () => void;
  canCreate: boolean;
}

export default function CheptelHeader({
  totalCount,
  countByCategory,
  filterCategorie,
  searchQuery,
  historiqueCount,
  onFilterChange,
  onSearchChange,
  onNavigateToHistorique,
  onAddAnimal,
  canCreate,
}: CheptelHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: colors.text }]}>Cheptel</Text>
        <View style={styles.headerButtons}>
          {historiqueCount > 0 && (
            <TouchableOpacity
              style={[styles.historiqueButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}
              onPress={onNavigateToHistorique}
            >
              <Text style={[styles.historiqueButtonText, { color: colors.secondary }]}>
                Historique ({historiqueCount})
              </Text>
            </TouchableOpacity>
          )}
          {canCreate && <Button title="+ Animal" onPress={onAddAnimal} size="small" />}
        </View>
      </View>
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {totalCount} animal{totalCount > 1 ? 'aux' : ''} actif{totalCount > 1 ? 's' : ''}
        </Text>
        {filterCategorie === 'tous' && (
          <View style={styles.summaryDetails}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {countByCategory.truies} truie{countByCategory.truies > 1 ? 's' : ''} • {countByCategory.verrats} verrat
              {countByCategory.verrats > 1 ? 's' : ''} • {countByCategory.porcelets} porcelet
              {countByCategory.porcelets > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par numéro ou nom..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres par catégorie */}
      <View style={styles.filters}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filtrer par catégorie:</Text>
        <View style={styles.filterButtons}>
          {(['tous', 'truie', 'verrat', 'porcelet'] as const).map((categorie) => (
            <TouchableOpacity
              key={categorie}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterCategorie === categorie ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => onFilterChange(categorie)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterCategorie === categorie ? colors.textOnPrimary : colors.text,
                  },
                ]}
              >
                {categorie === 'tous'
                  ? 'Tous'
                  : categorie === 'truie'
                    ? 'Truies'
                    : categorie === 'verrat'
                      ? 'Verrats'
                      : 'Porcelets'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  historiqueButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  historiqueButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'column',
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  summaryDetails: {
    marginTop: SPACING.xs,
  },
  filters: {
    marginTop: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});

