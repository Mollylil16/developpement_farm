/**
 * VeterinaireComponent - Gestion complète du suivi vétérinaire
 * - Carte info vétérinaire (depuis Collaborations)
 * - Historique des visites
 * - Planning des visites à venir avec périodicité
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControlProps,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { selectAllCollaborateurs } from '../store/selectors/collaborationSelectors';
import { selectAllVisitesVeterinaires } from '../store/selectors/santeSelectors';
import {
  loadVisitesVeterinaires,
  createVisiteVeterinaire,
  updateVisiteVeterinaire,
  deleteVisiteVeterinaire,
} from '../store/slices/santeSlice';
import { loadCollaborateurs } from '../store/slices/collaborationSlice';
import { formatDisplayDate, getCurrentLocalDate, addDays } from '../utils/dateUtils';
import { VisiteVeterinaire, CreateVisiteVeterinaireInput } from '../types/sante';
import VisiteVeterinaireFormModalNew from './VisiteVeterinaireFormModalNew';
import SearchVetModal from './SearchVetModal';
import Button from './Button';
import { SCREENS } from '../navigation/types';
import { Veterinarian } from '../types/veterinarian';

interface VeterinaireComponentProps {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

type TypeIntervention =
  | 'traitement_vaccinal'
  | 'soin_malade'
  | 'consultation_generale'
  | 'prophylaxie_masse'
  | 'autre';

type Periodicite = 'hebdomadaire' | 'bimensuel' | 'mensuel' | 'trimestriel' | 'personnalise';

const TYPE_INTERVENTION_LABELS: Record<TypeIntervention, string> = {
  traitement_vaccinal: 'Traitement vaccinal',
  soin_malade: 'Soin sujet malade',
  consultation_generale: 'Consultation générale',
  prophylaxie_masse: 'Prophylaxie de masse',
  autre: 'Autre',
};

const PERIODICITE_LABELS: Record<Periodicite, string> = {
  hebdomadaire: 'Hebdomadaire',
  bimensuel: 'Bimensuel (2 semaines)',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  personnalise: 'Personnalisé',
};

const PERIODICITE_JOURS: Record<Periodicite, number> = {
  hebdomadaire: 7,
  bimensuel: 14,
  mensuel: 30,
  trimestriel: 90,
  personnalise: 0,
};

function VeterinaireComponent({ refreshControl }: VeterinaireComponentProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<unknown>();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const collaborateurs = useAppSelector((state) => selectAllCollaborateurs(state));
  const visites = useAppSelector((state) => selectAllVisitesVeterinaires(state));

  const [showModalVisite, setShowModalVisite] = useState(false);
  const [showModalPlanning, setShowModalPlanning] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [visiteSelectionnee, setVisiteSelectionnee] = useState<VisiteVeterinaire | null>(null);
  const [visiteDetailsOuverte, setVisiteDetailsOuverte] = useState<string | null>(null);
  const [modeEdition, setModeEdition] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // États planning
  const [periodicite, setPeriodicite] = useState<Periodicite>('mensuel');
  const [dateDebut, setDateDebut] = useState(new Date());
  const [heureVisite, setHeureVisite] = useState('09:00');
  const [typeInterventionDefaut, setTypeInterventionDefaut] =
    useState<TypeIntervention>('consultation_generale');
  const [planningGenere, setPlanningGenere] = useState<
    Array<{
      date: Date;
      type: TypeIntervention;
      statut: 'a_venir' | 'confirmee' | 'reportee';
    }>
  >([]);

  // Charger les données
  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadCollaborateurs(projetActif.id));
      dispatch(loadVisitesVeterinaires(projetActif.id));
    }
  }, [projetActif?.id, dispatch]);

  // Trouver le vétérinaire du projet
  const veterinaire = useMemo(() => {
    return (collaborateurs || []).find((c) => c.role === 'veterinaire' && c.statut === 'actif');
  }, [collaborateurs]);

  // Historique des visites (triées par date décroissante)
  const visitesHistorique = useMemo(() => {
    return [...(visites || [])].sort(
      (a, b) => new Date(b.date_visite).getTime() - new Date(a.date_visite).getTime()
    );
  }, [visites]);

  // Visites à venir (30 prochains jours)
  const visitesAVenir = useMemo(() => {
    const maintenant = new Date();
    const dans30Jours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000);

    return planningGenere
      .filter((v) => {
        const dateVisite = v.date;
        return dateVisite >= maintenant && dateVisite <= dans30Jours;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [planningGenere]);

  // Générer le planning
  const handleGenererPlanning = useCallback(async () => {
    if (periodicite === 'personnalise') {
      Alert.alert(
        'Info',
        'La périodicité personnalisée nécessite de configurer les dates manuellement.'
      );
      return;
    }

    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    const joursIntervalle = PERIODICITE_JOURS[periodicite];
    const planning: typeof planningGenere = [];
    let dateActuelle = new Date(dateDebut);

    // Générer pour les 6 prochains mois
    const dateFin = new Date(dateActuelle.getTime() + 180 * 24 * 60 * 60 * 1000);

    while (dateActuelle <= dateFin) {
      planning.push({
        date: new Date(dateActuelle),
        type: typeInterventionDefaut,
        statut: 'a_venir',
      });
      dateActuelle = new Date(dateActuelle.getTime() + joursIntervalle * 24 * 60 * 60 * 1000);
    }

    // Créer les visites vétérinaires dans la base de données
    try {
      for (const item of planning) {
        // Combiner date et heure
        const [heures, minutes] = heureVisite.split(':').map(Number);
        const dateVisite = new Date(item.date);
        dateVisite.setHours(heures, minutes, 0, 0);

        const input: CreateVisiteVeterinaireInput = {
          projet_id: projetActif.id,
          date_visite: dateVisite.toISOString(),
          veterinaire: veterinaire ? `${veterinaire.prenom} ${veterinaire.nom}` : 'Vétérinaire',
          motif: TYPE_INTERVENTION_LABELS[item.type] || 'Consultation générale',
          cout: 0,
          notes: `Visite ${PERIODICITE_LABELS[periodicite].toLowerCase()} générée automatiquement`,
        };

        await dispatch(createVisiteVeterinaire(input)).unwrap();
      }

      setPlanningGenere(planning);

      // Réinitialiser les champs après succès
      setDateDebut(new Date());
      setHeureVisite('09:00');
      setPeriodicite('mensuel');
      setShowModalPlanning(false);

      Alert.alert(
        'Succès',
        `Planning créé avec succès !\n\n${planning.length} visites vétérinaires ont été créées sur 6 mois.`
      );
    } catch (error: unknown) {
      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de créer le planning. Vérifiez vos données et réessayez.'
      );
    }
  }, [
    periodicite,
    dateDebut,
    typeInterventionDefaut,
    heureVisite,
    projetActif,
    veterinaire,
    dispatch,
  ]);

  // Modifier une visite
  const handleModifierVisite = useCallback((visite: VisiteVeterinaire) => {
    setVisiteSelectionnee(visite);
    setModeEdition(true);
    setShowModalVisite(true);
  }, []);

  // Supprimer une visite
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
              } catch (error: unknown) {
                Alert.alert('Erreur', error || 'Erreur lors de la suppression de la visite');
              }
            },
          },
        ]
      );
    },
    [dispatch]
  );

  // Toggle détails d'une visite
  const toggleDetailsVisite = useCallback((visiteId: string) => {
    setVisiteDetailsOuverte((prev) => (prev === visiteId ? null : visiteId));
  }, []);

  // Retirer le vétérinaire
  const handleRetirerVeterinaire = useCallback(() => {
    if (!veterinaire) return;

    Alert.alert(
      'Retirer le vétérinaire',
      `Êtes-vous sûr de vouloir retirer ${veterinaire.prenom} ${veterinaire.nom} du projet ?\n\nCette action supprimera ses permissions vétérinaires.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            // TODO: Implémenter la logique de retrait
            Alert.alert('Info', 'Fonctionnalité à implémenter');
          },
        },
      ]
    );
  }, [veterinaire]);

  // Render Carte Info Vétérinaire
  const renderCarteVeterinaire = () => {
    if (!veterinaire) {
      return (
        <View
          style={[
            styles.carteVeto,
            styles.carteVetoEmpty,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              ...colors.shadow.medium,
            },
          ]}
        >
          <View style={styles.emptyVeto}>
            <Ionicons name="person-add-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyVetoText, { color: colors.text }]}>
              Aucun vétérinaire assigné
            </Text>
            <Text style={[styles.emptyVetoSubtext, { color: colors.textSecondary }]}>
              Invitez un vétérinaire pour assurer le suivi sanitaire de votre cheptel
            </Text>
            <View style={styles.buttonGroup}>
              <Button
                title="Inviter un vétérinaire"
                onPress={() => {
                  navigation.navigate(SCREENS.COLLABORATION, {
                    preselectedRole: 'veterinaire',
                  });
                }}
                icon={<Ionicons name="person-add" size={20} color={colors.background} />}
                style={styles.inviteButton}
              />
              <Button
                title="Rechercher un vétérinaire"
                onPress={() => {
                  console.log(
                    '🔍 [VeterinaireComponent] Bouton recherche cliqué, ouverture modal...'
                  );
                  setShowSearchModal(true);
                }}
                variant="outline"
                icon={<Ionicons name="search" size={20} color={colors.primary} />}
                style={styles.searchButton}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.carteVeto,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...colors.shadow.medium,
          },
        ]}
      >
        <View style={styles.vetoHeader}>
          <View style={styles.vetoAvatar}>
            {veterinaire.photo ? (
              <Image source={{ uri: veterinaire.photo }} style={styles.vetoAvatarImage} />
            ) : (
              <View style={[styles.vetoAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.vetoAvatarInitiales}>
                  {veterinaire.prenom[0]}
                  {veterinaire.nom[0]}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.vetoInfo}>
            <Text style={[styles.vetoNom, { color: colors.text }]}>
              Dr. {veterinaire.prenom} {veterinaire.nom}
            </Text>
            <View style={[styles.vetoBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="medical" size={12} color="#FFF" />
              <Text style={styles.vetoBadgeText}>Vétérinaire du projet</Text>
            </View>
          </View>
        </View>

        <View style={styles.vetoContact}>
          <View style={styles.vetoContactItem}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.vetoContactText, { color: colors.text }]}>
              {veterinaire.telephone || 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.vetoContactItem}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.vetoContactText, { color: colors.text }]}>
              {veterinaire.email || 'Non renseigné'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnRetirer, { borderColor: colors.error }]}
          onPress={handleRetirerVeterinaire}
        >
          <Ionicons name="person-remove-outline" size={18} color={colors.error} />
          <Text style={[styles.btnRetirerText, { color: colors.error }]}>Retirer du projet</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render Historique
  const renderHistorique = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...colors.shadow.medium,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique des visites</Text>
        <TouchableOpacity
          style={[styles.btnAjouter, { backgroundColor: colors.primary }]}
          onPress={() => {
            setVisiteSelectionnee(null);
            setModeEdition(false);
            setShowModalVisite(true);
          }}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.btnAjouterText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Ajouter/Modifier Visite */}
      <VisiteVeterinaireFormModalNew
        visible={showModalVisite}
        visite={visiteSelectionnee}
        isEditing={modeEdition}
        onClose={() => {
          setShowModalVisite(false);
          setVisiteSelectionnee(null);
          setModeEdition(false);
        }}
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
                {index < visitesHistorique.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                )}
                <View
                  style={[
                    styles.visiteCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      ...colors.shadow.small,
                    },
                  ]}
                >
                  {/* En-tête avec date, vétérinaire et actions */}
                  <View style={styles.visiteHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.visiteDate, { color: colors.text }]}>
                        {formatDisplayDate(visite.date_visite)}
                      </Text>
                      <Text style={[styles.visiteVeto, { color: colors.textSecondary }]}>
                        👨‍⚕️ Dr. {visite.veterinaire}
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

                  {/* Animaux examinés - Toujours visible */}
                  {visite.animaux_examines && (
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
                  )}

                  {/* Bouton Voir détails / Masquer détails */}
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

                  {/* Détails extensibles */}
                  {detailsOuverts && (
                    <View style={styles.detailsContainer}>
                      {/* Diagnostic */}
                      {visite.diagnostic && (
                        <View style={styles.visiteSection}>
                          <View style={styles.visiteSectionHeader}>
                            <Ionicons name="medical" size={14} color={colors.warning} />
                            <Text style={[styles.visiteSectionTitle, { color: colors.warning }]}>
                              Diagnostic du vétérinaire
                            </Text>
                          </View>
                          <Text style={[styles.visiteSectionText, { color: colors.text }]}>
                            {visite.diagnostic}
                          </Text>
                        </View>
                      )}

                      {/* Prescriptions / Produits administrés */}
                      {visite.prescriptions && (
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
                      )}

                      {/* Recommandations du vétérinaire */}
                      {visite.recommandations && (
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
                      )}

                      {/* Notes supplémentaires */}
                      {visite.notes && (
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
                      )}

                      {/* Footer: Coût et prochaine visite */}
                      <View style={styles.visiteFooter}>
                        {visite.cout && (
                          <View style={styles.visiteCout}>
                            <Ionicons name="cash-outline" size={16} color={colors.success} />
                            <Text style={[styles.visiteCoutText, { color: colors.success }]}>
                              {visite.cout.toLocaleString()} F CFA
                            </Text>
                          </View>
                        )}
                        {visite.prochaine_visite && (
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
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // Render Planning
  const renderPlanning = () => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...colors.shadow.medium,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={24} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Planning à venir</Text>
        <TouchableOpacity
          style={[styles.btnConfig, { backgroundColor: colors.primary }]}
          onPress={() => setShowModalPlanning(!showModalPlanning)}
        >
          <Ionicons name="settings-outline" size={20} color="#FFF" />
          <Text style={styles.btnConfigText}>Config</Text>
        </TouchableOpacity>
      </View>

      {/* Configuration Planning (collapsible) */}
      {showModalPlanning && (
        <View
          style={[
            styles.configPlanning,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.configLabel, { color: colors.text }]}>Périodicité</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.periodiciteScroll}
          >
            {(Object.keys(PERIODICITE_LABELS) as Periodicite[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.periodiciteChip,
                  { borderColor: colors.border },
                  periodicite === key && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setPeriodicite(key)}
              >
                <Text
                  style={[
                    styles.periodiciteChipText,
                    { color: periodicite === key ? '#FFF' : colors.text },
                  ]}
                >
                  {PERIODICITE_LABELS[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.configLabel, { color: colors.text }]}>Date de début</Text>
          <TouchableOpacity
            style={[
              styles.datePickerButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.datePickerText, { color: colors.text }]}>
              {dateDebut.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateDebut}
              mode="date"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowDatePicker(false);
                if (date && event.type !== 'dismissed') {
                  setDateDebut(date);
                }
              }}
            />
          )}

          <Text style={[styles.configLabel, { color: colors.text }]}>Heure prévue</Text>
          <TouchableOpacity
            style={[
              styles.datePickerButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.datePickerText, { color: colors.text }]}>{heureVisite}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const [heures, minutes] = heureVisite.split(':').map(Number);
                const date = new Date();
                date.setHours(heures, minutes, 0, 0);
                return date;
              })()}
              mode="time"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowTimePicker(false);
                if (date && event.type !== 'dismissed') {
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  setHeureVisite(`${hours}:${minutes}`);
                }
              }}
            />
          )}

          <Text style={[styles.configLabel, { color: colors.text }]}>
            Type d'intervention par défaut
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {(Object.keys(TYPE_INTERVENTION_LABELS) as TypeIntervention[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.typeChip,
                  { borderColor: colors.border },
                  typeInterventionDefaut === key && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setTypeInterventionDefaut(key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: typeInterventionDefaut === key ? '#FFF' : colors.text },
                  ]}
                >
                  {TYPE_INTERVENTION_LABELS[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.btnGenerer, { backgroundColor: colors.success }]}
            onPress={handleGenererPlanning}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.btnGenererText}>Générer le planning</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste des visites à venir */}
      {visitesAVenir.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="calendar-clear-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
            Aucune visite planifiée
          </Text>
          <Text style={[styles.emptySectionSubtext, { color: colors.textSecondary }]}>
            Configurez la périodicité pour générer un planning
          </Text>
        </View>
      ) : (
        <View style={styles.planningList}>
          {visitesAVenir.map((visite, index) => {
            const maintenant = new Date();
            const joursRestants = Math.ceil(
              (visite.date.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)
            );
            const estProche = joursRestants <= 7;

            return (
              <View
                key={index}
                style={[
                  styles.planningCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: estProche ? colors.warning : colors.borderLight,
                    ...colors.shadow.small,
                  },
                  estProche && { borderWidth: 2 },
                ]}
              >
                <View style={styles.planningHeader}>
                  <View>
                    <Text style={[styles.planningDate, { color: colors.text }]}>
                      {formatDisplayDate(visite.date.toISOString().split('T')[0])}
                    </Text>
                    <Text style={[styles.planningHeure, { color: colors.textSecondary }]}>
                      {heureVisite}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.planningStatutBadge,
                      {
                        backgroundColor:
                          visite.statut === 'confirmee'
                            ? colors.success
                            : visite.statut === 'reportee'
                              ? colors.warning
                              : colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.planningStatutText}>
                      {visite.statut === 'confirmee'
                        ? 'Confirmée'
                        : visite.statut === 'reportee'
                          ? 'Reportée'
                          : 'À venir'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.planningType, { color: colors.textSecondary }]}>
                  {TYPE_INTERVENTION_LABELS[visite.type]}
                </Text>
                {estProche && (
                  <View style={[styles.rappelBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="notifications" size={16} color={colors.warning} />
                    <Text style={[styles.rappelText, { color: colors.warning }]}>
                      Dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // Handler pour inviter un vétérinaire depuis la recherche
  const handleInviteVet = useCallback(
    (vet: Veterinarian) => {
      // Rediriger vers Collaborations avec les infos préchargées
      navigation.navigate(SCREENS.COLLABORATION, {
        preselectedRole: 'veterinaire',
        suggestedVet: {
          name: `${vet.firstName} ${vet.lastName}`,
          phone: vet.phone,
          email: vet.email,
        },
      });
    },
    [navigation]
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {renderCarteVeterinaire()}
        {renderHistorique()}
        {renderPlanning()}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal Recherche Vétérinaire */}
      <SearchVetModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onInvite={handleInviteVet}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  // Carte Vétérinaire
  carteVeto: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  carteVetoEmpty: {
    alignItems: 'center',
  },
  emptyVeto: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyVetoText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyVetoSubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.lg,
  },
  btnInviter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  btnInviterText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  vetoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  vetoAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  vetoAvatarImage: {
    width: '100%',
    height: '100%',
  },
  vetoAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vetoAvatarInitiales: {
    color: '#FFF',
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  vetoInfo: {
    flex: 1,
  },
  vetoNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  vetoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  vetoBadgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  vetoContact: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  vetoContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  vetoContactText: {
    fontSize: FONT_SIZES.md,
  },
  btnRetirer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  btnRetirerText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },

  // Sections
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    flex: 1,
  },
  btnAjouter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  btnAjouterText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  btnConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  btnConfigText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
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
  emptySectionSubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Timeline Historique
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
  visiteTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  visiteTypeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
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
  visiteDiagnostic: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  visiteVeto: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
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

  // Configuration Planning
  configPlanning: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  configLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  periodiciteScroll: {
    marginBottom: SPACING.sm,
  },
  periodiciteChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  periodiciteChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  datePickerText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  typeScroll: {
    marginBottom: SPACING.sm,
  },
  typeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  typeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  btnGenerer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  btnGenererText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },

  // Planning Liste
  planningList: {
    gap: SPACING.sm,
  },
  planningCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  planningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  planningDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  planningHeure: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  planningStatutBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  planningStatutText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  planningType: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  rappelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  rappelText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: '100%',
  },
  inviteButton: {
    flex: 1,
  },
  searchButton: {
    flex: 1,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(VeterinaireComponent);
