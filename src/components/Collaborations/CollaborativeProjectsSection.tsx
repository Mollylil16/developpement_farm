/**
 * Section affichant les projets où l'utilisateur est collaborateur
 * Affiche les projets avec nombre de collaborateurs et rôles
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';
import type { Projet } from '../../types/projet';
import type { Collaborateur } from '../../types/collaboration';
import { ROLE_LABELS } from '../../types/collaboration';

interface CollaborativeProjectsSectionProps {
  projets: Projet[];
  collaborateursParProjet: Record<string, Collaborateur[]>;
  onProjectPress?: (projet: Projet) => void;
}

export default function CollaborativeProjectsSection({
  projets,
  collaborateursParProjet,
  onProjectPress,
}: CollaborativeProjectsSectionProps) {
  const { colors } = useTheme();

  // Filtrer les projets où l'utilisateur est collaborateur (pas propriétaire)
  // Pour l'instant, on affiche tous les projets (le filtre se fera côté backend)
  const projetsCollaboratifs = useMemo(() => {
    return projets.filter((projet) => {
      const collaborateurs = collaborateursParProjet[projet.id] || [];
      return collaborateurs.length > 0 || projet.statut === 'actif';
    });
  }, [projets, collaborateursParProjet]);

  if (projetsCollaboratifs.length === 0) {
    return null;
  }

  const getProjectIcon = (type?: string): keyof typeof Ionicons.glyphMap => {
    if (type?.includes('avicole') || type?.includes('poule')) return 'egg-outline';
    if (type?.includes('bovin') || type?.includes('vache')) return 'nutrition-outline';
    if (type?.includes('porcin') || type?.includes('porc')) return 'cube-outline';
    return 'home-outline';
  };

  const getRoleSummary = (collaborateurs: Collaborateur[]): string => {
    const roles = collaborateurs
      .filter((c) => c.statut === 'actif')
      .map((c) => ROLE_LABELS[c.role])
      .filter((role, index, arr) => arr.indexOf(role) === index); // Dédupliquer

    if (roles.length === 0) return 'Aucun collaborateur actif';
    if (roles.length === 1) return roles[0];
    if (roles.length === 2) return roles.join(', ');
    return `${roles[0]}, ${roles[1]} et ${roles.length - 2} autre(s)`;
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Mes Projets Collaboratifs ({projetsCollaboratifs.length})
        </Text>
      </View>

      <View style={styles.projectsContainer}>
        {projetsCollaboratifs.map((projet) => {
          const collaborateurs = collaborateursParProjet[projet.id] || [];
          const actifs = collaborateurs.filter((c) => c.statut === 'actif').length;
          const icon = getProjectIcon(projet.type || projet.nom);

          return (
            <TouchableOpacity
              key={projet.id}
              style={[styles.projectCard, { backgroundColor: colors.surface }]}
              onPress={() => onProjectPress?.(projet)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Projet ${projet.nom}`}
            >
              <View style={styles.projectCardHeader}>
                <View style={[styles.projectIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name={icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                    {projet.nom}
                  </Text>
                  <Text style={[styles.projectStats, { color: colors.textSecondary }]}>
                    {actifs} collaborateur{actifs > 1 ? 's' : ''} • {projet.statut === 'actif' ? 'Actif' : 'Archivé'}
                  </Text>
                </View>
              </View>
              <View style={styles.projectRoles}>
                <Text style={[styles.projectRolesText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {getRoleSummary(collaborateurs)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  projectsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  projectCard: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 4,
  },
  projectStats: {
    fontSize: FONT_SIZES.xs,
  },
  projectRoles: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  projectRolesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
});
