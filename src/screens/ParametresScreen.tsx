/**
 * Écran Paramètres avec onglets - Design moderne et amélioré
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import ParametresProjetComponent from '../components/ParametresProjetComponent';
import ParametresAppComponent from '../components/ParametresAppComponent';
import { COLORS, FONT_SIZES, SPACING, ANIMATIONS } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();

export default function ParametresScreen() {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerFadeAnim,
            transform: [{ translateY: headerSlideAnim }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>⚙️</Text>
            </View>
            <View style={styles.headerIconGlow} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <Text style={styles.headerSubtitle}>Gérez votre projet et l'application</Text>
          </View>
        </View>
      </Animated.View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: COLORS.primary,
            height: 3,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: COLORS.background,
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
          tabBarPressColor: COLORS.surface,
        }}
      >
        <Tab.Screen
          name="Projet"
          component={ParametresProjetComponent}
          options={{
            title: '📋 Projet',
          }}
        />
        <Tab.Screen
          name="Application"
          component={ParametresAppComponent}
          options={{
            title: '📱 Application',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: SPACING.lg,
    ...COLORS.shadow.medium,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...COLORS.shadow.small,
  },
  headerIconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '30',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  headerIconText: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});

