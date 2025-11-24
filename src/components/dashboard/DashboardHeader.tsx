/**
 * Composant Header du Dashboard
 * Affiche: Photo profil, salutation, date, projet, badge invitations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';

interface DashboardHeaderProps {
  greeting: string;
  profilPrenom: string;
  profilPhotoUri: string | null;
  profilInitiales: string;
  currentDate: string;
  projetNom?: string;
  invitationsCount: number;
  headerAnim: Animated.Value;
  onPressPhoto: () => void;
  onPressInvitations: () => void;
}

export default function DashboardHeader({
  greeting,
  profilPrenom,
  profilPhotoUri,
  profilInitiales,
  currentDate,
  projetNom,
  invitationsCount,
  headerAnim,
  onPressPhoto,
  onPressInvitations,
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
        {/* Photo de profil à gauche */}
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
          {currentDate && (
            <Text style={[styles.date, { color: colors.textSecondary }]}>{currentDate}</Text>
          )}
          {projetNom && (
            <Text style={[styles.projetNom, { color: colors.textSecondary }]}>
              Projet {projetNom}
            </Text>
          )}
        </View>

        {/* Invitations à droite */}
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
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  profilPhotoButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    overflow: 'hidden',
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
  headerDivider: {
    height: 1,
    marginTop: SPACING.md,
  },
});

