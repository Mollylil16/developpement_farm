/**
 * Modal pour configurer les unités de mesure
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import CustomModal from '../../../CustomModal';
import { logger } from '../../../../utils/logger';

const UNITS_STORAGE_KEY = '@fermier_pro:units';

const WEIGHT_UNITS = [
  { code: 'kg', name: 'Kilogrammes (kg)', symbol: 'kg' },
  { code: 'g', name: 'Grammes (g)', symbol: 'g' },
  { code: 't', name: 'Tonnes (t)', symbol: 't' },
];

const DISTANCE_UNITS = [
  { code: 'km', name: 'Kilomètres (km)', symbol: 'km' },
  { code: 'm', name: 'Mètres (m)', symbol: 'm' },
];

interface UnitsSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UnitsSettingsModal({ visible, onClose }: UnitsSettingsModalProps) {
  const { colors } = useTheme();
  const [weightUnit, setWeightUnit] = useState('kg');
  const [distanceUnit, setDistanceUnit] = useState('km');

  useEffect(() => {
    if (visible) {
      loadUnits();
    }
  }, [visible]);

  const loadUnits = async () => {
    try {
      const saved = await AsyncStorage.getItem(UNITS_STORAGE_KEY);
      if (saved) {
        const units = JSON.parse(saved);
        setWeightUnit(units.weight || 'kg');
        setDistanceUnit(units.distance || 'km');
      }
    } catch (error) {
      logger.error('Erreur chargement unités:', error);
    }
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(
        UNITS_STORAGE_KEY,
        JSON.stringify({ weight: weightUnit, distance: distanceUnit })
      );
      onClose();
    } catch (error) {
      logger.error('Erreur sauvegarde unités:', error);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Unités de mesure"
      confirmText="Enregistrer"
      onConfirm={handleSave}
    >
      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Poids</Text>
        {WEIGHT_UNITS.map((unit) => (
          <TouchableOpacity
            key={unit.code}
            style={[
              styles.unitOption,
              {
                backgroundColor: weightUnit === unit.code ? colors.primary + '15' : colors.surface,
                borderColor: weightUnit === unit.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setWeightUnit(unit.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitName, { color: colors.text }]}>{unit.name}</Text>
            {weightUnit === unit.code && (
              <View style={[styles.checkMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
          Distance
        </Text>
        {DISTANCE_UNITS.map((unit) => (
          <TouchableOpacity
            key={unit.code}
            style={[
              styles.unitOption,
              {
                backgroundColor:
                  distanceUnit === unit.code ? colors.primary + '15' : colors.surface,
                borderColor: distanceUnit === unit.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setDistanceUnit(unit.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitName, { color: colors.text }]}>{unit.name}</Text>
            {distanceUnit === unit.code && (
              <View style={[styles.checkMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  unitName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
