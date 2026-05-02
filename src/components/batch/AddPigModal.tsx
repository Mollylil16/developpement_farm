/**
 * Modal pour ajouter un sujet à une bande
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { Batch } from '../../types/batch';
import Button from '../Button';
import apiClient from '../../services/api/apiClient';

interface AddPigModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
}

export default function AddPigModal({ visible, batch, onClose }: AddPigModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'castrated'>('male');
  const [ageMonths, setAgeMonths] = useState('');
  const [weight, setWeight] = useState('');
  const [origin, setOrigin] = useState<'birth' | 'purchase' | 'transfer' | 'other'>('purchase');
  const [supplierName, setSupplierName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Erreur', 'Le poids est obligatoire');
      return;
    }

    if (origin === 'purchase' && !supplierName) {
      Alert.alert('Erreur', 'Le nom du fournisseur est requis pour un achat');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/batch-pigs', {
        batch_id: batch.id,
        name: name || null,
        sex,
        age_months: ageMonths ? parseFloat(ageMonths) : null,
        current_weight_kg: parseFloat(weight),
        origin,
        supplier_name: supplierName || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        notes: notes || null,
        entry_date: new Date().toISOString().split('T')[0],
      });

      Alert.alert('Succès', 'Sujet ajouté avec succès', [
        { text: 'OK', onPress: onClose },
      ]);
      
      // Reset form
      setName('');
      setSex('male');
      setAgeMonths('');
      setWeight('');
      setOrigin('purchase');
      setSupplierName('');
      setPurchasePrice('');
      setNotes('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'ajouter le sujet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Ajouter un sujet</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Sexe */}
          <Text style={[styles.label, { color: colors.text }]}>Sexe *</Text>
          <View style={styles.sexButtons}>
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                sex === 'male' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setSex('male')}
            >
              <Text style={[styles.sexButtonText, { color: colors.text }]}>♂ Mâle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                sex === 'female' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setSex('female')}
            >
              <Text style={[styles.sexButtonText, { color: colors.text }]}>♀ Femelle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                sex === 'castrated' && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
              ]}
              onPress={() => setSex('castrated')}
            >
              <Text style={[styles.sexButtonText, { color: colors.text }]}>⚥ Castré</Text>
            </TouchableOpacity>
          </View>

          {/* Nom */}
          <Text style={[styles.label, { color: colors.text }]}>Nom/Numéro (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: P001"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Âge */}
          <Text style={[styles.label, { color: colors.text }]}>Âge en mois (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={ageMonths}
            onChangeText={setAgeMonths}
            keyboardType="decimal-pad"
            placeholder="Ex: 3.5"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Poids */}
          <Text style={[styles.label, { color: colors.text }]}>Poids actuel (kg) *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="Ex: 35.5"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Origine */}
          <Text style={[styles.label, { color: colors.text }]}>Origine *</Text>
          <View style={styles.originButtons}>
            {(['purchase', 'birth', 'transfer', 'other'] as const).map((orig) => (
              <TouchableOpacity
                key={orig}
                style={[
                  styles.originButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  origin === orig && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                ]}
                onPress={() => setOrigin(orig)}
              >
                <Text style={[styles.originButtonText, { color: colors.text }]}>
                  {orig === 'purchase' ? 'Achat' : orig === 'birth' ? 'Naissance' : orig === 'transfer' ? 'Transfert' : 'Autre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fournisseur (si achat) */}
          {origin === 'purchase' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Nom du fournisseur *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Ex: Ferme Kouassi"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Prix d'achat (FCFA)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="numeric"
                placeholder="Ex: 25000"
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          {/* Notes */}
          <Text style={[styles.label, { color: colors.text }]}>Notes (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Observations particulières..."
            placeholderTextColor={colors.textSecondary}
          />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={onClose}
            style={styles.cancelButton}
          />
          <Button
            title="Ajouter"
            onPress={handleSubmit}
            loading={loading}
            disabled={!weight || !sex || (origin === 'purchase' && !supplierName)}
            style={styles.submitButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sexButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sexButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  sexButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  originButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  originButton: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  originButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

