/**
 * Écran Paramètres avec onglets - Design moderne et amélioré
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import ParametresProjetComponent from '../components/ParametresProjetComponent';
import ParametresAppComponent from '../components/ParametresAppComponent';
import TrainingScreen from './TrainingScreen';
import { FONT_SIZES, SPACING, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function ParametresScreen() {
  const { colors } = useTheme();
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerFadeAnim,
            transform: [{ translateY: headerSlideAnim }],
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Paramètres</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Gérez votre projet et l'application</Text>
          </View>
        </View>
      </Animated.View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
            height: 3,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            borderBottomWidth: 0,
          },
          tabBarLabelStyle: {
            fontSize: FONT_SIZES.md,
            fontWeight: '600',
            textTransform: 'none',
            marginVertical: SPACING.xs,
          },
          tabBarPressColor: colors.surface,
        }}
      >
        <Tab.Screen
          name="Projet"
          component={ParametresProjetComponent}
          options={{
            title: 'Projet',
          }}
        />
        <Tab.Screen
          name="Application"
          component={ParametresAppComponent}
          options={{
            title: 'Application',
          }}
        />
        <Tab.Screen
          name="Formation"
          component={TrainingScreen}
          options={{
            title: 'Formation',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    marginBottom: SPACING.xs / 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
});

