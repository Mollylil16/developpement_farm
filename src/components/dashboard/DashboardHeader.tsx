/**
 * Composant Header du Dashboard
 * Affiche: Photo profil, salutation, date, projet, badge invitations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import RoleIndicator from '../RoleIndicator';

interface DashboardHeaderProps {
  greeting: string;
  profilPrenom: string;
  profilPhotoUri: string | null;
  profilInitiales: string;
  currentDate: string;
  projetNom?: string;
  invitationsCount: number;
  notificationCount: number;
  headerAnim: Animated.Value;
  onPressPhoto: () => void;
  onPressInvitations: () => void;
  onPressNotifications: () => void;
}

export default function DashboardHeader({
  greeting,
  profilPrenom,
  profilPhotoUri,
  profilInitiales,
  currentDate,
  projetNom,
  invitationsCount,
  notificationCount,
  headerAnim,
  onPressPhoto,
  onPressInvitations,
  onPressNotifications,
}: DashboardHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Header principal avec photo et infos */}
      <View style={styles.headerMain}>
        {/* Photo de profil à gauche avec indicateur de rôle en dessous */}
        <View style={styles.profilSection}>
          <TouchableOpacity
            style={[
              styles.profilPhotoButton,
              { borderColor: colors.primary, ...colors.shadow.medium },
            ]}
            onPress={onPressPhoto}
            activeOpacity={0.8}
          >
            {profilPhotoUri ? (
              <Image source={{ uri: profilPhotoUri }} style={styles.profilPhoto} />
            ) : (
              <View
                style={[styles.profilPhotoPlaceholder, { backgroundColor: colors.primary + '15' }]}
              >
                {profilInitiales ? (
                  <Text style={[styles.initialesText, { color: colors.primary }]}>
                    {profilInitiales}
                  </Text>
                ) : (
                  <Ionicons name="person" size={28} color={colors.primary} />
                )}
              </View>
            )}
            <View style={[styles.profilPhotoBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={10} color="#FFF" />
            </View>
          </TouchableOpacity>
          {/* Indicateur de rôle en dessous de la photo */}
          <View style={styles.roleIndicatorContainer}>
            <RoleIndicator />
          </View>
        </View>

        {/* Texte au centre */}
        <View style={styles.headerTextContainer}>
          <View style={styles.headerFirstLine}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting || 'Bonjour 👋'}
            </Text>
            <View
              style={[
                styles.headerBadge,
                {
                  backgroundColor: colors.success + '20',
                  borderColor: colors.success + '40',
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.success }]}>Actif</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : colors.text }]}>
            {profilPrenom || 'Utilisateur'}
          </Text>
          {currentDate ? (
            <Text style={[styles.date, { color: colors.textSecondary }]}>{currentDate}</Text>
          ) : null}
          {projetNom ? (
            <Text style={[styles.projetNom, { color: colors.textSecondary }]}>
              Projet {projetNom}
            </Text>
          ) : null}
        </View>

        {/* Actions à droite */}
        <View style={styles.headerRightActions}>
          {/* Icône notifications - maintenant en haut à droite */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onPressNotifications}
            activeOpacity={0.7}
          >
            <Ionicons
              name={notificationCount > 0 ? 'notifications' : 'notifications-outline'}
              size={24}
              color={colors.text}
            />
            {notificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.notificationBadgeText, { color: '#FFFFFF' }]}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Invitations */}
          {invitationsCount > 0 && (
            <TouchableOpacity
              style={[
                styles.invitationBadge,
                { backgroundColor: colors.warning, ...colors.shadow.small },
              ]}
              onPress={onPressInvitations}
            >
              <Text style={styles.invitationBadgeText}>📬 {invitationsCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[styles.headerDivider, { backgroundColor: colors.primaryLight + '30' }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.md,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
  },
  profilSection: {
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  profilPhotoButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    overflow: 'hidden',
  },
  roleIndicatorContainer: {
    marginTop: SPACING.xs,
    alignItems: 'center',
  },
  profilPhoto: {
    width: '100%',
    height: '100%',
  },
  profilPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialesText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  profilPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerFirstLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  greeting: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  headerBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.regular,
  },
  projetNom: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: 2,
  },
  invitationBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  invitationBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    justifyContent: 'flex-start',
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 12,
  },
  headerDivider: {
    height: 1,
    marginTop: SPACING.md,
  },
});

