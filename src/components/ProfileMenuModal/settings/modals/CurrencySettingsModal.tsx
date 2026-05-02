/**
 * Modal pour configurer la devise
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import CustomModal from '../../../CustomModal';
import { logger } from '../../../../utils/logger';

const CURRENCY_STORAGE_KEY = '@fermier_pro:currency';

const CURRENCIES = [
  { code: 'FCFA', symbol: 'FCFA', name: 'Franc CFA', flag: '🇨🇲' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', symbol: '$', name: 'Dollar US', flag: '🇺🇸' },
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (Ouest)', flag: '🇸🇳' },
];

interface CurrencySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CurrencySettingsModal({ visible, onClose }: CurrencySettingsModalProps) {
  const { colors } = useTheme();
  const [selectedCurrency, setSelectedCurrency] = useState('FCFA');

  useEffect(() => {
    if (visible) {
      loadCurrency();
    }
  }, [visible]);

  const loadCurrency = async () => {
    try {
      const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved) {
        setSelectedCurrency(saved);
      }
    } catch (error) {
      logger.error('Erreur chargement devise:', error);
    }
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    try {
      setSelectedCurrency(currencyCode);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
      onClose();
    } catch (error) {
      logger.error('Erreur sauvegarde devise:', error);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Sélectionner la devise"
      showButtons={false}
    >
      <ScrollView style={styles.content}>
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyOption,
              {
                backgroundColor:
                  selectedCurrency === currency.code ? colors.primary + '15' : colors.surface,
                borderColor: selectedCurrency === currency.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleSelectCurrency(currency.code)}
            activeOpacity={0.7}
          >
            <View style={styles.currencyContent}>
              <Text style={styles.currencyFlag}>{currency.flag}</Text>
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyName, { color: colors.text }]}>{currency.name}</Text>
                <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>
                  {currency.code} ({currency.symbol})
                </Text>
              </View>
            </View>
            {selectedCurrency === currency.code && (
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
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  currencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyFlag: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  currencyCode: {
    fontSize: FONT_SIZES.sm,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
