/**
 * Écran "Tâches" pour les techniciens
 * Affiche toutes les tâches (du jour, à venir, passées)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTechData } from '../hooks/useTechData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const TasksScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const { todayTasks, loading, refresh } = useTechData(currentUser?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Pour l'instant, on utilise seulement todayTasks
  const filteredTasks = todayTasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    if (activeTab === 'today') return isToday(taskDate);
    if (activeTab === 'upcoming') return isFuture(taskDate);
    return isPast(taskDate);
  });

  const renderTask = ({ item }: { item: typeof todayTasks[0] }) => {
    const priorityColors = {
      low: colors.info,
      medium: colors.warning,
      high: colors.error,
    };

    const taskIcons = {
      pesee: 'scale',
      vaccination: 'medical',
      traitement: 'flask',
      visite: 'calendar',
    };

    const taskLabels = {
      pesee: 'Pesée',
      vaccination: 'Vaccination',
      traitement: 'Traitement',
      visite: 'Visite',
    };

    return (
      <Card style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIcon, { backgroundColor: priorityColors[item.priority as keyof typeof priorityColors] + '20' }]}>
            <Ionicons
              name={taskIcons[item.taskType as keyof typeof taskIcons] || 'checkmark'}
              size={24}
              color={priorityColors[item.priority as keyof typeof priorityColors]}
            />
          </View>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskType, { color: colors.text }]}>
              {taskLabels[item.taskType as keyof typeof taskLabels] || item.taskType}
            </Text>
            <Text style={[styles.taskFarm, { color: colors.textSecondary }]}>
              {item.farmName}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority as keyof typeof priorityColors] + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColors[item.priority as keyof typeof priorityColors] }]}>
              {item.priority === 'high' ? 'Urgent' : item.priority === 'medium' ? 'Moyen' : 'Faible'}
            </Text>
          </View>
        </View>

        <Text style={[styles.taskDescription, { color: colors.text }]}>
          {item.description}
        </Text>

        <View style={styles.taskFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(new Date(item.dueDate), 'd MMM yyyy', { locale: fr })}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: colors.success + '20' }]}
            onPress={() => {
              // TODO: Marquer la tâche comme complétée
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.completeButtonText, { color: colors.success }]}>
              Compléter
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (!currentUser?.roles?.technician) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="construct-outline"
          title="Profil Technicien requis"
          message="Activez votre profil technicien pour voir vos tâches"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tâches</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'today' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('today')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'today' ? colors.primary : colors.textSecondary },
            ]}
          >
            Aujourd'hui
          </Text>
          {activeTab === 'today' && todayTasks.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabBadgeText, { color: '#FFF' }]}>
                {todayTasks.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? colors.primary : colors.textSecondary },
            ]}
          >
            À venir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'past' ? colors.primary : colors.textSecondary },
            ]}
          >
            Passées
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={`Aucune tâche ${activeTab === 'today' ? "aujourd'hui" : activeTab === 'upcoming' ? 'à venir' : 'passée'}`}
          message={
            activeTab === 'today'
              ? "Vous n'avez pas de tâches prévues aujourd'hui"
              : activeTab === 'upcoming'
              ? "Vous n'avez pas de tâches à venir"
              : "Vous n'avez pas encore de tâches passées"
          }
        />
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

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
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  taskCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskType: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  taskFarm: {
    fontSize: FONT_SIZES.sm,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  taskDescription: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  completeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

export default TasksScreen;

