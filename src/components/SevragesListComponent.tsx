/**
 * Composant liste des sevrages
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadSevrages, deleteSevrage, createSevrage } from '../store/slices/reproductionSlice';
import { Sevrage, Gestation } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import CustomModal from './CustomModal';
import FormField from './FormField';

export default function SevragesListComponent() {
  const dispatch = useAppDispatch();
  const { sevrages, gestations } = useAppSelector((state) => state.reproduction);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGestation, setSelectedGestation] = useState<Gestation | null>(null);
  const [formData, setFormData] = useState({
    date_sevrage: new Date().toISOString().split('T')[0],
    nombre_porcelets_sevres: 0,
    poids_moyen_sevrage: 0,
    notes: '',
  });

  useEffect(() => {
    dispatch(loadSevrages());
  }, [dispatch]);

  const gestationsTerminees = gestations.filter((g) => g.statut === 'terminee');

  const handleCreateSevrage = (gestation: Gestation) => {
    setSelectedGestation(gestation);
    setFormData({
      date_sevrage: new Date().toISOString().split('T')[0],
      nombre_porcelets_sevres: gestation.nombre_porcelets_reel || gestation.nombre_porcelets_prevu,
      poids_moyen_sevrage: 0,
      notes: '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedGestation) return;
    
    if (formData.nombre_porcelets_sevres <= 0) {
      Alert.alert('Erreur', 'Le nombre de porcelets sevrés doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createSevrage({
          gestation_id: selectedGestation.id,
          date_sevrage: formData.date_sevrage,
          nombre_porcelets_sevres: formData.nombre_porcelets_sevres,
          poids_moyen_sevrage: formData.poids_moyen_sevrage || undefined,
          notes: formData.notes || undefined,
        })
      ).unwrap();
      
      setModalVisible(false);
      setSelectedGestation(null);
      dispatch(loadSevrages());
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la création du sevrage');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer le sevrage',
      'Êtes-vous sûr de vouloir supprimer ce sevrage ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteSevrage(id)),
        },
      ]
    );
  };

  const getGestationNom = (gestationId: string) => {
    const gestation = gestations.find((g) => g.id === gestationId);
    return gestation?.truie_nom || gestation?.truie_id || 'Inconnue';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filtrer les sevrages du mois actuel
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const sevragesCeMois = sevrages.filter((s) => {
    const date = new Date(s.date_sevrage);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  if (loading) {
    return <LoadingSpinner message="Chargement des sevrages..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sevrages</Text>
        <Text style={styles.subtitle}>{sevragesCeMois.length} ce mois</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {gestationsTerminees.length === 0 && sevrages.length === 0 ? (
          <EmptyState
            title="Aucun sevrage"
            message="Les sevrages seront disponibles après les mises bas terminées"
          />
        ) : (
          <>
            {gestationsTerminees.length > 0 && sevrages.length === 0 && (
              <View style={styles.actionSection}>
                <Text style={styles.actionSectionTitle}>
                  Gestations terminées disponibles pour sevrage:
                </Text>
                {gestationsTerminees.map((gestation) => {
                  const hasSevrage = sevrages.some((s) => s.gestation_id === gestation.id);
                  if (hasSevrage) return null;
                  
                  return (
                    <TouchableOpacity
                      key={gestation.id}
                      style={styles.gestationCard}
                      onPress={() => handleCreateSevrage(gestation)}
                    >
                      <Text style={styles.gestationCardTitle}>
                        {gestation.truie_nom || gestation.truie_id}
                      </Text>
                      <Text style={styles.gestationCardSubtitle}>
                        {gestation.nombre_porcelets_reel || gestation.nombre_porcelets_prevu}{' '}
                        porcelets
                      </Text>
                      <Text style={styles.gestationCardButton}>+ Enregistrer le sevrage</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {sevrages.map((sevrage) => (
              <View key={sevrage.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {getGestationNom(sevrage.gestation_id)}
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(sevrage.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date de sevrage:</Text>
                    <Text style={styles.infoValue}>{formatDate(sevrage.date_sevrage)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nombre de porcelets sevrés:</Text>
                    <Text style={styles.infoValue}>{sevrage.nombre_porcelets_sevres}</Text>
                  </View>
                  {sevrage.poids_moyen_sevrage && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Poids moyen:</Text>
                      <Text style={styles.infoValue}>{sevrage.poids_moyen_sevrage} kg</Text>
                    </View>
                  )}
                  {sevrage.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{sevrage.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal de création de sevrage */}
      {selectedGestation && (
        <CustomModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedGestation(null);
          }}
          title="Nouveau sevrage"
          confirmText="Enregistrer"
          onConfirm={handleSubmit}
          showButtons={true}
        >
          <ScrollView style={styles.scrollView}>
            <Text style={styles.modalLabel}>
              Truie: {selectedGestation.truie_nom || selectedGestation.truie_id}
            </Text>
            <FormField
              label="Date de sevrage *"
              value={formData.date_sevrage}
              onChangeText={(text) => setFormData({ ...formData, date_sevrage: text })}
              placeholder="YYYY-MM-DD"
              required
            />
            <FormField
              label="Nombre de porcelets sevrés *"
              value={formData.nombre_porcelets_sevres.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  nombre_porcelets_sevres: parseInt(text) || 0,
                })
              }
              placeholder="0"
              keyboardType="numeric"
              required
            />
            <FormField
              label="Poids moyen (kg)"
              value={formData.poids_moyen_sevrage.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  poids_moyen_sevrage: parseFloat(text) || 0,
                })
              }
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <FormField
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Notes supplémentaires..."
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </CustomModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  actionSection: {
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
  },
  actionSectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  gestationCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  gestationCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  gestationCardSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  gestationCardButton: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  modalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
});

