/**
 * Composant liste des dépenses ponctuelles
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadDepensesPonctuelles, deleteDepensePonctuelle } from '../store/slices/financeSlice';
import { DepensePonctuelle } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import DepenseFormModal from './DepenseFormModal';

export default function FinanceDepensesComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { depensesPonctuelles, loading } = useAppSelector((state) => state.finance);
  const [selectedDepense, setSelectedDepense] = useState<DepensePonctuelle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [displayedDepenses, setDisplayedDepenses] = useState<DepensePonctuelle[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    dispatch(loadDepensesPonctuelles());
  }, [dispatch]);

  // Pagination: charger les premières dépenses
  useEffect(() => {
    const initial = depensesPonctuelles.slice(0, ITEMS_PER_PAGE);
    setDisplayedDepenses(initial);
    setPage(1);
  }, [depensesPonctuelles.length]);

  // Charger plus de dépenses
  const loadMore = useCallback(() => {
    if (displayedDepenses.length >= depensesPonctuelles.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = depensesPonctuelles.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedDepenses((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedDepenses.length, depensesPonctuelles]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Dépenses Ponctuelles</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedDepense(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Résumé du mois */}
      <View style={[styles.summary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Dépenses ce mois</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatAmount(totalMois)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Nombre de dépenses</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{depensesCeMois.length}</Text>
        </View>
      </View>

      {depensesPonctuelles.length === 0 ? (
        <EmptyState
          title="Aucune dépense enregistrée"
          message="Ajoutez votre première dépense pour commencer"
          action={
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedDepense(null);
                setIsEditing(false);
                setModalVisible(true);
              }}
            >
              <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Ajouter une dépense</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={displayedDepenses}
          renderItem={({ item: depense }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{getCategoryLabel(depense.categorie)}</Text>
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{formatDate(depense.date)}</Text>
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
                  <Text style={[styles.amount, { color: colors.primary }]}>{formatAmount(depense.montant)}</Text>
                </View>
                {depense.libelle_categorie && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Libellé:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{depense.libelle_categorie}</Text>
                  </View>
                )}
                {depense.commentaire && (
                  <View style={[styles.commentContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>Commentaire:</Text>
                    <Text style={[styles.commentText, { color: colors.text }]}>{depense.commentaire}</Text>
                  </View>
                )}
                {depense.photos && depense.photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={[styles.photosLabel, { color: colors.textSecondary }]}>
                      {depense.photos.length} photo{depense.photos.length > 1 ? 's' : ''} de reçu
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            displayedDepenses.length < depensesPonctuelles.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

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
          <View style={[styles.photoModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.photoModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.photoModalTitle, { color: colors.text }]}>Photos du reçu</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Text style={[styles.photoModalClose, { color: colors.textSecondary }]}>✕</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  card: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
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
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
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
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
  },
  commentContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  commentLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  photosContainer: {
    marginTop: SPACING.sm,
  },
  photosLabel: {
    fontSize: FONT_SIZES.sm,
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
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  photoModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  photoModalClose: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  photoImage: {
    width: 300,
    height: 400,
  },
});

