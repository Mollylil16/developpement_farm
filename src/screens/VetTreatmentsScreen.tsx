/**
 * Écran "Traitements prescrits" pour un projet spécifique
 * Affiche les traitements d'un projet donné pour les vétérinaires
 */

import React, { useEffect } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch } from '../store/hooks';
import { selectProjetCollaboratif } from '../store/slices/collaborationSlice';
import StandardHeader from '../components/StandardHeader';
import TraitementsComponentNew from '../components/TraitementsComponentNew';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type RouteParams = {
  VetTreatments: {
    projetId: string;
  };
};

export default function VetTreatmentsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<RouteParams, 'VetTreatments'>>();
  const projetId = route.params?.projetId;

  // S'assurer que le projet collaboratif est sélectionné pour que TraitementsComponentNew utilise le bon projet
  useEffect(() => {
    if (projetId) {
      dispatch(selectProjetCollaboratif(projetId));
    }
  }, [projetId, dispatch]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="flask-outline"
        title="Traitements prescrits"
        subtitle="Traitements du projet"
        onBack={() => navigation.goBack()}
      />

      <TraitementsComponentNew />
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
