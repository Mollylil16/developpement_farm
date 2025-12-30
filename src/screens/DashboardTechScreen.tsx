/**
 * Dashboard Technicien
 * Écran principal pour les utilisateurs avec le rôle Technicien
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTechData } from '../hooks/useTechData';
import { useAppSelector } from '../store/hooks';
import { SCREENS } from '../navigation/types';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, LIGHT_COLORS } from '../constants/theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import ProfileMenuModal from '../components/ProfileMenuModal';
import { NotificationPanel } from '../components/marketplace';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { useProfilData } from '../hooks/useProfilData';
import { useDashboardAnimations } from '../hooks/useDashboardAnimations';
import { useMarketplaceNotifications } from '../hooks/useMarketplaceNotifications';
import type { Planification } from '../types/planification';

const DashboardTechScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const { assistedFarms, todayTasks, recentRecords, loading, error, refresh } = useTechData(
    currentUser?.id
  );
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications, planificationsAVenir } = useAppSelector((state) => state.planification);
  const profil = useProfilData();
  const animations = useDashboardAnimations();
  const {
    notifications: marketplaceNotifications,
    unreadCount: marketplaceUnreadCount,
    markAsRead,
    deleteNotification,
  } = useMarketplaceNotifications({ enabled: isFocused });

  const techProfile = currentUser?.roles?.technician;

  // Greeting state
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour 👋';
    if (hour >= 12 && hour < 18) return 'Bonne après-midi 👋';
    return 'Bonsoir 👋';
  }, []);

  // Date formatting
  const currentDate = useMemo(() => {
    try {
      return format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
    } catch (error) {
      return new Date().toLocaleDateString('fr-FR');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handlePressPhoto = useCallback(() => {
    setProfileMenuVisible(true);
  }, []);

  const handlePressNotifications = useCallback(() => {
    setNotificationPanelVisible(true);
  }, []);

  const handleCloseProfileMenu = useCallback(() => {
    setProfileMenuVisible(false);
  }, []);

  if (!techProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="construct-outline"
          title="Profil Technicien non activé"
          message="Activez votre profil technicien pour accéder à ce dashboard"
        />
      </SafeAreaView>
    );
  }

  const levelLabels = {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    expert: 'Expert',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Actualisation..."
            titleColor={colors.textSecondary}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <DashboardHeader
            greeting={greeting}
            profilPrenom={profil.profilPrenom || currentUser?.prenom || 'Technicien'}
            profilPhotoUri={profil.profilPhotoUri}
            profilInitiales={profil.profilInitiales || ''}
            currentDate={currentDate}
            projetNom={
              techProfile?.qualifications?.level
                ? `Niveau: ${levelLabels[techProfile.qualifications.level]}`
                : undefined
            }
            invitationsCount={0}
            notificationCount={marketplaceUnreadCount}
            headerAnim={animations.headerAnim}
            onPressPhoto={handlePressPhoto}
            onPressInvitations={() => {}}
            onPressNotifications={handlePressNotifications}
          />

          {/* Fermes assistées */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes fermes</Text>
              {assistedFarms.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.MY_FARMS as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <LoadingSpinner size="small" />
              </Card>
            ) : assistedFarms.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="business-outline"
                  title="Aucune ferme assistée"
                  message="Vous n'assistez aucune ferme pour le moment"
                />
              </Card>
            ) : (
              <View style={styles.farmsGrid}>
                {assistedFarms.slice(0, 4).map((farm) => (
                  <FarmCard key={farm.farmId} farm={farm} colors={colors} />
                ))}
              </View>
            )}
          </View>

          {/* Tâches du jour */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tâches du jour</Text>
              {todayTasks.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.TASKS as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <LoadingSpinner size="small" />
              </Card>
            ) : todayTasks.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="checkmark-circle-outline"
                  title="Aucune tâche"
                  message="Vous n'avez pas de tâches prévues aujourd'hui"
                />
              </Card>
            ) : (
              <View style={styles.tasksList}>
                {todayTasks.slice(0, 3).map((task) => (
                  <TaskCard key={task.id} task={task} colors={colors} />
                ))}
              </View>
            )}
          </View>

          {/* Planifications du projet actif */}
          {projetActif && planifications && planifications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Planifications ({projetActif.nom})
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.PLANIFICATION as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.tasksList}>
                {planifications
                  .filter((p) => p.statut === 'a_faire' || p.statut === 'en_cours')
                  .slice(0, 3)
                  .map((planif) => (
                    <PlanificationCard key={planif.id} planification={planif} colors={colors} />
                  ))}
              </View>
            </View>
          )}

          {/* Enregistrements récents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Enregistrements récents
              </Text>
              {recentRecords.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.RECORDS as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <LoadingSpinner size="small" />
              </Card>
            ) : recentRecords.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="document-outline"
                  title="Aucun enregistrement"
                  message="Vos enregistrements récents apparaîtront ici"
                />
              </Card>
            ) : (
              <View style={styles.recordsList}>
                {recentRecords.slice(0, 3).map((record) => (
                  <RecordCard key={record.id} record={record} colors={colors} />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Profile Menu Modal */}
      <ProfileMenuModal visible={profileMenuVisible} onClose={handleCloseProfileMenu} />

      {/* Notification Panel */}
      <NotificationPanel
        visible={notificationPanelVisible}
        notifications={marketplaceNotifications}
        unreadCount={marketplaceUnreadCount}
        onClose={() => setNotificationPanelVisible(false)}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // TODO: Navigate to notification target
        }}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
        onMarkAllAsRead={() => {
          marketplaceNotifications.forEach((n) => markAsRead(n.id));
        }}
      />
      {/* Bouton flottant pour accéder à l'agent conversationnel */}
      <ChatAgentFAB />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 100,
  },
  farmsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  farmCard: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  farmName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  farmSince: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  tasksList: {
    gap: SPACING.sm,
  },
  recordsList: {
    gap: SPACING.sm,
  },
});

// Composant Card pour les fermes
const FarmCard: React.FC<{
  farm: {
    farmId: string;
    farmName: string;
    permissions?: {
      canViewHerd?: boolean;
      canEditHerd?: boolean;
      canViewHealthRecords?: boolean;
      canEditHealthRecords?: boolean;
    };
    since: string;
    taskCount: number;
  };
  colors: typeof LIGHT_COLORS;
}> = ({ farm, colors }) => {
  return (
    <Card
      style={[
        componentStyles.farmCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name="business" size={32} color={colors.primary} />
      <Text style={[componentStyles.farmName, { color: colors.text }]}>{farm.farmName}</Text>
      <Text style={[componentStyles.farmSince, { color: colors.textSecondary }]}>
        Depuis {format(new Date(farm.since), 'MMM yyyy', { locale: fr })}
      </Text>
    </Card>
  );
};

// Composant Card pour les tâches
const TaskCard: React.FC<{
  task: {
    id: string;
    farmId: string;
    farmName: string;
    taskType: string;
    description: string;
    dueDate: string;
    priority: string;
  };
  colors: typeof LIGHT_COLORS;
}> = ({ task, colors }) => {
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

  return (
    <Card
      style={[
        componentStyles.taskCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.taskHeader}>
        <Ionicons
          name={(taskIcons[task.taskType as keyof typeof taskIcons] || 'checkmark') as any}
          size={20}
          color={colors.primary}
        />
        <Text style={[componentStyles.taskFarm, { color: colors.textSecondary }]}>
          {task.farmName}
        </Text>
        <View
          style={[
            componentStyles.priorityBadge,
            {
              backgroundColor: priorityColors[task.priority as keyof typeof priorityColors] + '20',
            },
          ]}
        >
          <Text
            style={[
              componentStyles.priorityText,
              { color: priorityColors[task.priority as keyof typeof priorityColors] },
            ]}
          >
            {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Faible'}
          </Text>
        </View>
      </View>
      <Text style={[componentStyles.taskDescription, { color: colors.text }]}>
        {task.description}
      </Text>
    </Card>
  );
};

// Composant Card pour les planifications
const PlanificationCard: React.FC<{ planification: Planification; colors: typeof LIGHT_COLORS }> = ({
  planification,
  colors,
}) => {
  const statutColors: Record<string, string> = {
    a_faire: colors.warning,
    en_cours: colors.primary,
    terminee: colors.success,
  };

  return (
    <Card
      style={[
        componentStyles.planificationCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.planificationHeader}>
        <View
          style={[
            componentStyles.statutBadge,
            { backgroundColor: statutColors[planification.statut] + '20' },
          ]}
        >
          <Text style={[componentStyles.statutText, { color: statutColors[planification.statut] }]}>
            {planification.statut === 'a_faire'
              ? 'À faire'
              : planification.statut === 'en_cours'
                ? 'En cours'
                : 'Terminée'}
          </Text>
        </View>
        <Text style={[componentStyles.planificationDate, { color: colors.textSecondary }]}>
          {format(new Date(planification.date_prevue), 'd MMM', { locale: fr })}
        </Text>
      </View>
      <Text style={[componentStyles.planificationTitle, { color: colors.text }]}>
        {planification.titre}
      </Text>
      {planification.description && (
        <Text
          style={[componentStyles.planificationDescription, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {planification.description}
        </Text>
      )}
    </Card>
  );
};

// Composant Card pour les enregistrements
const RecordCard: React.FC<{
  record: {
    id: string;
    farmId: string;
    farmName: string;
    recordType: string;
    date: string;
    description: string;
  };
  colors: typeof LIGHT_COLORS;
}> = ({ record, colors }) => {
  const recordIcons = {
    pesee: 'scale',
    vaccination: 'medical',
    traitement: 'flask',
    visite: 'calendar',
  };

  return (
    <Card
      style={[
        componentStyles.recordCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.recordHeader}>
        <Ionicons
          name={(recordIcons[record.recordType as keyof typeof recordIcons] || 'document') as any}
          size={20}
          color={colors.primary}
        />
        <Text style={[componentStyles.recordFarm, { color: colors.text }]}>{record.farmName}</Text>
        <Text style={[componentStyles.recordDate, { color: colors.textSecondary }]}>
          {format(new Date(record.date), 'd MMM', { locale: fr })}
        </Text>
      </View>
      <Text style={[componentStyles.recordDescription, { color: colors.textSecondary }]}>
        {record.description}
      </Text>
    </Card>
  );
};

const componentStyles = StyleSheet.create({
  planificationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  planificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statutBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  planificationDate: {
    fontSize: FONT_SIZES.xs,
  },
  planificationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  planificationDescription: {
    fontSize: FONT_SIZES.sm,
  },
  farmCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  farmName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  farmSince: {
    fontSize: FONT_SIZES.xs,
  },
  taskCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  taskFarm: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  taskDescription: {
    fontSize: FONT_SIZES.sm,
  },
  recordCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recordFarm: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  recordDate: {
    fontSize: FONT_SIZES.xs,
  },
  recordDescription: {
    fontSize: FONT_SIZES.sm,
  },
});

export default DashboardTechScreen;
