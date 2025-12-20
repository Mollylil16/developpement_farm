/**
 * Composant des widgets secondaires du Dashboard
 * Affiche: Santé, Nutrition, Planning, Collaboration, Production
 * Version refactorée avec grille 2×N (2 cartes par colonne)
 */

import React, { useMemo, useState, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import CompactModuleCard from '../widgets/CompactModuleCard';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useWidgetData } from '../widgets/useWidgetData';

const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = 170; // Largeur fixe pour les cartes compactes
const COLUMN_WIDTH = CARD_WIDTH + SPACING.md; // Largeur d'une colonne (carte + margin)

type WidgetType =
  | 'nutrition'
  | 'planning'
  | 'collaboration'
  | 'mortalites'
  | 'production'
  | 'sante'
  | 'marketplace'
  | 'purchases'
  | 'expenses';

interface WidgetConfig {
  type: WidgetType;
  screen: string;
}

interface DashboardSecondaryWidgetsProps {
  widgets: WidgetConfig[];
  animations: Animated.Value[];
  onPressWidget: (screen: string) => void;
  horizontal?: boolean;
}

/**
 * Fonction utilitaire pour grouper les widgets en colonnes de 2
 */
function chunkModules<T>(modules: T[], size: number = 2): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < modules.length; i += size) {
    result.push(modules.slice(i, i + size));
  }
  return result;
}

const DashboardSecondaryWidgets = memo(function DashboardSecondaryWidgets({
  widgets,
  animations,
  onPressWidget,
  horizontal = false,
}: DashboardSecondaryWidgetsProps) {
  const { colors } = useTheme();
  const getWidgetData = useWidgetData();
  const [activePage, setActivePage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  if (widgets.length === 0) {
    return null;
  }

  // Grouper les widgets en colonnes de 2
  const moduleColumns = useMemo(() => {
    return chunkModules(widgets, 2);
  }, [widgets]);

  // Calculer le nombre de pages
  const pages = moduleColumns.length;

  // Handler pour détecter la page actuelle lors du scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    // Calculer l'index de la page en fonction de la position de scroll
    // On soustrait le padding initial et on divise par la largeur d'une colonne
    const adjustedOffsetX = Math.max(0, offsetX - SPACING.xl);
    const pageIndex = Math.round(adjustedOffsetX / COLUMN_WIDTH);
    const clampedPageIndex = Math.max(0, Math.min(pageIndex, pages - 1));
    setActivePage(clampedPageIndex);
  };

  if (horizontal) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Modules principaux</Text>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
          style={styles.horizontalScrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          pagingEnabled={false}
          snapToInterval={COLUMN_WIDTH}
          decelerationRate="fast"
        >
          {moduleColumns.map((column, columnIndex) => (
            <Animated.View
              key={`column-${columnIndex}`}
              style={[
                styles.moduleColumn,
                {
                  width: CARD_WIDTH,
                  opacity: animations[columnIndex] || animations[animations.length - 1],
                  transform: [
                    {
                      translateY: (
                        animations[columnIndex] || animations[animations.length - 1]
                      ).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {column.map((widget, widgetIndex) => {
                const widgetData = getWidgetData(widget.type);
                if (!widgetData) return null;

                return (
                  <View
                    key={`${widget.type}-${widgetIndex}`}
                    style={[
                      styles.cardWrapper,
                      widgetIndex === column.length - 1 && styles.lastCardInColumn,
                    ]}
                  >
                    <CompactModuleCard
                      icon={widgetData.emoji}
                      title={widgetData.title}
                      primaryValue={widgetData.primary}
                      secondaryValue={widgetData.secondary}
                      labelPrimary={widgetData.labelPrimary}
                      labelSecondary={widgetData.labelSecondary}
                      onPress={() => onPressWidget(widget.screen)}
                    />
                  </View>
                );
              })}
            </Animated.View>
          ))}
        </ScrollView>

        {/* Indicateur de pagination */}
        {pages > 1 && (
          <View style={styles.paginationContainer}>
            {moduleColumns.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activePage ? styles.dotActive : styles.dotInactive,
                  {
                    backgroundColor: index === activePage ? colors.primary : colors.textSecondary,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  // Mode non-horizontal (grille 2 colonnes)
  // moduleColumns est déjà défini plus haut, pas besoin de le redéclarer

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Modules complémentaires</Text>
      <View style={styles.widgetsContainer}>
        {moduleColumns.map((column, columnIndex) => (
          <View key={`column-${columnIndex}`} style={styles.columnContainer}>
            {column.map((widget, widgetIndex) => {
              const widgetData = getWidgetData(widget.type);
              if (!widgetData) return null;

              return (
                <Animated.View
                  key={`${widget.type}-${widgetIndex}`}
                  style={[
                    styles.widgetWrapper,
                    {
                      opacity: animations[widgetIndex] || animations[animations.length - 1],
                      transform: [
                        {
                          translateY: (
                            animations[widgetIndex] || animations[animations.length - 1]
                          ).interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <CompactModuleCard
                    icon={widgetData.emoji}
                    title={widgetData.title}
                    primaryValue={widgetData.primary}
                    secondaryValue={widgetData.secondary}
                    labelPrimary={widgetData.labelPrimary}
                    labelSecondary={widgetData.labelSecondary}
                    onPress={() => onPressWidget(widget.screen)}
                  />
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  widgetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  columnContainer: {
    width: '48%',
    gap: SPACING.sm,
  },
  widgetWrapper: {
    width: '100%',
  },
  horizontalScrollView: {
    marginHorizontal: -SPACING.xl,
  },
  horizontalScrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  horizontalWidgetWrapper: {
    marginRight: SPACING.sm,
  },
  moduleColumn: {
    marginRight: SPACING.md,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: SPACING.sm,
    width: '100%',
  },
  lastCardInColumn: {
    marginBottom: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotInactive: {
    opacity: 0.5,
  },
  dotActive: {
    opacity: 1,
  },
});

export default DashboardSecondaryWidgets;
