/**
 * Widget Santé pour le Dashboard
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import {
  selectNombreVaccinationsEnRetard,
  selectNombreMaladiesEnCours,
  selectNombreTraitementsEnCours,
  selectNombreAlertesCritiques,
  selectSanteLoading,
} from '../../store/selectors/santeSelectors';

interface Props {
  onPress?: () => void;
}

export default function SanteWidget({ onPress }: Props) {
  const { colors } = useTheme();

  const vaccinationsEnRetard = useAppSelector(selectNombreVaccinationsEnRetard);
  const maladiesEnCours = useAppSelector(selectNombreMaladiesEnCours);
  const traitementsEnCours = useAppSelector(selectNombreTraitementsEnCours);
  const alertesCritiques = useAppSelector(selectNombreAlertesCritiques);
  const loading = useAppSelector(selectSanteLoading);

  const hasAlertes = vaccinationsEnRetard > 0 || alertesCritiques > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: hasAlertes ? colors.error : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="medical" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Santé</Text>
        </View>
        {hasAlertes && (
          <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
            <Ionicons name="warning" size={14} color="#fff" />
          </View>
        )}
      </View>

      {/* Contenu */}
      {loading.vaccinations || loading.maladies || loading.traitements ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          {/* Vaccinations */}
          <View style={styles.stat}>
            <Ionicons
              name="medical-outline"
              size={18}
              color={vaccinationsEnRetard > 0 ? colors.error : colors.textSecondary}
            />
            <Text
              style={[
                styles.statText,
                {
                  color: vaccinationsEnRetard > 0 ? colors.error : colors.textSecondary,
                },
              ]}
            >
              {vaccinationsEnRetard > 0
                ? `${vaccinationsEnRetard} vaccin(s) en retard`
                : 'Vaccinations à jour'}
            </Text>
          </View>

          {/* Maladies */}
          {maladiesEnCours > 0 && (
            <View style={styles.stat}>
              <Ionicons name="bug-outline" size={18} color={colors.warning} />
              <Text style={[styles.statText, { color: colors.warning }]}>
                {maladiesEnCours} maladie(s) en cours
              </Text>
            </View>
          )}

          {/* Traitements */}
          {traitementsEnCours > 0 && (
            <View style={styles.stat}>
              <Ionicons name="bandage-outline" size={18} color={colors.info} />
              <Text style={[styles.statText, { color: colors.info }]}>
                {traitementsEnCours} traitement(s) actif(s)
              </Text>
            </View>
          )}

          {/* Alertes critiques */}
          {alertesCritiques > 0 && (
            <View style={[styles.criticalAlert, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.criticalAlertText, { color: colors.error }]}>
                {alertesCritiques} alerte(s) critique(s)
              </Text>
            </View>
          )}

          {/* Message si tout va bien */}
          {maladiesEnCours === 0 &&
            traitementsEnCours === 0 &&
            vaccinationsEnRetard === 0 &&
            alertesCritiques === 0 && (
              <View style={styles.stat}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={[styles.statText, { color: colors.success }]}>
                  Cheptel en bonne santé
                </Text>
              </View>
            )}
        </View>
      )}

      {/* Pied de page */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.primary }]}>Voir détails</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  alertBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  body: {
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  criticalAlertText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
