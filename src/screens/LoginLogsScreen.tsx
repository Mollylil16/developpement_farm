/**
 * Écran: Journal de connexion (login logs)
 * Affiche l'historique des connexions/refresh/logout de l'utilisateur.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import StandardHeader from '../components/StandardHeader';
import apiClient from '../services/api/apiClient';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { getErrorMessage } from '../types/common';

type AuthLog = {
  id: string;
  endpoint: string;
  method: string;
  ip: string | null;
  user_agent: string | null;
  success: boolean;
  error: string | null;
  created_at: string;
};

export default function LoginLogsScreen() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await apiClient.get<AuthLog[]>('/auth/login-logs', { params: { limit: 100 } });
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Erreur lors du chargement du journal');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const renderItem = ({ item }: { item: AuthLog }) => {
    const dt = item.created_at ? new Date(item.created_at) : null;
    const dateLabel = dt ? dt.toLocaleString('fr-FR') : '';
    const statusLabel = item.success ? 'Succès' : 'Échec';
    const statusColor = item.success ? colors.success : colors.error;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.method} {item.endpoint}
          </Text>
          <Text style={[styles.badge, { color: statusColor }]}>● {statusLabel}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {dateLabel} {item.ip ? `• ${item.ip}` : ''}
        </Text>
        {!!item.error && (
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
            {item.error}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StandardHeader icon="lock" title="Journal de connexion" subtitle="Historique des connexions à l'app" />

      {error ? (
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Aucun log trouvé.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  title: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, flex: 1 },
  badge: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  meta: { marginTop: 6, fontSize: FONT_SIZES.sm },
  errorText: { marginTop: 6, fontSize: FONT_SIZES.sm },
  center: { padding: SPACING.xl, alignItems: 'center' },
  empty: { fontSize: FONT_SIZES.md, fontStyle: 'italic' },
  errorTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, textAlign: 'center' },
});


