/**
 * Écran Dashboard avec Widgets Interactifs (Variante 6D) - Design amélioré
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useFocusEffect } from '@react-navigation/native';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SkeletonWidget } from '../components/SkeletonLoader';
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
import { exportDashboardPDF } from '../services/pdf/dashboardPDF';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import { selectAllChargesFixes, selectAllDepensesPonctuelles, selectAllRevenus } from '../store/selectors/financeSelectors';
import { selectAllGestations, selectAllSevrages } from '../store/selectors/reproductionSelectors';

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { projetActif, loading } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  const { hasPermission, isProprietaire } = usePermissions();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [profilPhotoUri, setProfilPhotoUri] = useState<string | null>(null);
  const [profilInitiales, setProfilInitiales] = useState<string>('');
  const [profilPrenom, setProfilPrenom] = useState<string>('');
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
  const mainWidgetsAnim = React.useMemo(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ], []);
  const secondaryWidgetsAnim = React.useMemo(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0), // Extra pour le widget Santé ajouté
  ], []);

  // Fonction pour mettre à jour le message de salutation
  const updateGreeting = React.useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Bonjour 👋');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Bonne après-midi 👋');
    } else {
      setGreeting('Bonsoir 👋');
    }
  }, []);

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

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Recharger les données quand l'écran revient au focus (après création/modification de mortalité)
  // Utiliser useRef pour éviter les chargements redondants
  const dernierChargementRef = useRef<{ projetId: string | null; timestamp: number }>({
    projetId: null,
    timestamp: 0,
  });

  // ✅ MÉMOÏSER invitationsEnAttente.length pour éviter les boucles
  const invitationsLength = Array.isArray(invitationsEnAttente) ? invitationsEnAttente.length : 0;
  
  // Charger la photo de profil
  const loadProfilPhoto = React.useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@profil_fermier');
      if (stored) {
        const profil = JSON.parse(stored);
        setProfilPhotoUri(profil.photo_uri || null);
        setProfilPrenom(profil.prenom || '');
        
        // Générer les initiales
        if (profil.prenom && profil.nom) {
          const initiales = `${profil.prenom.charAt(0).toUpperCase()}${profil.nom.charAt(0).toUpperCase()}`;
          setProfilInitiales(initiales);
        } else {
          setProfilInitiales('');
        }
      }
    } catch (error) {
      console.error('Erreur chargement photo profil:', error);
    }
  }, []);

  // Charger la photo au montage et à chaque fois que l'écran revient au focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfilPhoto();
    }, [loadProfilPhoto])
  );

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = React.useCallback(async () => {
    if (!projetActif?.id) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
        dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).unwrap(),
        dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).unwrap(),
      ]);
      // Recharger aussi la photo de profil
      await loadProfilPhoto();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, dispatch, loadProfilPhoto]);

  // Récupérer les données depuis le store pour l'export PDF
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const chargesFixes = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
  const revenus = useAppSelector(selectAllRevenus);
  const gestations = useAppSelector(selectAllGestations);
  const sevrages = useAppSelector(selectAllSevrages);

  // Fonction pour exporter le dashboard en PDF
  const handleExportPDF = React.useCallback(async () => {
    if (!projetActif) return;
    
    setExportingPDF(true);
    try {
      
      // Calculer les totaux financiers
      const totalCharges = chargesFixes.reduce((sum, c) => sum + c.montant, 0);
      const totalDepenses = depensesPonctuelles.reduce((sum, d) => sum + d.montant, 0);
      const totalRevenus = revenus.reduce((sum, r) => sum + r.montant, 0);
      const solde = totalRevenus - (totalCharges + totalDepenses);
      
      // Calculer les stats de production
      const animauxActifs = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');
      
      // Récupérer toutes les pesées
      const toutesPesees = Object.values(peseesParAnimal).flat();
      const peseesRecentes = toutesPesees.slice(0, 20);
      
      // Calculer le poids total basé sur la dernière pesée de chaque animal
      const poidsTotal = animauxActifs.reduce((sum: number, animal) => {
        const pesees = peseesParAnimal[animal.id];
        if (pesees && pesees.length > 0) {
          return sum + pesees[0].poids_kg;
        }
        return sum;
      }, 0);
      
      // Calculer le GMQ moyen
      const gmqValues = toutesPesees
        .filter((p) => p.gmq)
        .map((p) => p.gmq as number);
      const gmqMoyen = gmqValues.length > 0 
        ? gmqValues.reduce((sum: number, val: number) => sum + val, 0) / gmqValues.length 
        : 0;
      
      // Stats de reproduction
      const gestationsEnCours = gestations.filter((g) => g.statut === 'en_cours').length;
      const sevragesRecents = sevrages.filter((s) => {
        const dateS = new Date(s.date_sevrage);
        const now = new Date();
        const diffDays = (now.getTime() - dateS.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }).length;
      
      // Trouver la prochaine mise bas
      const gestationsAvecDatePrevue = gestations
        .filter((g) => g.statut === 'en_cours' && g.date_mise_bas_prevue)
        .sort((a, b) => new Date(a.date_mise_bas_prevue!).getTime() - new Date(b.date_mise_bas_prevue!).getTime());
      const prochaineMiseBas = gestationsAvecDatePrevue.length > 0 
        ? gestationsAvecDatePrevue[0].date_mise_bas_prevue 
        : null;
      
      // Préparer les données pour le PDF
      const dashboardData = {
        projet: projetActif,
        animaux: animaux,
        finances: {
          totalDepenses: totalCharges + totalDepenses,
          totalRevenus: totalRevenus,
          solde: solde,
          chargesFixes: totalCharges,
          depensesPonctuelles: totalDepenses,
        },
        production: {
          animauxActifs: animauxActifs.length,
          peseesRecentes: peseesRecentes.length,
          poidsTotal: poidsTotal,
          gmqMoyen: gmqMoyen,
        },
        reproduction: {
          gestationsEnCours: gestationsEnCours,
          prochaineMiseBas: prochaineMiseBas,
          sevragesRecents: sevragesRecents,
        },
        alertes: [], // Vous pouvez ajouter les alertes ici si nécessaire
      };
      
      // Générer et partager le PDF
      await exportDashboardPDF(dashboardData);
      
      Alert.alert(
        'PDF généré avec succès',
        'Le rapport dashboard a été généré et est prêt à être partagé.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      Alert.alert(
        'Erreur',
        'Impossible de générer le PDF. Vérifiez vos données et réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setExportingPDF(false);
    }
  }, [projetActif, animaux, chargesFixes, depensesPonctuelles, revenus, gestations, sevrages, peseesParAnimal]);
  
  // ❌ CORRECTION CRITIQUE : Ce useEffect se déclenche trop souvent ! Supprimer pour tester
  // Afficher automatiquement le modal des invitations si elles existent et qu'on ne l'a pas encore montré
  /* useEffect(() => {
    console.log('  🔍 [useEffect invitations] invitationsLength:', invitationsLength);
    if (invitationsLength > 0 && !hasShownInvitationsRef.current && projetActif) {
      hasShownInvitationsRef.current = true;
      // Délai pour laisser le temps à l'écran de se charger
      setTimeout(() => {
        setInvitationsModalVisible(true);
      }, 1000);
    }
  }, [invitationsLength, projetActif?.id]); */
  
  // ❌ CORRECTION CRITIQUE: useFocusEffect cause des re-renders en boucle !
  // Désactiver temporairement pour tester
  /* useFocusEffect(
    React.useCallback(() => {
      console.log('  🔍 [useFocusEffect] TRIGGERED');
      // Mettre à jour le message de salutation quand l'écran revient au focus
      updateGreeting();

      if (!projetActif) {
        dernierChargementRef.current = { projetId: null, timestamp: 0 };
        setIsInitialLoading(false);
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
        
        // Afficher le skeleton pendant le chargement initial
        if (!memeProjet) {
          setIsInitialLoading(true);
        }
        
        // Recharger les mortalités et les animaux pour mettre à jour les widgets
        dispatch(loadMortalitesParProjet(projetActif.id));
        dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
        // Recharger les pesées récentes pour exclure celles des animaux retirés
        dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
        
        // Masquer le skeleton après un court délai (les données sont chargées de manière asynchrone)
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 500);
      } else {
        setIsInitialLoading(false);
      }
    }, [projetActif?.id, dispatch, updateGreeting])
  ); */
  
  // ✅ REMPLACEMENT TEMPORAIRE: useEffect simple pour le chargement initial
  React.useEffect(() => {
    if (!projetActif?.id) return;
    
    const memeProjet = dernierChargementRef.current.projetId === projetActif.id;
    if (memeProjet) {
      return;
    }
    
    dernierChargementRef.current = {
      projetId: projetActif.id,
      timestamp: Date.now(),
    };
    
    dispatch(loadMortalitesParProjet(projetActif.id));
    dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
    
    setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);
  }, [projetActif?.id, dispatch]);

  // Ne pas recharger le projet ici - il est déjà chargé dans AppNavigator
  // Cela évite les conflits de navigation après création

  if (loading && !projetActif) {
    return <LoadingSpinner message="Chargement du projet..." />;
  }

  // Formater la date en toute sécurité
  let currentDate = '';
  try {
    currentDate = format(new Date(), 'EEEE d MMMM yyyy');
    // Debug log removed to prevent potential errors
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    currentDate = new Date().toLocaleDateString('fr-FR');
  }
  
  // Debug logs removed to prevent "Text must be rendered" errors

  if (!projetActif) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          title="Aucun projet actif"
          message="Créez un projet pour commencer à gérer votre élevage"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Actualisation..."
            titleColor={colors.textSecondary}
          />
        }
      >
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
            {/* Header principal avec photo et infos */}
            <View style={styles.headerMain}>
              {/* Photo de profil à gauche */}
              <TouchableOpacity
                style={[styles.profilPhotoButton, { borderColor: colors.primary, ...colors.shadow.medium }]}
                onPress={() => navigation.navigate(SCREENS.PROFIL as any)}
                activeOpacity={0.8}
              >
                {profilPhotoUri ? (
                  <Image source={{ uri: profilPhotoUri }} style={styles.profilPhoto} />
                ) : (
                  <View style={[styles.profilPhotoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                    {profilInitiales ? (
                      <Text style={[styles.initialesText, { color: colors.primary }]}>
                        {profilInitiales}
                      </Text>
                    ) : (
                      <Ionicons name="person" size={28} color={colors.primary} />
                    )}
                  </View>
                )}
                <View style={[styles.profilPhotoBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={10} color="#FFF" />
                </View>
              </TouchableOpacity>

              {/* Texte au centre */}
              <View style={styles.headerTextContainer}>
                <View style={styles.headerFirstLine}>
                  <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting || 'Bonjour 👋'}</Text>
                  <View style={[styles.headerBadge, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
                    <Text style={[styles.badgeText, { color: colors.success }]}>Actif</Text>
                  </View>
                </View>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : colors.text }]}>
                  {profilPrenom || 'Utilisateur'}
                </Text>
                {currentDate && (
                  <Text style={[styles.date, { color: colors.textSecondary }]}>{currentDate}</Text>
                )}
                {projetActif?.nom && (
                  <Text style={[styles.projetNom, { color: colors.textSecondary }]}>
                    Projet {projetActif.nom}
                  </Text>
                )}
              </View>

              {/* Invitations à droite */}
              {Array.isArray(invitationsEnAttente) && invitationsEnAttente.length > 0 && (
                <TouchableOpacity
                  style={[styles.invitationBadge, { backgroundColor: colors.warning, ...colors.shadow.small }]}
                  onPress={() => setInvitationsModalVisible(true)}
                >
                  <Text style={styles.invitationBadgeText}>📬 {invitationsEnAttente.length}</Text>
                </TouchableOpacity>
              )}
            </View>
                <View style={[styles.headerDivider, { backgroundColor: colors.primaryLight + '30' }]} />
          </Animated.View>

          {/* Widget d'alertes */}
          <View style={styles.alertesContainer}>
            <AlertesWidget />
          </View>

          {/* Widgets principaux avec animations */}
          <View style={styles.mainWidgetsContainer}>
            {isInitialLoading ? (
              <SkeletonWidget showStats={true} />
            ) : (
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
            )}

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
                  styles.widgetWrapper,
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
                const widgets: Array<{ type: 'nutrition' | 'planning' | 'collaboration' | 'mortalites' | 'production' | 'sante'; screen: string }> = [];
                
                // Santé - Visible si permission sante
                if (hasPermission('sante')) {
                  widgets.push({ type: 'sante', screen: SCREENS.SANTE });
                }
                
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
                
                // Mortalités - Redirige vers Santé (intégré dans le module Santé)
                // Note: Mortalité est maintenant accessible via Santé > Mortalités
                // Pas besoin d'afficher un widget séparé si Santé est déjà affiché
                
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
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profilPhotoButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    overflow: 'hidden',
    position: 'relative',
  },
  profilPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profilPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  initialesText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerFirstLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs / 2,
  },
  projetNom: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  exportButtonIcon: {
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
