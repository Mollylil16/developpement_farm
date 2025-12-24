/**
 * Modal pour afficher la liste des sujets d'une bande
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { Batch } from '../../types/batch';
import { BatchPig } from '../../types/batchPig';
import Badge from '../Badge';
import apiClient from '../../services/api/apiClient';

interface PigListModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
  onRefresh: () => void;
}

function PigListItem({ pig, onPress }: { pig: BatchPig; onPress: () => void }) {
  const { colors } = useTheme();
  
  const sexIcon = pig.sex === 'male' ? '♂' : pig.sex === 'female' ? '♀' : '⚥';
  
  return (
    <TouchableOpacity
      style={[
        styles.pigItem,
        { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {pig.photo_url ? (
        <Image source={{ uri: pig.photo_url }} style={styles.pigPhoto} />
      ) : (
        <View style={[styles.pigPhotoPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={styles.pigPhotoText}>{sexIcon}</Text>
        </View>
      )}

      <View style={styles.pigInfo}>
        <Text style={[styles.pigName, { color: colors.text }]}>
          {pig.name || `Sujet ${pig.id.slice(-6)}`}
        </Text>
        <Text style={[styles.pigDetails, { color: colors.textSecondary }]}>
          {pig.current_weight_kg} kg
          {pig.age_months ? ` • ${pig.age_months} mois` : ''}
        </Text>
        {pig.health_status !== 'healthy' && (
          <View style={styles.badgeContainer}>
            <Badge variant="warning" size="small">
              {pig.health_status}
            </Badge>
          </View>
        )}
      </View>

      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function PigListModal({
  visible,
  batch,
  onClose,
  onRefresh,
}: PigListModalProps) {
  const { colors } = useTheme();
  const [pigs, setPigs] = useState<BatchPig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPigs();
    }
  }, [visible]);

  async function loadPigs() {
    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-pigs/batch/${batch.id}`);
      setPigs(data);
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible de charger la liste");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Liste des sujets</Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>{pigs.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pigs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun sujet dans cette loge
            </Text>
          </View>
        ) : (
          <FlatList
            data={pigs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PigListItem
                pig={item}
                onPress={() => {
                  // TODO: Ouvrir modal de détails
                  Alert.alert('Détails', `Sujet: ${item.name || item.id}`);
                }}
              />
            )}
            refreshing={loading}
            onRefresh={loadPigs}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  count: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  pigItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  pigPhoto: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  pigPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigPhotoText: {
    fontSize: 24,
  },
  pigInfo: {
    flex: 1,
  },
  pigName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  pigDetails: {
    fontSize: FONT_SIZES.sm,
  },
  badgeContainer: {
    marginTop: SPACING.xs,
  },
});

