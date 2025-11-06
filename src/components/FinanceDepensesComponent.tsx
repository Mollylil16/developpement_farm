/**
 * Composant liste des dépenses ponctuelles
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadDepensesPonctuelles, deleteDepensePonctuelle } from '../store/slices/financeSlice';
import { DepensePonctuelle } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import DepenseFormModal from './DepenseFormModal';

export default function FinanceDepensesComponent() {
  const dispatch = useAppDispatch();
  const { depensesPonctuelles, loading } = useAppSelector((state) => state.finance);
  const [selectedDepense, setSelectedDepense] = useState<DepensePonctuelle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  useEffect(() => {
    dispatch(loadDepensesPonctuelles());
  }, [dispatch]);

  const handleEdit = (depense: DepensePonctuelle) => {
    setSelectedDepense(depense);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer la dépense',
      'Êtes-vous sûr de vouloir supprimer cette dépense ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteDepensePonctuelle(id)),
        },
      ]
    );
  };

  const handleViewPhotos = (photos: string[]) => {
    setViewingPhotos(photos);
    setPhotoModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDepense(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    dispatch(loadDepensesPonctuelles());
  };

  const getCategoryLabel = (categorie: string): string => {
    const labels: Record<string, string> = {
      vaccins: 'Vaccins',
      alimentation: 'Alimentation',
      veterinaire: 'Vétérinaire',
      entretien: 'Entretien',
      equipements: 'Équipements',
      autre: 'Autre',
    };
    return labels[categorie] || categorie;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filtrer par mois actuel pour le résumé
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const depensesCeMois = depensesPonctuelles.filter((depense) => {
    const date = new Date(depense.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const totalMois = depensesCeMois.reduce((sum, dep) => sum + dep.montant, 0);

  if (loading) {
    return <LoadingSpinner message="Chargement des dépenses..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dépenses Ponctuelles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedDepense(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Résumé du mois */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Dépenses ce mois</Text>
          <Text style={styles.summaryValue}>{formatAmount(totalMois)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Nombre de dépenses</Text>
          <Text style={styles.summaryValue}>{depensesCeMois.length}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {depensesPonctuelles.length === 0 ? (
          <EmptyState
            title="Aucune dépense enregistrée"
            message="Ajoutez votre première dépense pour commencer"
            action={
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedDepense(null);
                  setIsEditing(false);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Ajouter une dépense</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          depensesPonctuelles.map((depense) => (
            <View key={depense.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{getCategoryLabel(depense.categorie)}</Text>
                  <Text style={styles.cardDate}>{formatDate(depense.date)}</Text>
                </View>
                <View style={styles.cardActions}>
                  {depense.photos && depense.photos.length > 0 && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewPhotos(depense.photos!)}
                    >
                      <Text style={styles.actionButtonText}>📷</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(depense)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(depense.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.amountRow}>
                  <Text style={styles.amount}>{formatAmount(depense.montant)}</Text>
                </View>
                {depense.libelle_categorie && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Libellé:</Text>
                    <Text style={styles.infoValue}>{depense.libelle_categorie}</Text>
                  </View>
                )}
                {depense.commentaire && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Commentaire:</Text>
                    <Text style={styles.commentText}>{depense.commentaire}</Text>
                  </View>
                )}
                {depense.photos && depense.photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosLabel}>
                      {depense.photos.length} photo{depense.photos.length > 1 ? 's' : ''} de reçu
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <DepenseFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        depense={selectedDepense}
        isEditing={isEditing}
      />

      {/* Modal pour voir les photos */}
      {photoModalVisible && (
        <View style={styles.photoModal}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Photos du reçu</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Text style={styles.photoModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal pagingEnabled>
              {viewingPhotos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photoImage}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
          </View>
        </View>
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
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
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
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
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
  amountRow: {
    marginBottom: SPACING.sm,
  },
  amount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
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
  commentContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  photosContainer: {
    marginTop: SPACING.sm,
  },
  photosLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  photoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photoModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  photoModalClose: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  photoImage: {
    width: 300,
    height: 400,
  },
});

