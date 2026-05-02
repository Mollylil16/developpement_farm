/**
 * Écran de détail d'un projet pour vétérinaires et techniciens
 * Hub de navigation vers les différentes sections du projet
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectProjetCollaboratif } from '../store/slices/collaborationSlice';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { SCREENS } from '../navigation/types';
import type { Projet } from '../types/projet';
import type { Collaborateur } from '../types/collaboration';
import type { OngletType } from '../hooks/useSanteLogic';
import apiClient from '../services/api/apiClient';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type RouteParams = {
  VetProjectDetail: {
    projetId: string;
  };
};

interface SectionCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  badge?: string;
  badgeColor?: string;
  requiresPermission?: string;
  readOnly?: boolean;
}

export default function VetProjectDetailScreen() {
  const { colors } = useTheme();
  const { activeRole, currentUser } = useRole();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<RouteParams, 'VetProjectDetail'>>();
  const projetId = route.params?.projetId;

  const [projet, setProjet] = useState<Projet | null>(null);
  const [collaboration, setCollaboration] = useState<Collaborateur | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Récupérer la collaboration depuis le store
  const collaborationState = useAppSelector((state) => state.collaboration);
  const collaborateurActuel = collaborationState?.collaborateurActuel;

  // Charger les données du projet
  const loadProjectData = useCallback(async () => {
    if (!projetId || !currentUser?.id) return;

    setLoading(true);
    try {
      // Sélectionner le projet dans le store (cela charge aussi la collaboration)
      const result = await dispatch(
        selectProjetCollaboratif({
          projetId,
          userId: currentUser.id,
        })
      ).unwrap();

      // Le résultat contient le projet et la collaboration
      if (result.projet) {
        setProjet(result.projet);
      }
      if (result.collaborateur) {
        setCollaboration(result.collaborateur);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      // En cas d'erreur, essayer de charger au moins le projet
      try {
        const projetData = await apiClient.get<Projet>(`/projets/${projetId}`);
        setProjet(projetData);
      } catch (projetError) {
        console.error('Erreur lors du chargement du projet (fallback):', projetError);
      }
    } finally {
      setLoading(false);
    }
  }, [projetId, currentUser?.id, dispatch]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Mettre à jour la collaboration si elle change dans le store
  useEffect(() => {
    if (collaborateurActuel && collaborateurActuel.projet_id === projetId) {
      setCollaboration(collaborateurActuel);
    }
  }, [collaborateurActuel, projetId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjectData();
    setRefreshing(false);
  }, [loadProjectData]);

  // Vérifier les permissions
  const hasPermission = (permission: string): boolean => {
    if (!collaboration?.permissions) return false;
    const perms = collaboration.permissions as Record<string, boolean>;
    return perms[permission] === true || perms.gestion_complete === true;
  };

  // Définir les sections disponibles
  const getSections = (): SectionCard[] => {
    const sections: SectionCard[] = [
      {
        id: 'cheptel',
        title: 'Cheptel',
        icon: 'paw-outline',
        screen: SCREENS.PRODUCTION,
        badge: 'Lecture seule',
        badgeColor: colors.textSecondary,
        requiresPermission: 'cheptel',
        readOnly: true,
      },
      {
        id: 'mortalites',
        title: 'Mortalités',
        icon: 'skull-outline',
        screen: SCREENS.MORTALITES,
        badge: 'Lecture seule',
        badgeColor: colors.textSecondary,
        requiresPermission: 'mortalites',
        readOnly: true,
      },
      {
        id: 'traitements',
        title: 'Traitements',
        icon: 'medical-outline',
        screen: SCREENS.SANTE,
        badge: 'Lecture seule',
        badgeColor: colors.textSecondary,
        requiresPermission: 'sante',
        readOnly: true,
      },
      {
        id: 'maladies',
        title: 'Maladies',
        icon: 'warning-outline',
        screen: SCREENS.SANTE,
        badge: 'Lecture seule',
        badgeColor: colors.textSecondary,
        requiresPermission: 'sante',
        readOnly: true,
      },
      {
        id: 'vaccinations',
        title: 'Vaccinations',
        icon: 'shield-outline',
        screen: SCREENS.SANTE,
        badge: 'Lecture seule',
        badgeColor: colors.textSecondary,
        requiresPermission: 'sante',
        readOnly: true,
      },
      {
        id: 'consultations',
        title: 'Consultations',
        icon: 'document-text-outline',
        screen: SCREENS.VET_CONSULTATIONS,
        badge: 'Mes consultations',
        badgeColor: colors.primary,
        requiresPermission: 'sante',
        readOnly: false,
      },
      {
        id: 'rapports',
        title: 'Rapports',
        icon: 'document-outline',
        screen: SCREENS.VET_REPORTS,
        badge: 'Mes rapports',
        badgeColor: colors.success,
        requiresPermission: 'sante',
        readOnly: false,
      },
      {
        id: 'traitements-prescrits',
        title: 'Traitements prescrits',
        icon: 'flask-outline',
        screen: SCREENS.VET_TREATMENTS,
        badge: 'Mes traitements',
        badgeColor: colors.warning,
        requiresPermission: 'sante',
        readOnly: false,
      },
    ];

    // Filtrer selon les permissions
    return sections.filter((section) => {
      if (!section.requiresPermission) return true;
      return hasPermission(section.requiresPermission);
    });
  };

  const sections = getSections();
  const isTablet = Dimensions.get('window').width >= 768;
  const numColumns = isTablet ? 2 : 1;

  // Naviguer vers une section
  const handleNavigateToSection = (section: SectionCard) => {
    if (section.screen === SCREENS.SANTE) {
      // ✅ Pour les sections santé, passer le paramètre initialTab pour ouvrir directement l'onglet spécifique
      const initialTabMap: Record<string, OngletType> = {
        traitements: 'traitements',
        maladies: 'maladies',
        vaccinations: 'vaccinations',
      };
      const initialTab = initialTabMap[section.id];
      
      navigation.navigate('Main' as never, {
        screen: SCREENS.SANTE,
        params: {
          initialTab: initialTab,
        },
      } as never);
    } else {
      navigation.navigate(section.screen as never, { projetId } as never);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StandardHeader
          icon="business-outline"
          title={projet?.nom || 'Projet'}
          subtitle="Sections du projet"
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!projet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StandardHeader
          icon="business-outline"
          title="Projet introuvable"
          subtitle=""
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Le projet demandé n'a pas été trouvé ou vous n'avez pas accès.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="business-outline"
        title={projet.nom}
        subtitle={projet.localisation || 'Sections du projet'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* Grille de sections */}
        <View style={styles.sectionsGrid}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => handleNavigateToSection(section)}
              activeOpacity={0.7}
              style={[
                styles.sectionCardWrapper,
                { width: isTablet ? '48%' : '100%' },
              ]}
            >
              <Card
                style={[
                  styles.sectionCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: colors.primary + '15' },
                    ]}
                  >
                    <Ionicons name={section.icon} size={32} color={colors.primary} />
                  </View>
                  {section.badge && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: section.badgeColor + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: section.badgeColor },
                        ]}
                      >
                        {section.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {section.title}
                </Text>
                {section.readOnly && (
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                    Accès en lecture seule
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  sectionCardWrapper: {
    marginBottom: SPACING.md,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    minHeight: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.xs,
  },
  readOnlyText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs / 2,
    fontStyle: 'italic',
  },
});
