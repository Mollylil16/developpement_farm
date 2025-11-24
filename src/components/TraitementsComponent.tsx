/**
 * Composant Traitements - Liste et gestion des traitements médicaux
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControlProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { selectAllTraitements, selectTraitementsEnCours } from '../store/selectors/santeSelectors';

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function TraitementsComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  const traitements = useAppSelector(selectAllTraitements);
  const traitementsEnCours = useAppSelector(selectTraitementsEnCours);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={refreshControl}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Traitements ({traitements.length})
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {traitementsEnCours.length} en cours
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
});
