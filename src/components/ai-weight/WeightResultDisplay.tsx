/**
 * Composant pour afficher les résultats de pesée IA
 * Format selon README: "PORC #001 | Nom: ELLA | Poids: 25.3kg ±1.2kg | Confiance: 94%"
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  WeightEstimationResponse,
  BatchWeightEstimationResponse,
} from '../../services/aiWeightService';

interface WeightResultDisplayProps {
  result: WeightEstimationResponse | BatchWeightEstimationResponse;
}

export const WeightResultDisplay: React.FC<WeightResultDisplayProps> = ({
  result,
}) => {
  const formatResult = (
    result: WeightEstimationResponse | BatchWeightEstimationResponse,
  ): string[] => {
    const lines: string[] = [];

    if ('predictions' in result && result.predictions) {
      // Mode batch
      for (const pred of result.predictions) {
        const code = pred.pig_id || 'UNKNOWN';
        const name = pred.name || '';
        const weight = pred.weight_kg.toFixed(1);
        const margin = pred.interval.margin.toFixed(1);
        const confidence = Math.round(pred.confidence * 100);

        lines.push(
          `PORC #${code} | Nom: ${name} | Poids: ${weight}kg ±${margin}kg | Confiance: ${confidence}%`,
        );
      }

      // Porcs non identifiés
      if (result.unidentified && result.unidentified.length > 0) {
        lines.push('');
        lines.push('⚠️ Porcs non détectés:');
        for (const id of result.unidentified) {
          lines.push(`  - ${id}`);
        }
      }
    } else if ('weight_estimation' in result && result.weight_estimation) {
      // Mode individuel
      const code = result.pig_id || 'UNKNOWN';
      const weight = result.weight_estimation.weight_kg.toFixed(1);
      const margin = result.weight_estimation.interval.margin.toFixed(1);
      const confidence = Math.round(
        result.weight_estimation.confidence * 100,
      );

      lines.push(
        `PORC #${code} | Poids: ${weight}kg ±${margin}kg | Confiance: ${confidence}%`,
      );

      // Avertissements
      if (result.warnings && result.warnings.length > 0) {
        lines.push('');
        lines.push('⚠️ Avertissements:');
        for (const warning of result.warnings) {
          lines.push(`  - ${warning}`);
        }
      }
    }

    return lines;
  };

  const lines = formatResult(result);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {lines.map((line, index) => (
          <Text
            key={index}
            style={[
              styles.line,
              line.startsWith('⚠️') && styles.warningLine,
            ]}
          >
            {line}
          </Text>
        ))}

        {'processing_time_ms' in result && result.processing_time_ms && (
          <Text style={styles.processingTime}>
            Temps de traitement: {result.processing_time_ms}ms
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  line: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  warningLine: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
  processingTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

