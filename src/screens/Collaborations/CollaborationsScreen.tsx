/**
 * Écran Collaborations - Design refactorisé avec ActionCard
 * Layout: Header + 3 Actions Cards (Mon QR, Scanner, Inviter) + Sections de contenu
 * Responsive, animations, haptics intégrés
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  RefreshControl,
  ScrollView,
  Animated,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import ProtectedScreen from '../../components/ProtectedScreen';
import ActionCard from '../../components/Collaborations/ActionCard';
import QROnboarding from '../../components/Collaborations/QROnboarding';
import CollaborationsEmptyState from '../../components/Collaborations/CollaborationsEmptyState';
import InvitationsModal from '../../components/InvitationsModal';
import CollaborationFormModal from '../../components/CollaborationFormModal';
import CollaborativeProjectsSection from '../../components/Collaborations/CollaborativeProjectsSection';
import InvitationsListSection from '../../components/Collaborations/InvitationsListSection';
import CollaborationListComponent from '../../components/CollaborationListComponent';
import { loadInvitationsEnAttente, loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import { loadProjets } from '../../store/slices/projetSlice';
import { triggerHaptic, hapticScanSuccess, hapticError } from '../../utils/haptics';
import { Camera } from 'expo-camera';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Collaborateur } from '../../types/collaboration';
import { SPACING } from '../../constants/theme';
import { SCREENS } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const ONBOARDING_KEY = '@collaborations_qr_onboarding_shown';

function CollaborationsScreenContent() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const { projetActif, projets } = useAppSelector((state) => state.projet);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { collaborateurs, invitationsEnAttente, loading } = useAppSelector(
    (state) => state.collaboration
  );

  // Calculer les collaborateurs par projet
  const collaborateursParProjet = useMemo(() => {
    const map: Record<string, Collaborateur[]> = {};
    if (Array.isArray(collaborateurs)) {
      collaborateurs.forEach((collab: Collaborateur) => {
        if (!map[collab.projet_id]) {
          map[collab.projet_id] = [];
        }
        map[collab.projet_id].push(collab);
      });
    }
    return map;
  }, [collaborateurs]);

  // États locaux
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculer le nombre d'invitations en attente
  const invitationsCount = Array.isArray(invitationsEnAttente)
    ? invitationsEnAttente.filter((inv: Collaborateur) => inv.statut === 'en_attente').length
    : 0;

  // Vérifier si l'utilisateur est propriétaire du projet actif
  const isProprietaire = useMemo(() => {
    return (
      projetActif &&
      currentUser &&
      projetActif.proprietaire_id === currentUser.id
    );
  }, [projetActif, currentUser]);

  // Vérifier si l'onboarding a déjà été affiché
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const shown = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!shown) {
          setTimeout(() => {
            setShowOnboarding(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'onboarding:', error);
      }
    };

    if (isFocused) {
      checkOnboarding();
      // Charger les invitations en attente
      if (currentUser) {
        dispatch(
          loadInvitationsEnAttente({
            userId: currentUser.id,
            email: currentUser.email,
            telephone: currentUser.telephone,
          })
        );
      }
    }
  }, [isFocused, currentUser, dispatch]);

  // Animation d'entrée des actions cards
  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: 1,
      duration: 400,
      delay: 100,
      useNativeDriver: true,
    }).start();

    // Animation pulse sur le bouton "Scanner"
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [actionsAnim, pulseAnim]);

  // Gérer la fermeture de l'onboarding
  const handleOnboardingClose = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setShowOnboarding(false);
      triggerHaptic('light');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'onboarding:', error);
      setShowOnboarding(false);
    }
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic('light');

    try {
      // Recharger les données
      if (projetActif) {
        await dispatch(loadCollaborateursParProjet(projetActif.id));
      }
      if (currentUser) {
        await dispatch(
          loadInvitationsEnAttente({
            userId: currentUser.id,
            email: currentUser.email,
            telephone: currentUser.telephone,
          })
        );
      }
      await dispatch(loadProjets());

      Toast.show({
        type: 'success',
        text1: 'Actualisé ✓',
        text2: 'Les données ont été mises à jour',
        visibilityTime: 2000,
      });
    } catch (error) {
      hapticError();
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'actualiser les données',
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif, currentUser]);

  // Gérer le scan QR
  const handleScanQR = useCallback(async () => {
    console.log('[CollaborationsScreen] handleScanQR appelé');
    triggerHaptic('light');

    try {
      console.log('[CollaborationsScreen] Demande de permissions caméra...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('[CollaborationsScreen] Status permissions:', status);

      if (status === 'granted') {
        console.log('[CollaborationsScreen] Permissions accordées, navigation vers scanner');
        hapticScanSuccess();
        navigation.navigate(SCREENS.SCAN_QR_COLLABORATEUR as never);
      } else {
        console.log('[CollaborationsScreen] Permissions refusées');
        hapticError();
        Alert.alert(
          'Permission caméra requise',
          'Pour scanner les QR codes, nous avons besoin d\'accéder à votre caméra.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Paramètres',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[CollaborationsScreen] Erreur lors de la demande de permission:', error);
      hapticError();
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la demande de permission caméra.',
        [{ text: 'OK' }]
      );
    }
  }, [navigation]);

  // Gérer l'affichage du QR code
  const handleShowQR = useCallback(() => {
    triggerHaptic('light');
    navigation.navigate(SCREENS.MY_QR_CODE as never);
  }, [navigation]);

  // Gérer l'invitation manuelle
  const handleInvite = useCallback(() => {
    if (!isProprietaire) {
      Alert.alert('Permission refusée', 'Seul le propriétaire peut inviter des collaborateurs.');
      return;
    }
    triggerHaptic('light');
    setSelectedCollaborateur(null);
    setIsEditing(false);
    setShowInviteModal(true);
  }, [isProprietaire]);

  // Vérifier si on doit afficher l'empty state
  const hasCollaborations = Array.isArray(collaborateurs) && collaborateurs.length > 0;
  const hasInvitations = invitationsCount > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Onboarding QR */}
      <QROnboarding visible={showOnboarding} onClose={handleOnboardingClose} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Collaborations
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerSettings}
          onPress={() => {
            // TODO: Ouvrir les paramètres des collaborations
            triggerHaptic('light');
          }}
          accessibilityRole="button"
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Section Actions Cards avec animation */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: actionsAnim,
              transform: [
                {
                  translateY: actionsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ActionCard variant="my-qr" onPress={handleShowQR} />

          <Animated.View
            style={{
              flex: 1,
              transform: [{ scale: pulseAnim }],
            }}
          >
            <ActionCard variant="scan-qr" onPress={handleScanQR} />
          </Animated.View>

          {isProprietaire && (
            <ActionCard variant="invite" onPress={handleInvite} />
          )}
        </Animated.View>

        {/* Section Mes Projets Collaboratifs */}
        <CollaborativeProjectsSection
          projets={projets}
          collaborateursParProjet={collaborateursParProjet}
          onProjectPress={(projet) => {
            // TODO: Naviguer vers les détails du projet ou activer le projet
            triggerHaptic('light');
          }}
        />

        {/* Section Invitations en attente avec actions */}
        <InvitationsListSection
          onShowAll={() => {
            setShowInvitationsModal(true);
            triggerHaptic('light');
          }}
        />

        {/* Liste des collaborations du projet actif */}
        {projetActif && (
          <View style={styles.content}>
            <CollaborationListComponent />
          </View>
        )}
      </ScrollView>

      {/* Modal des invitations */}
      <InvitationsModal
        visible={showInvitationsModal}
        onClose={() => {
          setShowInvitationsModal(false);
          triggerHaptic('light');
        }}
      />

      {/* Modal d'invitation de collaborateur */}
      <CollaborationFormModal
        visible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setSelectedCollaborateur(null);
          setIsEditing(false);
          triggerHaptic('light');
        }}
        onSuccess={async () => {
          setShowInviteModal(false);
          setSelectedCollaborateur(null);
          setIsEditing(false);
          triggerHaptic('success');
          Toast.show({
            type: 'success',
            text1: 'Invitation envoyée ✓',
            text2: 'Le collaborateur recevra une invitation',
            visibilityTime: 3000,
          });
          // Recharger les collaborateurs
          if (projetActif) {
            await dispatch(loadCollaborateursParProjet(projetActif.id));
          }
        }}
        collaborateur={selectedCollaborateur}
        isEditing={isEditing}
      />
    </SafeAreaView>
  );
}

export default function CollaborationScreen() {
  return (
    <ProtectedScreen requireOwner={true}>
      <CollaborationsScreenContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSettings: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    maxWidth: IS_TABLET ? 600 : SCREEN_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  content: {
    flex: 1,
    minHeight: 300,
  },
});
