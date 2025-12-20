/**
 * Écran "Mes documents"
 * Affiche les documents de l'utilisateur (certificats, factures, etc.)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

type DocumentCategory = 'certificats' | 'factures' | 'photos' | 'autres';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  type: 'image' | 'pdf' | 'other';
  uri: string;
  createdAt: string;
  size?: number;
}

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // TODO: Implémenter le chargement des documents depuis la base de données
      // Pour l'instant, on simule un chargement
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDocuments([]);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      Alert.alert('Erreur', 'Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments =
    selectedCategory === 'all'
      ? documents
      : documents.filter((doc) => doc.category === selectedCategory);

  const categories: { key: DocumentCategory | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'Tous', icon: 'document-text' },
    { key: 'certificats', label: 'Certificats', icon: 'shield-checkmark' },
    { key: 'factures', icon: 'receipt', label: 'Factures' },
    { key: 'photos', label: 'Photos', icon: 'images' },
    { key: 'autres', label: 'Autres', icon: 'folder' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Chargement des documents..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes documents</Text>
      </View>

      {/* Filtres par catégorie */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === category.key ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Ionicons
              name={category.icon}
              size={18}
              color={selectedCategory === category.key ? colors.textOnPrimary : colors.text}
            />
            <Text
              style={[
                styles.categoryLabel,
                {
                  color: selectedCategory === category.key ? colors.textOnPrimary : colors.text,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des documents */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredDocuments.length === 0 ? (
          <EmptyState
            title="Aucun document"
            message={
              selectedCategory === 'all'
                ? "Vous n'avez pas encore de documents enregistrés"
                : `Aucun document dans la catégorie "${categories.find((c) => c.key === selectedCategory)?.label}"`
            }
          />
        ) : (
          <View style={styles.documentsList}>
            {filteredDocuments.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.documentCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  // TODO: Ouvrir le document
                  Alert.alert(
                    'En développement',
                    "L'ouverture des documents sera bientôt disponible"
                  );
                }}
              >
                <View style={styles.documentIcon}>
                  {doc.type === 'image' ? (
                    <Image source={{ uri: doc.uri }} style={styles.documentImage} />
                  ) : (
                    <Ionicons
                      name={doc.type === 'pdf' ? 'document' : 'document-text'}
                      size={32}
                      color={colors.primary}
                    />
                  )}
                </View>
                <View style={styles.documentInfo}>
                  <Text style={[styles.documentName, { color: colors.text }]} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
                    {categories.find((c) => c.key === doc.category)?.label} •{' '}
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  categoriesContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  categoryLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  documentsList: {
    gap: SPACING.md,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs / 2,
  },
  documentMeta: {
    fontSize: FONT_SIZES.sm,
  },
});
