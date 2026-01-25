/**
 * Écran "Consultations" pour un projet spécifique (profil vétérinaire)
 * - Bouton "Ajouter" : ouvre le modal d'enregistrement de visite (même que Santé > Vétérinaire > Historique des visites)
 * - Historique des visites vétérinaires du projet (timeline, détails repliables, modifier, supprimer)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectProjetCollaboratif } from '../store/slices/collaborationSlice';
import {
  loadVisitesVeterinaires,
  deleteVisiteVeterinaire,
} from '../store/slices/santeSlice';
import { selectAllVisitesVeterinaires } from '../store/selectors/santeSelectors';
import { formatDisplayDate } from '../utils/dateUtils';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import StandardHeader from '../components/StandardHeader';
import VisiteVeterinaireFormModalNew from '../components/VisiteVeterinaireFormModalNew';
import type { VisiteVeterinaire } from '../types/sante';

type RouteParams = {
  VetConsultations: {
    projetId: string;
  };
};

export default function VetConsultationsScreen() {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<RouteParams, 'VetConsultations'>>();
  const projetId = route.params?.projetId;

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [visiteSelectionnee, setVisiteSelectionnee] = useState<VisiteVeterinaire | null>(null);
  const [visiteDetailsOuverte, setVisiteDetailsOuverte] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const allVisites = useAppSelector(selectAllVisitesVeterinaires);
  const visitesHistorique = useMemo(() => {
    return [...(allVisites || [])]
      .filter((v) => !projetId || v.projet_id === projetId)
      .sort((a, b) => new Date(b.date_visite).getTime() - new Date(a.date_visite).getTime());
  }, [allVisites, projetId]);

  const loadData = useCallback(async () => {
    if (!projetId) return;
    await dispatch(loadVisitesVeterinaires(projetId)).unwrap();
  }, [projetId, dispatch]);

  // Projet collaboratif et chargement des visites
  useEffect(() => {
    if (projetId && currentUser?.id) {
      dispatch(selectProjetCollaboratif({ projetId, userId: currentUser.id }));
    }
    loadData();
  }, [projetId, currentUser?.id, dispatch, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const toggleDetailsVisite = useCallback((visiteId: string) => {
    setVisiteDetailsOuverte((prev) => (prev === visiteId ? null : visiteId));
  }, []);

  const handleModifierVisite = useCallback((visite: VisiteVeterinaire) => {
    setVisiteSelectionnee(visite);
    setAddModalVisible(false);
  }, []);

  const handleSupprimerVisite = useCallback(
    (visite: VisiteVeterinaire) => {
      Alert.alert(
        'Supprimer la visite',
        `Êtes-vous sûr de vouloir supprimer la visite du ${formatDisplayDate(visite.date_visite)} ?\n\nCette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deleteVisiteVeterinaire(visite.id)).unwrap();
                Alert.alert('Succès', 'Visite supprimée avec succès');
              } catch (e: unknown) {
                Alert.alert('Erreur', (e as Error)?.message || 'Erreur lors de la suppression');
              }
            },
          },
        ]
      );
    },
    [dispatch]
  );

  const closeModal = useCallback(() => {
    setAddModalVisible(false);
    setVisiteSelectionnee(null);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StandardHeader
        icon="document-text-outline"
        title="Consultations"
        subtitle="Consultations du projet"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête Historique + bouton Ajouter */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique des visites</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setVisiteSelectionnee(null);
              setAddModalVisible(true);
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <VisiteVeterinaireFormModalNew
          visible={addModalVisible || !!visiteSelectionnee}
          visite={visiteSelectionnee || undefined}
          onClose={closeModal}
        />

        {visitesHistorique.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
              Aucune visite enregistrée
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {visitesHistorique.map((visite, index) => {
              const detailsOuverts = visiteDetailsOuverte === visite.id;
              return (
                <View key={visite.id} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  {index < visitesHistorique.length - 1 ? (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  ) : null}
                  <View
                    style={[
                      styles.visiteCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderLight,
                        ...(colors.shadow?.small || {}),
                      },
                    ]}
                  >
                    <View style={styles.visiteHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.visiteDate, { color: colors.text }]}>
                          {formatDisplayDate(visite.date_visite)}
                        </Text>
                        <Text style={[styles.visiteVeto, { color: colors.textSecondary }]}>
                          👨‍⚕️ {visite.veterinaire || 'Vétérinaire'}
                        </Text>
                      </View>
                      <View style={styles.visiteHeaderRight}>
                        <View
                          style={[styles.visiteTypeBadge, { backgroundColor: colors.primary + '20' }]}
                        >
                          <Text style={[styles.visiteTypeText, { color: colors.primary }]}>
                            {visite.motif || 'Consultation'}
                          </Text>
                        </View>
                        <View style={styles.visiteActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                            onPress={() => handleModifierVisite(visite)}
                          >
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.error + '15' }]}
                            onPress={() => handleSupprimerVisite(visite)}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {visite.animaux_examines ? (
                      <View style={styles.visiteSection}>
                        <View style={styles.visiteSectionHeader}>
                          <Ionicons name="paw" size={14} color={colors.info} />
                          <Text style={[styles.visiteSectionTitle, { color: colors.info }]}>
                            Sujet(s) examiné(s)
                          </Text>
                        </View>
                        <Text style={[styles.visiteSectionText, { color: colors.text }]}>
                          {visite.animaux_examines}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.toggleDetailsBtn, { backgroundColor: colors.background }]}
                      onPress={() => toggleDetailsVisite(visite.id)}
                    >
                      <Text style={[styles.toggleDetailsText, { color: colors.primary }]}>
                        {detailsOuverts ? 'Masquer les détails' : 'Voir les détails'}
                      </Text>
                      <Ionicons
                        name={detailsOuverts ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    {detailsOuverts ? (
                      <View style={styles.detailsContainer}>
                        {visite.diagnostic ? (
                          <View style={styles.visiteSection}>
                            <View style={styles.visiteSectionHeader}>
                              <Ionicons name="medical" size={14} color={colors.warning} />
                              <Text style={[styles.visiteSectionTitle, { color: colors.warning }]}>
                                Diagnostic
                              </Text>
                            </View>
                            <Text style={[styles.visiteSectionText, { color: colors.text }]}>
                              {visite.diagnostic}
                            </Text>
                          </View>
                        ) : null}

                        {visite.prescriptions ? (
                          <View style={styles.visiteSection}>
                            <View style={styles.visiteSectionHeader}>
                              <Ionicons name="flask" size={14} color={colors.success} />
                              <Text style={[styles.visiteSectionTitle, { color: colors.success }]}>
                                Produits administrés
                              </Text>
                            </View>
                            <Text style={[styles.visiteSectionText, { color: colors.text }]}>
                              {visite.prescriptions}
                            </Text>
                          </View>
                        ) : null}

                        {visite.recommandations ? (
                          <View
                            style={[
                              styles.visiteSection,
                              styles.recommandationsSection,
                              { backgroundColor: colors.primary + '08' },
                            ]}
                          >
                            <View style={styles.visiteSectionHeader}>
                              <Ionicons name="bulb" size={14} color={colors.primary} />
                              <Text style={[styles.visiteSectionTitle, { color: colors.primary }]}>
                                Recommandations & Feedback
                              </Text>
                            </View>
                            <Text style={[styles.visiteSectionText, { color: colors.text }]}>
                              {visite.recommandations}
                            </Text>
                          </View>
                        ) : null}

                        {visite.notes ? (
                          <View style={styles.visiteSection}>
                            <View style={styles.visiteSectionHeader}>
                              <Ionicons
                                name="chatbox-ellipses-outline"
                                size={14}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[styles.visiteSectionTitle, { color: colors.textSecondary }]}
                              >
                                Notes additionnelles
                              </Text>
                            </View>
                            <Text style={[styles.visiteNotes, { color: colors.textSecondary }]}>
                              {visite.notes}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.visiteFooter}>
                          {visite.cout != null ? (
                            <View style={styles.visiteCout}>
                              <Ionicons name="cash-outline" size={16} color={colors.success} />
                              <Text style={[styles.visiteCoutText, { color: colors.success }]}>
                                {visite.cout.toLocaleString()} F CFA
                              </Text>
                            </View>
                          ) : null}
                          {visite.prochaine_visite ? (
                            <View
                              style={[
                                styles.prochainVisiteBadge,
                                { backgroundColor: colors.info + '15' },
                              ]}
                            >
                              <Ionicons name="calendar" size={14} color={colors.info} />
                              <Text style={[styles.prochainVisiteText, { color: colors.info }]}>
                                Prochaine: {formatDisplayDate(visite.prochaine_visite)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FFF',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptySectionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
  timeline: {
    paddingLeft: SPACING.md,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: SPACING.lg,
    marginBottom: SPACING.md,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    width: 1,
    bottom: -SPACING.md,
  },
  visiteCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  visiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  visiteHeaderRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  visiteActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visiteDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  visiteVeto: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  visiteTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  visiteTypeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  visiteSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  visiteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  visiteSectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  visiteSectionText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    marginLeft: 18,
  },
  toggleDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  toggleDetailsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  recommandationsSection: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  visiteNotes: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  visiteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  visiteCout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  visiteCoutText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  prochainVisiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  prochainVisiteText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});
