/**
 * Modal principal d'actions sur une bande/loge
 * Affiche un menu d'actions disponibles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  X,
  PlusCircle,
  List,
  ArrowRightLeft,
  MinusCircle,
  Edit,
  ChevronRight,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { Batch, BATCH_CATEGORY_LABELS } from '../../types/batch';
import AddPigModal from './AddPigModal';
import PigListModal from './PigListModal';
import TransferPigModal from './TransferPigModal';
import RemovePigModal from './RemovePigModal';
import CreateBatchListingModal from './CreateBatchListingModal';
import BatchSettingsModal from './BatchSettingsModal';
// import EditBatchModal from './EditBatchModal'; // À créer plus tard

interface BatchActionsModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
  onRefresh: () => void;
}

type ActionType =
  | 'add'
  | 'list'
  | 'transfer'
  | 'remove'
  | 'edit'
  | 'marketplace'
  | 'settings'
  | null;

export default function BatchActionsModal({
  visible,
  batch,
  onClose,
  onRefresh,
}: BatchActionsModalProps) {
  const { colors } = useTheme();
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);

  const actions = [
    {
      id: 'add' as ActionType,
      label: 'Ajouter un sujet',
      icon: PlusCircle,
      color: colors.success,
    },
    {
      id: 'list' as ActionType,
      label: 'Voir la liste des sujets',
      icon: List,
      color: colors.primary,
    },
    {
      id: 'marketplace' as ActionType,
      label: 'Vendre sur le Marketplace',
      icon: ShoppingCart,
      color: '#FF8C42',
    },
    {
      id: 'transfer' as ActionType,
      label: 'Déplacer un sujet',
      icon: ArrowRightLeft,
      color: colors.warning,
    },
    {
      id: 'remove' as ActionType,
      label: 'Retirer un sujet',
      icon: MinusCircle,
      color: colors.error,
    },
    {
      id: 'settings' as ActionType,
      label: 'Paramètres & GMQ',
      icon: SlidersHorizontal,
      color: colors.info,
    },
    // {
    //   id: 'edit' as ActionType,
    //   label: 'Modifier la loge',
    //   icon: Edit,
    //   color: colors.info,
    // },
  ];

  function handleActionSelect(actionId: ActionType) {
    setSelectedAction(actionId);
  }

  function handleCloseAction() {
    setSelectedAction(null);
  }

  function handleActionComplete() {
    handleCloseAction();
    onRefresh();
  }

  return (
    <>
      {/* Modal principal - Menu d'actions */}
      <Modal
        visible={visible && !selectedAction}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              Gérer la loge
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Info de la bande */}
          <View
            style={[
              styles.batchInfo,
              { backgroundColor: colors.surface, borderBottomColor: colors.divider },
            ]}
          >
            <Text style={[styles.batchName, { color: colors.text }]}>
              {BATCH_CATEGORY_LABELS[batch.category]}
            </Text>
            <Text style={[styles.batchDetails, { color: colors.textSecondary }]}>
              {batch.total_count} sujets • {batch.pen_name}
            </Text>
          </View>

          {/* Liste des actions */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {actions.map((action) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      ...colors.shadow.small,
                    },
                  ]}
                  onPress={() => handleActionSelect(action.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${action.color}20` },
                    ]}
                  >
                    <IconComponent size={24} color={action.color} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>
                      {action.label}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modals secondaires */}
      {selectedAction === 'add' && (
        <AddPigModal
          visible={true}
          batch={batch}
          onClose={handleActionComplete}
        />
      )}

      {selectedAction === 'list' && (
        <PigListModal
          visible={true}
          batch={batch}
          onClose={handleCloseAction}
          onRefresh={handleActionComplete}
        />
      )}

      {selectedAction === 'transfer' && (
        <TransferPigModal
          visible={true}
          batch={batch}
          onClose={handleActionComplete}
        />
      )}

      {selectedAction === 'remove' && (
        <RemovePigModal
          visible={true}
          batch={batch}
          onClose={handleActionComplete}
        />
      )}

      {selectedAction === 'marketplace' && (
        <CreateBatchListingModal
          visible={true}
          batch={batch}
          onClose={handleActionComplete}
          onSuccess={handleActionComplete}
        />
      )}

      {selectedAction === 'settings' && (
        <BatchSettingsModal
          visible={true}
          batch={batch}
          onClose={handleCloseAction}
          onSaved={handleActionComplete}
        />
      )}

      {/* {selectedAction === 'edit' && (
        <EditBatchModal
          visible={true}
          batch={batch}
          onClose={handleActionComplete}
        />
      )} */}
    </>
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
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  batchInfo: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  batchName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  batchDetails: {
    fontSize: FONT_SIZES.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

