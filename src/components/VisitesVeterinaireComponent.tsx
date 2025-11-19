/**
 * Composant Visites Vétérinaires - Liste et gestion des visites
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControlProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { selectAllVisitesVeterinaires } from '../store/selectors/santeSelectors';

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function VisitesVeterinaireComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  const visites = useAppSelector(selectAllVisitesVeterinaires);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} refreshControl={refreshControl}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Visites Vétérinaires ({visites.length})</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700' },
});

