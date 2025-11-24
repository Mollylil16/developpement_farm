/**
 * Composant des widgets secondaires du Dashboard
 * Affiche: Santé, Nutrition, Planning, Collaboration, Production
 */

import React from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Dimensions } from 'react-native';
import SecondaryWidget from '../widgets/SecondaryWidget';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';

const screenWidth = Dimensions.get('window').width;

type WidgetType = 'nutrition' | 'planning' | 'collaboration' | 'mortalites' | 'production' | 'sante';

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

export default function DashboardSecondaryWidgets({
  widgets,
  animations,
  onPressWidget,
  horizontal = false,
}: DashboardSecondaryWidgetsProps) {
  const { colors } = useTheme();

  if (widgets.length === 0) {
    return null;
  }

  const widgetWidth = horizontal ? screenWidth * 0.75 : '48%';

  if (horizontal) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Modules complémentaires
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
          style={styles.horizontalScrollView}
        >
          {widgets.map((widget, index) => (
            <Animated.View
              key={`${widget.type}-${index}`}
              style={[
                styles.widgetWrapper,
                styles.horizontalWidgetWrapper,
                {
                  width: widgetWidth,
                  opacity: animations[index] || animations[animations.length - 1],
                  transform: [
                    {
                      translateY: (animations[index] || animations[animations.length - 1]).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <SecondaryWidget
                type={widget.type}
                onPress={() => onPressWidget(widget.screen)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Modules complémentaires
      </Text>
      <View style={styles.widgetsContainer}>
        {widgets.map((widget, index) => (
          <Animated.View
            key={`${widget.type}-${index}`}
            style={[
              styles.widgetWrapper,
              {
                opacity: animations[index] || animations[animations.length - 1],
                transform: [
                  {
                    translateY: (animations[index] || animations[animations.length - 1]).interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <SecondaryWidget
              type={widget.type}
              onPress={() => onPressWidget(widget.screen)}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

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
  widgetWrapper: {
    width: '48%',
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
});

