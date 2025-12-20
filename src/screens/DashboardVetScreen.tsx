/**
 * Dashboard Vétérinaire
 * Écran principal pour les utilisateurs avec le rôle Vétérinaire
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVetData } from '../hooks/useVetData';
import { useProfilData } from '../hooks/useProfilData';
import { useAppSelector } from '../store/hooks';
import { useDashboardAnimations } from '../hooks/useDashboardAnimations';
import { useMarketplaceNotifications } from '../hooks/useMarketplaceNotifications';
import { SCREENS } from '../navigation/types';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import ProfileMenuModal from '../components/ProfileMenuModal';
import { NotificationPanel } from '../components/marketplace';
import SupportContactModal from '../components/SupportContactModal';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import type { VisiteVeterinaire } from '../types/sante';

const DashboardVetScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const {
    todayConsultations,
    upcomingConsultations,
    clientFarms,
    healthAlerts,
    loading,
    error,
    refresh,
  } = useVetData(currentUser?.id);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications } = useAppSelector((state) => state.planification);
  const profil = useProfilData();
  const animations = useDashboardAnimations();
  const {
    notifications: marketplaceNotifications,
    unreadCount: marketplaceUnreadCount,
    markAsRead,
    deleteNotification,
  } = useMarketplaceNotifications();

  const vetProfile = currentUser?.roles?.veterinarian;
  const showPendingBanner =
    (route.params as { showPendingValidation?: boolean })?.showPendingValidation ||
    vetProfile?.validationStatus === 'pending';

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

  if (!vetProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="medical-outline"
          title="Profil Vétérinaire non activé"
          message="Activez votre profil vétérinaire pour accéder à ce dashboard"
        />
      </SafeAreaView>
    );
  }

  // Si profil en attente de validation
  if (vetProfile.validationStatus === 'pending' || showPendingBanner) {
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
              profilPrenom={profil.profilPrenom || currentUser?.prenom || 'Vétérinaire'}
              profilPhotoUri={profil.profilPhotoUri}
              profilInitiales={profil.profilInitiales || ''}
              currentDate={currentDate}
              projetNom={
                vetProfile?.qualifications?.licenseNumber
                  ? `License: ${vetProfile.qualifications.licenseNumber}`
                  : undefined
              }
              invitationsCount={0}
              notificationCount={marketplaceUnreadCount}
              headerAnim={animations.headerAnim}
              onPressPhoto={handlePressPhoto}
              onPressInvitations={() => {}}
              onPressNotifications={handlePressNotifications}
            />

            {/* Banner de validation en attente */}
            <View
              style={[
                styles.pendingBanner,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.pendingIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="time-outline" size={48} color={colors.warning} />
              </View>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>
                Profil en cours de validation
              </Text>
              <Text style={[styles.pendingMessage, { color: colors.textSecondary }]}>
                Votre demande a été soumise avec succès ! Notre équipe vérifie vos documents et
                validera votre profil sous 24-48 heures.
              </Text>
              <View style={styles.pendingSteps}>
                <View style={styles.pendingStep}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>Documents soumis</Text>
                </View>
                <View style={styles.pendingStep}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.warning }]}>
                    <Ionicons name="search" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Vérification en cours
                  </Text>
                </View>
                <View style={styles.pendingStep}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.textSecondary }]}>
                    <Ionicons name="time-outline" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Activation du profil
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => setSupportModalVisible(true)}
              >
                <Ionicons name="headset" size={20} color={colors.primary} />
                <Text style={[styles.contactButtonText, { color: colors.primary }]}>
                  Contacter le support
                </Text>
              </TouchableOpacity>
            </View>

            {/* Aperçu des fonctionnalités */}
            <View style={styles.previewSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Fonctionnalités disponibles après validation
              </Text>

              <Card
                style={[
                  styles.featureCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="people" size={32} color={colors.success} />
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Proposer mes services
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Accédez à une liste de fermes dans votre rayon de service et proposez votre
                  accompagnement
                </Text>
              </Card>

              <Card
                style={[
                  styles.featureCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="medical" size={32} color={colors.primary} />
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Gérer mes consultations
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Suivez l'état de santé des cheptels de vos clients et établissez des diagnostics
                </Text>
              </Card>

              <Card
                style={[
                  styles.featureCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar" size={32} color={colors.warning} />
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Agenda et planification
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Organisez vos visites et consultations avec un agenda intelligent
                </Text>
              </Card>
            </View>
          </View>
        </ScrollView>

        {/* Profile Menu Modal */}
        <ProfileMenuModal visible={profileMenuVisible} onClose={handleCloseProfileMenu} />

        {/* Notification Panel */}
        <NotificationPanel
          visible={notificationPanelVisible}
          notifications={marketplaceNotifications}
          onClose={() => setNotificationPanelVisible(false)}
          onNotificationPress={(notification) => {
            markAsRead(notification.id);
            // TODO: Navigate to notification target
          }}
          onDeleteNotification={deleteNotification}
          onMarkAllAsRead={() => {
            marketplaceNotifications.forEach((n) => markAsRead(n.id));
          }}
        />

        {/* Support Contact Modal */}
        <SupportContactModal
          visible={supportModalVisible}
          onClose={() => setSupportModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

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
            profilPrenom={profil.profilPrenom || currentUser?.prenom || 'Vétérinaire'}
            profilPhotoUri={profil.profilPhotoUri}
            profilInitiales={profil.profilInitiales || ''}
            currentDate={currentDate}
            projetNom={
              vetProfile?.qualifications?.licenseNumber
                ? `License: ${vetProfile.qualifications.licenseNumber}`
                : undefined
            }
            invitationsCount={0}
            notificationCount={marketplaceUnreadCount}
            headerAnim={animations.headerAnim}
            onPressPhoto={handlePressPhoto}
            onPressInvitations={() => {}}
            onPressNotifications={handlePressNotifications}
          />

          {/* Stats vétérinaire */}
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="people" size={32} color="#22C55E" />
              <Text style={[styles.statValue, { color: '#22C55E' }]}>
                {vetProfile.clients.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Clients actifs
              </Text>
            </Card>

            <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="medical" size={32} color="#3B82F6" />
              <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                {vetProfile.stats.totalConsultations || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Consultations</Text>
            </Card>
          </View>

          {/* Agenda du jour */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Agenda du jour</Text>
              {todayConsultations.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.CONSULTATIONS as never)}
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
            ) : todayConsultations.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="calendar-outline"
                  title="Aucune consultation prévue"
                  message="Votre agenda est libre aujourd'hui"
                  compact
                />
              </Card>
            ) : (
              <View style={styles.consultationsList}>
                {todayConsultations.slice(0, 3).map((consultation) => (
                  <ConsultationCard
                    key={consultation.id}
                    consultation={consultation}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Mes clients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes clients</Text>
              {clientFarms.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.MY_CLIENTS as never)}
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
            ) : clientFarms.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="people-outline"
                  title="Aucun client"
                  message="Vous n'avez pas encore de clients"
                  compact
                />
              </Card>
            ) : (
              <View style={styles.clientsList}>
                {clientFarms.slice(0, 3).map((client) => (
                  <ClientCard key={client.farmId} client={client} colors={colors} />
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
              <View style={styles.consultationsList}>
                {planifications
                  .filter((p) => p.statut === 'a_faire' || p.statut === 'en_cours')
                  .slice(0, 3)
                  .map((planif) => (
                    <PlanificationCard key={planif.id} planification={planif} colors={colors} />
                  ))}
              </View>
            </View>
          )}

          {/* Alertes sanitaires */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertes sanitaires</Text>
            {loading ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <LoadingSpinner size="small" />
              </Card>
            ) : healthAlerts.length === 0 ? (
              <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                <EmptyState
                  icon="checkmark-circle-outline"
                  title="Aucune alerte"
                  message="Tout est en ordre"
                  compact
                />
              </Card>
            ) : (
              <View style={styles.alertsList}>
                {healthAlerts.slice(0, 3).map((alert, index) => (
                  <AlertCard key={`${alert.farmId}-${index}`} alert={alert} colors={colors} />
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
        onClose={() => setNotificationPanelVisible(false)}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // TODO: Navigate to notification target
        }}
        onDeleteNotification={deleteNotification}
        onMarkAllAsRead={() => {
          marketplaceNotifications.forEach((n) => markAsRead(n.id));
        }}
      />

      {/* Support Contact Modal */}
      <SupportContactModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
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
  pendingBanner: {
    margin: SPACING.md,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  pendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  pendingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  pendingSteps: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  pendingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  contactButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  previewSection: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  featureCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    textAlign: 'center',
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
  clientItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  clientSince: {
    fontSize: FONT_SIZES.xs,
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
  consultationsList: {
    gap: SPACING.sm,
  },
  clientsList: {
    gap: SPACING.sm,
  },
  alertsList: {
    gap: SPACING.sm,
  },
  pendingBanner: {
    margin: SPACING.md,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  pendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  pendingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  pendingSteps: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  pendingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  contactButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  previewSection: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  featureCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Composant Card pour les planifications
const PlanificationCard: React.FC<{ planification: unknown; colors: unknown }> = ({
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

// Composant Card pour les consultations
const ConsultationCard: React.FC<{ consultation: VisiteVeterinaire; colors: unknown }> = ({
  consultation,
  colors,
}) => {
  return (
    <Card
      style={[
        componentStyles.consultationCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.consultationHeader}>
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text style={[componentStyles.consultationTime, { color: colors.textSecondary }]}>
          {format(new Date(consultation.date_visite), 'HH:mm', { locale: fr })}
        </Text>
      </View>
      <Text style={[componentStyles.consultationMotif, { color: colors.text }]}>
        {consultation.motif}
      </Text>
      {consultation.diagnostic && (
        <Text
          style={[componentStyles.consultationDiagnostic, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {consultation.diagnostic}
        </Text>
      )}
    </Card>
  );
};

// Composant Card pour les clients
const ClientCard: React.FC<{
  client: {
    farmId: string;
    farmName: string;
    since: string;
    lastConsultation?: string;
    consultationCount: number;
  };
  colors: unknown;
}> = ({ client, colors }) => {
  return (
    <Card
      style={[
        componentStyles.clientCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.clientHeader}>
        <Ionicons name="business" size={20} color={colors.primary} />
        <Text style={[componentStyles.clientName, { color: colors.text }]}>{client.farmName}</Text>
      </View>
      <Text style={[componentStyles.clientStats, { color: colors.textSecondary }]}>
        {client.consultationCount} consultation{client.consultationCount > 1 ? 's' : ''}
      </Text>
      {client.lastConsultation && (
        <Text style={[componentStyles.clientLastVisit, { color: colors.textSecondary }]}>
          Dernière visite: {format(new Date(client.lastConsultation), 'd MMM yyyy', { locale: fr })}
        </Text>
      )}
    </Card>
  );
};

// Composant Card pour les alertes
const AlertCard: React.FC<{
  alert: { farmId: string; farmName: string; alertType: string; message: string; severity: string };
  colors: unknown;
}> = ({ alert, colors }) => {
  const severityColors = {
    low: colors.info,
    medium: colors.warning,
    high: colors.error,
  };

  const alertIcons = {
    disease: 'alert-circle',
    vaccination: 'medical',
    treatment: 'flask',
  };

  return (
    <Card
      style={[
        componentStyles.alertCard,
        {
          backgroundColor: colors.surface,
          borderLeftColor: severityColors[alert.severity as keyof typeof severityColors],
        },
      ]}
    >
      <View style={componentStyles.alertHeader}>
        <Ionicons
          name={alertIcons[alert.alertType as keyof typeof alertIcons] || 'alert'}
          size={20}
          color={severityColors[alert.severity as keyof typeof severityColors]}
        />
        <Text style={[componentStyles.alertFarm, { color: colors.text }]}>{alert.farmName}</Text>
      </View>
      <Text style={[componentStyles.alertMessage, { color: colors.textSecondary }]}>
        {alert.message}
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
  consultationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  consultationTime: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  consultationMotif: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  consultationDiagnostic: {
    fontSize: FONT_SIZES.sm,
  },
  clientCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  clientStats: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  clientLastVisit: {
    fontSize: FONT_SIZES.xs,
  },
  alertCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  alertFarm: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  alertMessage: {
    fontSize: FONT_SIZES.sm,
  },
});

export default DashboardVetScreen;
