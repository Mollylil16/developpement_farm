/**
 * 🏥 MODULE SANTÉ - Écran Principal
 * Navigation par onglets pour gérer tous les aspects sanitaires du cheptel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadVaccinations,
  loadMaladies,
  loadTraitements,
  loadVisitesVeterinaires,
  loadRappelsVaccinations,
  loadStatistiquesVaccinations,
  loadStatistiquesMaladies,
  loadStatistiquesTraitements,
  loadAlertesSanitaires,
} from '../store/slices/santeSlice';
import {
  selectSanteLoading,
  selectSanteAlertes,
  selectNombreAlertesCritiques,
  selectNombreAlertesElevees,
} from '../store/selectors/santeSelectors';

// Composants des onglets
import VaccinationsComponentAccordion from '../components/VaccinationsComponentAccordion';
import MaladiesComponentNew from '../components/MaladiesComponentNew';
import TraitementsComponentNew from '../components/TraitementsComponentNew';
import VeterinaireComponent from '../components/VeterinaireComponent';
import MortalitesListComponent from '../components/MortalitesListComponent';

type OngletType = 'vaccinations' | 'maladies' | 'traitements' | 'veterinaire' | 'mortalites';

export default function SanteScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  
  const { projetActif } = useAppSelector((state) => state.projet);
  const loading = useAppSelector(selectSanteLoading);
  const alertes = useAppSelector(selectSanteAlertes);
  const nombreAlertesCritiques = useAppSelector(selectNombreAlertesCritiques);
  const nombreAlertesElevees = useAppSelector(selectNombreAlertesElevees);
  
  const [ongletActif, setOngletActif] = useState<OngletType>('vaccinations');
  const [refreshing, setRefreshing] = useState(false);
  const [showAlertes, setShowAlertes] = useState(true);

  // Charger toutes les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      chargerDonnees();
    }
  }, [projetActif?.id]);

  const chargerDonnees = useCallback(() => {
    if (!projetActif?.id) return;

    dispatch(loadVaccinations(projetActif.id));
    dispatch(loadMaladies(projetActif.id));
    dispatch(loadTraitements(projetActif.id));
    dispatch(loadVisitesVeterinaires(projetActif.id));
    dispatch(loadRappelsVaccinations(projetActif.id));
    dispatch(loadStatistiquesVaccinations(projetActif.id));
    dispatch(loadStatistiquesMaladies(projetActif.id));
    dispatch(loadStatistiquesTraitements(projetActif.id));
    dispatch(loadAlertesSanitaires(projetActif.id));
  }, [projetActif?.id, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  }, [chargerDonnees]);

  const onglets = [
    {
      id: 'vaccinations' as OngletType,
      label: 'Vaccinations',
      icon: 'medical-outline',
      badge: 0,
    },
    {
      id: 'maladies' as OngletType,
      label: 'Maladies',
      icon: 'bug-outline',
      badge: 0,
    },
    {
      id: 'traitements' as OngletType,
      label: 'Traitements',
      icon: 'bandage-outline',
      badge: 0,
    },
    {
      id: 'veterinaire' as OngletType,
      label: 'Vétérinaire',
      icon: 'medkit-outline',
      badge: 0,
    },
    {
      id: 'mortalites' as OngletType,
      label: 'Mortalités',
      icon: 'pulse-outline',
      badge: 0,
    },
  ];

  const renderAlertesSection = () => {
    if (!showAlertes || alertes.length === 0) return null;

    return (
      <View style={[styles.alertesContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.alertesHeader}>
          <View style={styles.alertesTitleContainer}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <Text style={[styles.alertesTitle, { color: colors.text }]}>
              Alertes Sanitaires
            </Text>
            {nombreAlertesCritiques > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{nombreAlertesCritiques}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowAlertes(false)}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.alertesScroll}
        >
          {alertes.map((alerte, index) => (
            <View
              key={index}
              style={[
                styles.alerteCard,
                {
                  backgroundColor:
                    alerte.gravite === 'critique'
                      ? colors.error + '20'
                      : alerte.gravite === 'elevee'
                      ? colors.warning + '20'
                      : colors.info + '20',
                  borderColor:
                    alerte.gravite === 'critique'
                      ? colors.error
                      : alerte.gravite === 'elevee'
                      ? colors.warning
                      : colors.info,
                },
              ]}
            >
              <Text
                style={[
                  styles.alerteType,
                  {
                    color:
                      alerte.gravite === 'critique'
                        ? colors.error
                        : alerte.gravite === 'elevee'
                        ? colors.warning
                        : colors.info,
                  },
                ]}
              >
                {alerte.gravite.toUpperCase()}
              </Text>
              <Text style={[styles.alerteMessage, { color: colors.text }]}>
                {alerte.message}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderOnglets = () => (
    <View style={[styles.ongletsContainer, { backgroundColor: colors.surface }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ongletsContent}
      >
        {onglets.map((onglet) => (
          <TouchableOpacity
            key={onglet.id}
            style={[
              styles.onglet,
              ongletActif === onglet.id && {
                backgroundColor: colors.primary + '20',
                borderBottomColor: colors.primary,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => setOngletActif(onglet.id)}
          >
            <View style={styles.ongletIconContainer}>
              <Ionicons
                name={onglet.icon as any}
                size={24}
                color={ongletActif === onglet.id ? colors.primary : colors.textSecondary}
              />
              {onglet.badge > 0 && (
                <View style={[styles.ongletBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.ongletBadgeText}>{onglet.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.ongletLabel,
                {
                  color: ongletActif === onglet.id ? colors.primary : colors.textSecondary,
                  fontWeight: ongletActif === onglet.id ? '600' : '400',
                },
              ]}
            >
              {onglet.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContenu = () => {
    const refreshControl = (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[colors.primary]}
        tintColor={colors.primary}
      />
    );

    switch (ongletActif) {
      case 'vaccinations':
        return <VaccinationsComponentAccordion refreshControl={refreshControl} />;
      case 'maladies':
        return <MaladiesComponentNew refreshControl={refreshControl} />;
      case 'traitements':
        return <TraitementsComponentNew refreshControl={refreshControl} />;
      case 'veterinaire':
        return <VeterinaireComponent refreshControl={refreshControl} />;
      case 'mortalites':
        return <MortalitesListComponent refreshControl={refreshControl} />;
      default:
        return null;
    }
  };

  if (!projetActif) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun projet actif
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="medical" size={28} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Santé</Text>
          </View>
          {(nombreAlertesCritiques > 0 || nombreAlertesElevees > 0) && (
            <View style={styles.headerBadges}>
              {nombreAlertesCritiques > 0 && (
                <View style={[styles.headerBadge, { backgroundColor: colors.error }]}>
                  <Ionicons name="warning" size={16} color="#fff" />
                  <Text style={styles.headerBadgeText}>{nombreAlertesCritiques}</Text>
                </View>
              )}
              {nombreAlertesElevees > 0 && (
                <View style={[styles.headerBadge, { backgroundColor: colors.warning }]}>
                  <Ionicons name="alert" size={16} color="#fff" />
                  <Text style={styles.headerBadgeText}>{nombreAlertesElevees}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Alertes */}
      {renderAlertesSection()}

      {/* Onglets */}
      {renderOnglets()}

      {/* Contenu */}
      {renderContenu()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  alertesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertesScroll: {
    flexGrow: 0,
  },
  alerteCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 200,
  },
  alerteType: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  alerteMessage: {
    fontSize: 13,
  },
  ongletsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  ongletsContent: {
    paddingHorizontal: 8,
  },
  onglet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  ongletIconContainer: {
    position: 'relative',
  },
  ongletLabel: {
    fontSize: 12,
  },
  ongletBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ongletBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});

