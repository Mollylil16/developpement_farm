/**
 * Composant de recherche globale dans tous les modules
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useAppSelector } from '../store/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { format, parseISO } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'global_search_history';
const MAX_HISTORY_ITEMS = 10;

export type SearchResult = {
  id: string;
  type: 'animal' | 'gestation' | 'stock' | 'ingredient' | 'ration' | 'depense' | 'charge_fixe' | 'planification' | 'collaborateur' | 'mortalite';
  title: string;
  subtitle?: string;
  data: any;
  screen: string;
};

interface GlobalSearchComponentProps {
  onResultPress?: (result: SearchResult) => void;
  onClose?: () => void;
}

export default function GlobalSearchComponent({
  onResultPress,
  onClose,
}: GlobalSearchComponentProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Récupérer toutes les données depuis Redux
  const { animaux, peseesRecents } = useAppSelector((state) => state.production);
  const { gestations, sevrages } = useAppSelector((state) => state.reproduction);
  const { stocks } = useAppSelector((state) => state.stocks);
  const { ingredients, rations } = useAppSelector((state) => state.nutrition);
  const { depensesPonctuelles, chargesFixes } = useAppSelector((state) => state.finance);
  const { planifications } = useAppSelector((state) => state.planification);
  const { collaborateurs } = useAppSelector((state) => state.collaboration);
  const { mortalites } = useAppSelector((state) => state.mortalites);

  // Charger l'historique de recherche
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      }
    };
    loadHistory();
  }, []);

  // Fonction de recherche
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Recherche dans les animaux de production
    animaux.forEach((animal) => {
      // Trouver la dernière pesée pour cet animal
      const dernierePesee = peseesRecents.find((p) => p.animal_id === animal.id);
      const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || null;
      
      const matches =
        animal.code?.toLowerCase().includes(q) ||
        animal.nom?.toLowerCase().includes(q) ||
        animal.origine?.toLowerCase().includes(q);
      if (matches) {
        results.push({
          id: animal.id,
          type: 'animal',
          title: `${animal.code || 'N/A'} - ${animal.nom || 'Sans nom'}`,
          subtitle: `Origine: ${animal.origine || 'N/A'} | Poids: ${poidsActuel ? poidsActuel.toFixed(1) + ' kg' : 'N/A'}`,
          data: animal,
          screen: 'Production',
        });
      }
    });

    // Recherche dans les gestations
    gestations.forEach((gestation) => {
      const matches =
        gestation.truie_nom?.toLowerCase().includes(q) ||
        gestation.truie_id?.toLowerCase().includes(q);
      if (matches) {
        const dateMiseBas = gestation.date_mise_bas_prevue
          ? format(parseISO(gestation.date_mise_bas_prevue), 'dd/MM/yyyy')
          : 'N/A';
        results.push({
          id: gestation.id,
          type: 'gestation',
          title: `Gestation - ${gestation.truie_nom || 'Truie N/A'}`,
          subtitle: `Mise bas prévue: ${dateMiseBas}`,
          data: gestation,
          screen: 'Reproduction',
        });
      }
    });

    // Recherche dans les stocks
    stocks.forEach((stock) => {
      const matches = stock.nom?.toLowerCase().includes(q) || stock.categorie?.toLowerCase().includes(q);
      if (matches) {
        results.push({
          id: stock.id,
          type: 'stock',
          title: stock.nom || 'Stock sans nom',
          subtitle: `Catégorie: ${stock.categorie || 'N/A'} | Stock: ${stock.quantite_actuelle || 0} ${stock.unite || ''}`,
          data: stock,
          screen: 'Nutrition',
        });
      }
    });

    // Recherche dans les ingrédients
    ingredients.forEach((ingredient) => {
      const matches = ingredient.nom?.toLowerCase().includes(q);
      if (matches) {
        results.push({
          id: ingredient.id,
          type: 'ingredient',
          title: ingredient.nom || 'Ingrédient sans nom',
          subtitle: `Prix: ${ingredient.prix_unitaire || 0} XOF/${ingredient.unite || ''}${ingredient.proteine_pourcent ? ` | Protéines: ${ingredient.proteine_pourcent}%` : ''}`,
          data: ingredient,
          screen: 'Nutrition',
        });
      }
    });

    // Recherche dans les rations
    rations.forEach((ration) => {
      const matches = ration.type_porc?.toLowerCase().includes(q);
      if (matches) {
        const dateCreation = ration.date_creation
          ? format(parseISO(ration.date_creation), 'dd/MM/yyyy')
          : 'N/A';
        results.push({
          id: ration.id,
          type: 'ration',
          title: `Ration - ${ration.type_porc || 'N/A'}`,
          subtitle: `Créée le: ${dateCreation} | Poids: ${ration.poids_kg || 0} kg`,
          data: ration,
          screen: 'Nutrition',
        });
      }
    });

    // Recherche dans les dépenses ponctuelles
    depensesPonctuelles.forEach((depense) => {
      const matches =
        depense.libelle_categorie?.toLowerCase().includes(q) ||
        depense.categorie?.toLowerCase().includes(q) ||
        depense.montant?.toString().includes(q) ||
        depense.commentaire?.toLowerCase().includes(q);
      if (matches) {
        const dateDepense = depense.date ? format(parseISO(depense.date), 'dd/MM/yyyy') : 'N/A';
        results.push({
          id: depense.id,
          type: 'depense',
          title: depense.libelle_categorie || depense.categorie || 'Dépense sans nom',
          subtitle: `${depense.categorie || 'N/A'} | ${depense.montant || 0} XOF | ${dateDepense}`,
          data: depense,
          screen: 'Finance',
        });
      }
    });

    // Recherche dans les charges fixes
    chargesFixes.forEach((charge) => {
      const matches =
        charge.libelle?.toLowerCase().includes(q) ||
        charge.categorie?.toLowerCase().includes(q) ||
        charge.montant?.toString().includes(q);
      if (matches) {
        results.push({
          id: charge.id,
          type: 'charge_fixe',
          title: charge.libelle || 'Charge fixe sans nom',
          subtitle: `${charge.categorie || 'N/A'} | ${charge.montant || 0} XOF/${charge.frequence || 'N/A'}`,
          data: charge,
          screen: 'Finance',
        });
      }
    });

    // Recherche dans les planifications
    planifications.forEach((planification) => {
      const matches =
        planification.titre?.toLowerCase().includes(q) ||
        planification.type?.toLowerCase().includes(q) ||
        planification.description?.toLowerCase().includes(q);
      if (matches) {
        const datePrevue = planification.date_prevue
          ? format(parseISO(planification.date_prevue), 'dd/MM/yyyy')
          : 'N/A';
        results.push({
          id: planification.id,
          type: 'planification',
          title: planification.titre || 'Tâche sans titre',
          subtitle: `${planification.type || 'N/A'} | ${datePrevue} | ${planification.statut || 'N/A'}`,
          data: planification,
          screen: 'Planification',
        });
      }
    });

    // Recherche dans les collaborateurs
    collaborateurs.forEach((collaborateur) => {
      const matches =
        collaborateur.nom?.toLowerCase().includes(q) ||
        collaborateur.email?.toLowerCase().includes(q) ||
        collaborateur.telephone?.includes(q) ||
        collaborateur.role?.toLowerCase().includes(q);
      if (matches) {
        results.push({
          id: collaborateur.id,
          type: 'collaborateur',
          title: `${collaborateur.nom || 'N/A'} ${collaborateur.prenom || ''}`,
          subtitle: `${collaborateur.role || 'N/A'} | ${collaborateur.email || 'N/A'}`,
          data: collaborateur,
          screen: 'Collaboration',
        });
      }
    });

    // Recherche dans les mortalités
    mortalites.forEach((mortalite) => {
      const matches =
        mortalite.cause?.toLowerCase().includes(q) ||
        mortalite.categorie?.toLowerCase().includes(q) ||
        mortalite.notes?.toLowerCase().includes(q);
      if (matches) {
        const dateMortalite = mortalite.date
          ? format(parseISO(mortalite.date), 'dd/MM/yyyy')
          : 'N/A';
        results.push({
          id: mortalite.id,
          type: 'mortalite',
          title: `Mortalité - ${mortalite.categorie || 'N/A'}`,
          subtitle: `${mortalite.cause || 'N/A'} | ${mortalite.nombre_porcs || 0} animal(s) | ${dateMortalite}`,
          data: mortalite,
          screen: 'Mortalites',
        });
      }
    });

    return results;
  }, [
    query,
    animaux,
    peseesRecents,
    gestations,
    stocks,
    ingredients,
    rations,
    depensesPonctuelles,
    chargesFixes,
    planifications,
    collaborateurs,
    mortalites,
  ]);

  // Sauvegarder dans l'historique
  const saveToHistory = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const updatedHistory = [
        searchQuery,
        ...searchHistory.filter((item) => item !== searchQuery),
      ].slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  };

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const handleResultPress = (result: SearchResult) => {
    if (query.trim()) {
      saveToHistory(query);
    }
    if (onResultPress) {
      onResultPress(result);
    }
  };

  const handleHistoryPress = (historyItem: string) => {
    setQuery(historyItem);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    const icons: Record<SearchResult['type'], string> = {
      animal: '🐷',
      gestation: '🤰',
      stock: '📦',
      ingredient: '🌾',
      ration: '🍽️',
      depense: '💰',
      charge_fixe: '💳',
      planification: '📅',
      collaborateur: '👤',
      mortalite: '💀',
    };
    return icons[type] || '📄';
  };

  const getTypeColor = (type: SearchResult['type']) => {
    const typeColors: Record<SearchResult['type'], string> = {
      animal: colors.primary,
      gestation: colors.accent,
      stock: colors.warning,
      ingredient: colors.info,
      ration: colors.secondary,
      depense: colors.error,
      charge_fixe: colors.textSecondary,
      planification: colors.primary,
      collaborateur: colors.accent,
      mortalite: colors.error,
    };
    return typeColors[type] || colors.textSecondary;
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        {
          backgroundColor: colors.surface,
          borderLeftColor: getTypeColor(item.type),
          ...colors.shadow.small,
        },
      ]}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultIcon}>{getTypeIcon(item.type)}</Text>
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <Text style={[styles.resultScreen, { color: colors.textSecondary }]}>
          {item.screen}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher dans tous les modules..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.trim() ? (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
          </Text>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsListContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun résultat trouvé pour "{query}"
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.historyContainer}>
          {searchHistory.length > 0 && (
            <>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Recherches récentes</Text>
              <ScrollView style={styles.historyList}>
                {searchHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleHistoryPress(item)}
                  >
                    <Text style={styles.historyIcon}>🕐</Text>
                    <Text style={[styles.historyText, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionsTitle, { color: colors.text }]}>Suggestions</Text>
            <View style={styles.suggestionsGrid}>
              <TouchableOpacity
                style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setQuery('truie')}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>🐷 Truies</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setQuery('stock')}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>📦 Stocks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setQuery('dépense')}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>💰 Dépenses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setQuery('gestation')}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>🤰 Gestations</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    margin: SPACING.md,
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
  },
  clearButtonText: {
    fontSize: FONT_SIZES.lg,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  resultsCount: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: SPACING.xl,
  },
  resultItem: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  resultSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  resultScreen: {
    fontSize: FONT_SIZES.xs,
    marginLeft: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  historyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  historyIcon: {
    fontSize: FONT_SIZES.md,
    marginRight: SPACING.sm,
  },
  historyText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  suggestionsContainer: {
    marginTop: SPACING.lg,
  },
  suggestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: FONT_SIZES.sm,
  },
});

