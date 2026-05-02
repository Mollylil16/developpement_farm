/**
 * Composant ReportCard - Carte réutilisable pour chaque type de rapport
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';

export interface ReportCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onDownloadPDF?: () => Promise<void>;
  onDownloadExcel?: () => Promise<void>;
  loadingPDF?: boolean;
  loadingExcel?: boolean;
  hasPDF?: boolean;
  hasExcel?: boolean;
}

export default function ReportCard({
  title,
  description,
  icon,
  iconColor,
  onDownloadPDF,
  onDownloadExcel,
  loadingPDF = false,
  loadingExcel = false,
  hasPDF = true,
  hasExcel = true,
}: ReportCardProps) {
  const { colors } = useTheme();
  const defaultIconColor = iconColor || colors.primary;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: defaultIconColor + '20' }]}>
          <Ionicons name={icon} size={32} color={defaultIconColor} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

      <View style={styles.actionsContainer}>
        {hasPDF && onDownloadPDF && (
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.error }]}
            onPress={onDownloadPDF}
            disabled={loadingPDF || loadingExcel}
          >
            {loadingPDF ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {hasExcel && onDownloadExcel && (
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.success }]}
            onPress={onDownloadExcel}
            disabled={loadingPDF || loadingExcel}
          >
            {loadingExcel ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="document-outline" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Excel</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  description: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

