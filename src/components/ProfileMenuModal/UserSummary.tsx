/**
 * Résumé utilisateur affiché dans la vue d'accueil
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useProfilData } from '../../hooks/useProfilData';
import ProfilePhoto from '../ProfilePhoto';

export default function UserSummary() {
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  
  // Utiliser useProfilData pour avoir la photo synchronisée
  const { profilPhotoUri } = useProfilData();
  
  // Utiliser la photo synchronisée si disponible, sinon fallback sur user.photo
  const displayPhoto = profilPhotoUri || user?.photo;

  return (
    <View style={[styles.userInfo, { borderBottomColor: colors.border }]}>
      <ProfilePhoto
        uri={displayPhoto || null}
        size={64}
        style={styles.userPhoto}
        placeholder={
          <View style={[styles.userPhotoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.userInitials, { color: colors.primary }]}>
              {user?.prenom?.[0] || user?.nom?.[0] || 'U'}
            </Text>
          </View>
        }
      />
      <View style={styles.userInfoText}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.prenom || user?.nom || 'Utilisateur'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
        {projetActif && (
          <Text style={[styles.userProject, { color: colors.textSecondary }]}>
            {projetActif.nom}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  userPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  userInfoText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  userProject: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
});
