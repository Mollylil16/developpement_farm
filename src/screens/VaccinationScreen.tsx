/**
 * VaccinationScreen - Interface moderne de gestion des vaccinations (UNIFIÉ)
 *
 * Supporte les deux modes d'élevage :
 * - Mode Individuel : Vaccinations par animal
 * - Mode Bande : Vaccinations par bande (batch)
 *
 * Architecture:
 * - Hook: useVaccinationLogic (logique métier, calculs)
 * - Composants: VaccinationStatsCard, VaccinationTypeCard (UI)
 * - Helpers: vaccinationHelpers (fonctions utilitaires)
 * - Écran: Orchestration uniquement
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useVaccinationLogic } from '../hooks/useVaccinationLogic';
import { useModeElevage } from '../hooks/useModeElevage';
import VaccinationStatsCard from '../components/VaccinationStatsCard';
import VaccinationTypeCard from '../components/VaccinationTypeCard';
import VaccinationFormModal from '../components/VaccinationFormModal';
import CalendrierVaccinalModal from '../components/CalendrierVaccinalModal';
import { getIconeType, getCouleurType } from '../utils/vaccinationHelpers';
import StandardHeader from '../components/StandardHeader';
import apiClient from '../services/api/apiClient';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

// Type pour les paramètres de route (mode batch)
type VaccinationRouteParams = {
  batch?: {
    id: string;
    pen_name: string;
    total_count: number;
  };
};

export default function VaccinationScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: VaccinationRouteParams }, 'params'>>();
  const mode = useModeElevage();
  const logic = useVaccinationLogic();
  
  // Paramètres batch (si navigation depuis une bande)
  const batch = route.params?.batch;
  const isBatchMode = mode === 'bande' || !!batch;
  
  // État pour le mode batch
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Charger les données batch si nécessaire
  useEffect(() => {
    if (isBatchMode && batch?.id) {
      loadBatchStatus();
    }
  }, [batch?.id, isBatchMode]);

  async function loadBatchStatus() {
    if (!batch?.id) return;
    
    setBatchLoading(true);
    try {
      const data = await apiClient.get(`/batch-vaccinations/batch/${batch.id}/status`);
      setBatchStatus(data);
    } catch (error: any) {
      console.error('Erreur chargement statut batch:', error);
    } finally {
      setBatchLoading(false);
    }
  }

  if (!logic.projetActif) {
    return null; // Géré par ProtectedScreen parent
  }

  // Si mode batch avec batch spécifique, afficher vue batch
  if (isBatchMode && batch) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <StandardHeader
          icon="medical"
          title={`Vaccinations - ${batch.pen_name}`}
          subtitle={`${batch.total_count} porc(s)`}
        />
        
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={batchLoading}
              onRefresh={loadBatchStatus}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {batchLoading && !batchStatus ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Chargement...
              </Text>
            </View>
          ) : batchStatus?.by_vaccine ? (
            Object.entries(batchStatus.by_vaccine).map(([type, stats]: [string, any]) => {
              // Convertir le type batch en TypeProphylaxie
              const typeProphylaxie = mapBatchVaccineTypeToProphylaxie(type);
              return (
                <VaccinationTypeCard
                  key={type}
                  stat={{
                    type_prophylaxie: typeProphylaxie,
                    nom_type: getNomTypeFromBatchType(type),
                    total_vaccinations: stats.total || 0,
                    porcs_vaccines: stats.vaccinated || 0,
                    total_porcs: stats.total || 0,
                    taux_couverture: stats.total > 0 
                      ? Math.round((stats.vaccinated / stats.total) * 100) 
                      : 0,
                    en_retard: stats.not_vaccinated || 0,
                    dernier_traitement: undefined,
                    cout_total: 0,
                  }}
                  icone={getIconeType(typeProphylaxie)}
                  couleur={getCouleurType(typeProphylaxie)}
                  onAjouter={() => {
                    logic.setTypeSelectionne(typeProphylaxie);
                    logic.setModalAddVisible(true);
                  }}
                  onVoirCalendrier={() => {
                    logic.setTypeSelectionne(typeProphylaxie);
                    logic.setModalCalendrierVisible(true);
                  }}
                />
              );
            })
          ) : (
            <View style={styles.centerContent}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune donnée de vaccination disponible
              </Text>
            </View>
          )}
        </ScrollView>

        <VaccinationFormModal
          visible={logic.modalAddVisible}
          onClose={() => logic.setModalAddVisible(false)}
          typeInitial={logic.typeSelectionne || undefined}
          batchId={batch.id}
        />

        {logic.typeSelectionne && (
          <CalendrierVaccinalModal
            visible={logic.modalCalendrierVisible}
            onClose={() => logic.setModalCalendrierVisible(false)}
            typeProphylaxie={logic.typeSelectionne}
          />
        )}
        
        <ChatAgentFAB />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={logic.refreshing}
            onRefresh={logic.onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Carte récapitulative des statistiques globales */}
        <VaccinationStatsCard stats={logic.statsGlobales} />

        {/* Cartes par type de prophylaxie */}
        {logic.statParType.map((stat) => (
          <VaccinationTypeCard
            key={stat.type_prophylaxie}
            stat={stat}
            icone={getIconeType(stat.type_prophylaxie)}
            couleur={getCouleurType(stat.type_prophylaxie)}
            onAjouter={logic.handleOuvrirModalAjout}
            onVoirCalendrier={logic.handleOuvrirCalendrier}
          />
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modale d'ajout de vaccination */}
      <VaccinationFormModal
        visible={logic.modalAddVisible}
        onClose={() => logic.setModalAddVisible(false)}
        typeInitial={logic.typeSelectionne || undefined}
      />

      {/* Modale du calendrier vaccinal */}
      {logic.typeSelectionne && (
        <CalendrierVaccinalModal
          visible={logic.modalCalendrierVisible}
          onClose={() => logic.setModalCalendrierVisible(false)}
          typeProphylaxie={logic.typeSelectionne}
        />
      )}
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

// Helper pour mapper les types batch vers TypeProphylaxie
function mapBatchVaccineTypeToProphylaxie(batchType: string): any {
  const mapping: Record<string, any> = {
    vitamines: 'vitamine',
    deparasitant: 'deparasitant',
    fer: 'fer',
    antibiotiques: 'antibiotique_preventif',
    autre: 'autre_traitement',
  };
  return mapping[batchType] || 'autre_traitement';
}

// Helper pour obtenir le nom du type depuis le type batch
function getNomTypeFromBatchType(batchType: string): string {
  const labels: Record<string, string> = {
    vitamines: 'Vitamines',
    deparasitant: 'Déparasitant',
    fer: 'Fer',
    antibiotiques: 'Antibiotiques',
    autre: 'Autre',
  };
  return labels[batchType] || 'Autre';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 24,
  },
});
