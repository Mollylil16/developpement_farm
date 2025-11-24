/**
 * Composant pour protéger les écrans selon les permissions du collaborateur
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePermissions, PermissionType } from '../hooks/usePermissions';
import { useTheme } from '../contexts/ThemeContext';
import { SCREENS } from '../navigation/types';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface ProtectedScreenProps {
  children: React.ReactNode;
  requiredPermission?: PermissionType; // Permission requise (optionnel si requireOwner est true)
  requireOwner?: boolean; // Si true, seul le propriétaire peut accéder
  fallbackScreen?: string; // Écran de redirection par défaut (Dashboard)
}

/**
 * Composant HOC pour protéger un écran selon les permissions
 *
 * @example
 * <ProtectedScreen requiredPermission="finance">
 *   <FinanceScreen />
 * </ProtectedScreen>
 */
export default function ProtectedScreen({
  children,
  requiredPermission,
  requireOwner = false,
  fallbackScreen = SCREENS.DASHBOARD,
}: ProtectedScreenProps) {
  const { hasPermission, isProprietaire } = usePermissions();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Vérifier si l'utilisateur a accès
  let hasAccess: boolean;
  if (requireOwner) {
    // Seul le propriétaire peut accéder
    hasAccess = isProprietaire;
  } else if (requiredPermission) {
    // Vérifier la permission (propriétaire a toujours accès)
    hasAccess = isProprietaire || hasPermission(requiredPermission);
  } else {
    // Par défaut, accès refusé si aucune condition n'est spécifiée
    hasAccess = false;
  }

  useEffect(() => {
    // Rediriger vers le Dashboard si l'accès est refusé
    if (!hasAccess) {
      // @ts-ignore - navigation typée
      navigation.navigate('Main', { screen: fallbackScreen });
    }
  }, [hasAccess, navigation, fallbackScreen]);

  // Si l'utilisateur n'a pas accès, afficher un message d'erreur
  if (!hasAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.surface, borderColor: colors.error },
          ]}
        >
          <Text style={[styles.errorIcon, { color: colors.error }]}>🚫</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Accès refusé</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            Vous n'avez pas la permission d'accéder à ce module.
          </Text>
          {requiredPermission && (
            <Text style={[styles.errorDetails, { color: colors.textSecondary }]}>
              Permission requise : {requiredPermission}
            </Text>
          )}
          {requireOwner && (
            <Text style={[styles.errorDetails, { color: colors.textSecondary }]}>
              Accès réservé au propriétaire du projet
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              // @ts-ignore - navigation typée
              navigation.navigate('Main', { screen: fallbackScreen });
            }}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Retour au Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Si l'utilisateur a accès, afficher le contenu normal
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 400,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
