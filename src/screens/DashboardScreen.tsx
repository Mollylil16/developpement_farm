/**
 * Écran Dashboard avec Widgets Interactifs (Variante 6D) - Design amélioré
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useFocusEffect } from '@react-navigation/native';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import OverviewWidget from '../components/widgets/OverviewWidget';
import ReproductionWidget from '../components/widgets/ReproductionWidget';
import FinanceWidget from '../components/widgets/FinanceWidget';
import PerformanceWidget from '../components/widgets/PerformanceWidget';
import SecondaryWidget from '../components/widgets/SecondaryWidget';
import AlertesWidget from '../components/AlertesWidget';
import GlobalSearchModal from '../components/GlobalSearchModal';
import InvitationsModal from '../components/InvitationsModal';
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { projetActif, loading } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  const { hasPermission, isProprietaire } = usePermissions();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const hasShownInvitationsRef = useRef(false);
  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Bonjour 👋';
    } else if (hour >= 12 && hour < 18) {
      return 'Bonne après-midi 👋';
    } else {
      return 'Bonsoir 👋';
    }
  });

  // Animations pour les widgets
  const headerAnim = useRef(new Animated.Value(0)).current;
  const mainWidgetsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const secondaryWidgetsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Fonction pour mettre à jour le message de salutation
  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Bonjour 👋');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Bonne après-midi 👋');
    } else {
      setGreeting('Bonsoir 👋');
    }
  };

  useEffect(() => {
    // Animation du header
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animations en cascade pour les widgets principaux
    mainWidgetsAnim.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(200 + index * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Animations en cascade pour les widgets secondaires
    secondaryWidgetsAnim.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(600 + index * 80),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Mettre à jour le message de salutation toutes les minutes
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // Recharger les données quand l'écran revient au focus (après création/modification de mortalité)
  // Utiliser useRef pour éviter les chargements redondants
  const dernierChargementRef = useRef<{ projetId: string | null; timestamp: number }>({
    projetId: null,
    timestamp: 0,
  });

  // Afficher automatiquement le modal des invitations si elles existent et qu'on ne l'a pas encore montré
  useEffect(() => {
    if (invitationsEnAttente.length > 0 && !hasShownInvitationsRef.current && projetActif) {
      hasShownInvitationsRef.current = true;
      // Délai pour laisser le temps à l'écran de se charger
      setTimeout(() => {
        setInvitationsModalVisible(true);
      }, 1000);
    }
  }, [invitationsEnAttente.length, projetActif]);
  
  useFocusEffect(
    React.useCallback(() => {
      // Mettre à jour le message de salutation quand l'écran revient au focus
      updateGreeting();

      if (!projetActif) {
        dernierChargementRef.current = { projetId: null, timestamp: 0 };
        return;
      }
      
      const maintenant = Date.now();
      const delaiMinimum = 2000; // 2 secondes minimum entre deux chargements
      const memeProjet = dernierChargementRef.current.projetId === projetActif.id;
      const assezRecent = maintenant - dernierChargementRef.current.timestamp < delaiMinimum;
      
      // Charger uniquement si :
      // - Le projet a changé
      // - Ou si le dernier chargement remonte à plus de 2 secondes (évite les chargements multiples rapides)
      if (!memeProjet || !assezRecent) {
        dernierChargementRef.current = {
          projetId: projetActif.id,
          timestamp: maintenant,
        };
        
        // Recharger les mortalités et les animaux pour mettre à jour les widgets
        dispatch(loadMortalitesParProjet(projetActif.id));
        dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
        // Recharger les pesées récentes pour exclure celles des animaux retirés
        dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
      }
    }, [projetActif?.id, dispatch])
  );

  // Ne pas recharger le projet ici - il est déjà chargé dans AppNavigator
  // Cela évite les conflits de navigation après création

  if (loading && !projetActif) {
    return <LoadingSpinner message="Chargement du projet..." />;
  }

  if (!projetActif) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <EmptyState
          title="Aucun projet actif"
          message="Créez un projet pour commencer à gérer votre élevage"
        />
      </SafeAreaView>
    );
  }

  const currentDate = format(new Date(), 'EEEE d MMMM yyyy');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header amélioré avec date et badge */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : colors.text }]}>{projetActif.nom}</Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{currentDate}</Text>
              </View>
              <View style={styles.headerRight}>
                {invitationsEnAttente.length > 0 && (
                  <TouchableOpacity
                    style={[styles.invitationBadge, { backgroundColor: colors.warning, ...colors.shadow.small }]}
                    onPress={() => setInvitationsModalVisible(true)}
                  >
                    <Text style={styles.invitationBadgeText}>📬 {invitationsEnAttente.length}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: colors.primary, ...colors.shadow.small }]}
                  onPress={() => setSearchModalVisible(true)}
                >
                  <Text style={styles.searchButtonIcon}>🔍</Text>
                </TouchableOpacity>
                <View style={[styles.headerBadge, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>Actif</Text>
                </View>
              </View>
            </View>
                <View style={[styles.headerDivider, { backgroundColor: colors.primaryLight + '30' }]} />
          </Animated.View>

          {/* Widget d'alertes */}
          <View style={styles.alertesContainer}>
            <AlertesWidget />
          </View>

          {/* Widgets principaux avec animations */}
          <View style={styles.mainWidgetsContainer}>
            <Animated.View
              style={[
                styles.widgetWrapper,
                {
                  opacity: mainWidgetsAnim[0],
                  transform: [
                    {
                      scale: mainWidgetsAnim[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <OverviewWidget
                onPress={() => {
                  // Rester sur Dashboard
                }}
              />
            </Animated.View>

            {/* Widget Reproduction - Visible si permission reproduction */}
            {hasPermission('reproduction') && (
              <Animated.View
                style={[
                  styles.widgetWrapper,
                  {
                    opacity: mainWidgetsAnim[1],
                    transform: [
                      {
                        scale: mainWidgetsAnim[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <ReproductionWidget
                  onPress={() => {
                    // @ts-ignore - navigation typée
                    navigation.navigate('Main', { screen: SCREENS.REPRODUCTION });
                  }}
                />
              </Animated.View>
            )}

            {/* Widget Finance - Visible si permission finance */}
            {hasPermission('finance') && (
              <Animated.View
                style={[
                  styles.widgetWrapper,
                  {
                    opacity: mainWidgetsAnim[2],
                    transform: [
                      {
                        scale: mainWidgetsAnim[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <FinanceWidget
                  onPress={() => {
                    // @ts-ignore - navigation typée
                    navigation.navigate('Main', { screen: SCREENS.FINANCE });
                  }}
                />
              </Animated.View>
            )}

            {/* Widget Rapports - Visible si permission rapports */}
            {hasPermission('rapports') && (
              <Animated.View
                style={[
                  {
                    opacity: mainWidgetsAnim[3],
                    transform: [
                      {
                        scale: mainWidgetsAnim[3].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <PerformanceWidget
                  onPress={() => {
                    // @ts-ignore - navigation typée
                    navigation.navigate('Main', { screen: SCREENS.REPORTS });
                  }}
                />
              </Animated.View>
            )}
          </View>

          {/* Section widgets secondaires */}
              <View style={styles.secondarySection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Modules complémentaires</Text>
            <View style={styles.secondaryWidgetsContainer}>
              {(() => {
                const widgets: Array<{ type: 'nutrition' | 'planning' | 'collaboration' | 'mortalites' | 'production'; screen: string }> = [];
                
                // Nutrition - Visible si permission nutrition
                if (hasPermission('nutrition')) {
                  widgets.push({ type: 'nutrition', screen: SCREENS.NUTRITION });
                }
                
                // Planification - Visible si permission planification
                if (hasPermission('planification')) {
                  widgets.push({ type: 'planning', screen: SCREENS.PLANIFICATION });
                }
                
                // Collaboration - Visible seulement au propriétaire
                if (isProprietaire) {
                  widgets.push({ type: 'collaboration', screen: SCREENS.COLLABORATION });
                }
                
                // Mortalités - Visible si permission mortalites
                if (hasPermission('mortalites')) {
                  widgets.push({ type: 'mortalites', screen: SCREENS.MORTALITES });
                }
                
                // Production - Toujours visible (pas de permission spécifique pour l'instant)
                widgets.push({ type: 'production', screen: SCREENS.PRODUCTION });
                
                return widgets;
              })().map((widget, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.secondaryWidgetWrapper,
                    {
                      opacity: secondaryWidgetsAnim[index],
                      transform: [
                        {
                          translateY: secondaryWidgetsAnim[index].interpolate({
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
                    onPress={() => {
                      // @ts-ignore - navigation typée
                      navigation.navigate('Main', { screen: widget.screen });
                    }}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      {searchModalVisible && (
        <GlobalSearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
        />
      )}
      <InvitationsModal
        visible={invitationsModalVisible}
        onClose={() => setInvitationsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  header: {
    marginBottom: SPACING.xl + 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonIcon: {
    fontSize: FONT_SIZES.lg,
  },
  invitationBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.xs,
    minWidth: 50,
    alignItems: 'center',
  },
  invitationBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  headerBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
  },
  headerDivider: {
    height: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.md,
  },
  alertesContainer: {
    marginBottom: SPACING.xl,
  },
  mainWidgetsContainer: {
    marginBottom: SPACING.xl + 10,
  },
  widgetWrapper: {
    marginBottom: SPACING.lg,
  },
  secondarySection: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  secondaryWidgetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    gap: SPACING.md,
  },
  secondaryWidgetWrapper: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    marginHorizontal: SPACING.xs,
  },
});
