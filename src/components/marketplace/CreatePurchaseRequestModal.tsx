/**
 * Modal pour créer une demande d'achat (Purchase Request)
 * Accessible uniquement pour les acheteurs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING } from '../../constants/theme';
import { RACES_LIST } from '../../constants/races';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getDatabase } from '../../services/database';
import { getPurchaseRequestService } from '../../services/PurchaseRequestService';
import { PurchaseRequestRepository } from '../../database/repositories/PurchaseRequestRepository';

interface CreatePurchaseRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  buyerId: string;
  editRequest?: any; // PurchaseRequest à modifier (optionnel)
}

const AGE_CATEGORIES = [
  { value: 'jeunes', label: 'Jeunes (0-3 mois)' },
  { value: 'engraissement', label: 'Engraissement (3-8 mois)' },
  { value: 'finis', label: 'Finis (>8 mois)' },
  { value: 'tous', label: 'Tous âges' },
];

export default function CreatePurchaseRequestModal({
  visible,
  onClose,
  onSuccess,
  buyerId,
  editRequest,
}: CreatePurchaseRequestModalProps) {
  const { colors } = MarketplaceTheme;
  const { location, getCurrentLocation } = useGeolocation();

  // Debug: Log quand le modal devient visible
  useEffect(() => {
    if (visible) {
      console.log('🔄 [CreatePurchaseRequestModal] Modal visible:', visible, 'editRequest:', editRequest?.id);
    }
  }, [visible, editRequest]);

  const [title, setTitle] = useState('');
  const [race, setRace] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [ageCategory, setAgeCategory] = useState<string>('');
  const [minAgeMonths, setMinAgeMonths] = useState('');
  const [maxAgeMonths, setMaxAgeMonths] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState('');
  const [deliveryDepartment, setDeliveryDepartment] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('50');
  const [maxPricePerKg, setMaxPricePerKg] = useState('');
  const [maxTotalPrice, setMaxTotalPrice] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRacePicker, setShowRacePicker] = useState(false);

  // Initialiser les champs si on est en mode édition
  useEffect(() => {
    if (visible && editRequest) {
      setTitle(editRequest.title || '');
      setRace(editRequest.race || '');
      setMinWeight(editRequest.minWeight?.toString() || '');
      setMaxWeight(editRequest.maxWeight?.toString() || '');
      setAgeCategory(editRequest.ageCategory || '');
      setMinAgeMonths(editRequest.minAgeMonths?.toString() || '');
      setMaxAgeMonths(editRequest.maxAgeMonths?.toString() || '');
      setQuantity(editRequest.quantity?.toString() || '');
      setDeliveryCity(editRequest.deliveryLocation?.city || '');
      setDeliveryRegion(editRequest.deliveryLocation?.region || '');
      setDeliveryDepartment(editRequest.deliveryLocation?.department || '');
      setDeliveryRadius(editRequest.deliveryLocation?.radiusKm?.toString() || '50');
      setMaxPricePerKg(editRequest.maxPricePerKg?.toString() || '');
      setMaxTotalPrice(editRequest.maxTotalPrice?.toString() || '');
      setDeliveryDate(editRequest.deliveryDate || '');
      setMessage(editRequest.message || '');
    } else if (visible && !editRequest) {
      // Réinitialiser les champs si on est en mode création
      setTitle('');
      setRace('');
      setMinWeight('');
      setMaxWeight('');
      setAgeCategory('');
      setMinAgeMonths('');
      setMaxAgeMonths('');
      setQuantity('');
      setDeliveryCity('');
      setDeliveryRegion('');
      setDeliveryDepartment('');
      setDeliveryRadius('50');
      setMaxPricePerKg('');
      setMaxTotalPrice('');
      setDeliveryDate('');
      setMessage('');
    }
  }, [visible, editRequest]);

  const handleSubmit = async () => {
    // Validation
    if (!minWeight || !maxWeight) {
      Alert.alert('Erreur', 'Le poids min et max sont obligatoires');
      return;
    }
    if (parseFloat(minWeight) >= parseFloat(maxWeight)) {
      Alert.alert('Erreur', 'Le poids max doit être supérieur au poids min');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const service = getPurchaseRequestService(db);

      // Obtenir la localisation si disponible
      let deliveryLocation: any = undefined;
      if (location) {
        deliveryLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          city: deliveryCity || location.city,
          region: deliveryRegion || location.region,
          department: deliveryDepartment,
          radiusKm: parseFloat(deliveryRadius) || 50,
        };
      } else if (deliveryCity || deliveryRegion) {
        // Utiliser la localisation textuelle si pas de GPS
        deliveryLocation = {
          city: deliveryCity,
          region: deliveryRegion,
          department: deliveryDepartment,
          radiusKm: parseFloat(deliveryRadius) || 50,
        };
      }

      if (editRequest) {
        // Mode édition
        try {
          const db = await getDatabase();
          const repo = new PurchaseRequestRepository(db);
          
          // Construire l'objet de mise à jour
          const updates: any = {
            title: title.trim() || undefined,
            race: race && race !== 'Peu importe' ? race : 'Peu importe',
            minWeight: parseFloat(minWeight),
            maxWeight: parseFloat(maxWeight),
            quantity: parseInt(quantity),
          };

          // Ajouter les champs optionnels seulement s'ils ont des valeurs
          if (ageCategory) updates.ageCategory = ageCategory;
          if (minAgeMonths) updates.minAgeMonths = parseInt(minAgeMonths);
          if (maxAgeMonths) updates.maxAgeMonths = parseInt(maxAgeMonths);
          if (maxPricePerKg) updates.maxPricePerKg = parseFloat(maxPricePerKg);
          if (maxTotalPrice) updates.maxTotalPrice = parseFloat(maxTotalPrice);
          if (deliveryDate) updates.deliveryDate = deliveryDate;
          if (message.trim()) updates.message = message.trim();

          // Gérer deliveryLocation : utiliser la nouvelle localisation si disponible, sinon garder l'ancienne
          let finalDeliveryLocation = deliveryLocation;
          if (!finalDeliveryLocation && (deliveryCity || deliveryRegion || deliveryDepartment)) {
            // Si on a au moins une information de localisation textuelle, créer l'objet
            finalDeliveryLocation = {
              // Conserver les coordonnées GPS existantes si disponibles
              latitude: editRequest.deliveryLocation?.latitude,
              longitude: editRequest.deliveryLocation?.longitude,
              address: editRequest.deliveryLocation?.address,
              city: deliveryCity || editRequest.deliveryLocation?.city,
              region: deliveryRegion || editRequest.deliveryLocation?.region,
              department: deliveryDepartment || editRequest.deliveryLocation?.department,
              radiusKm: parseFloat(deliveryRadius) || editRequest.deliveryLocation?.radiusKm || 50,
            };
          } else if (!finalDeliveryLocation && editRequest.deliveryLocation) {
            // Si aucune nouvelle localisation n'est fournie, garder l'ancienne
            finalDeliveryLocation = editRequest.deliveryLocation;
          }

          if (finalDeliveryLocation) {
            updates.deliveryLocation = finalDeliveryLocation;
          }

          await repo.update(editRequest.id, updates);

          Alert.alert('Succès', 'Votre demande d\'achat a été modifiée.');
        } catch (error: any) {
          console.error('Erreur lors de la modification:', error);
          Alert.alert('Erreur', error?.message || 'Impossible de modifier la demande d\'achat');
          setLoading(false);
          return;
        }
      } else {
        // Mode création
        await service.createPurchaseRequest({
          buyerId,
          title: title.trim() || undefined,
          race: race && race !== 'Peu importe' ? race : undefined,
          minWeight: parseFloat(minWeight),
          maxWeight: parseFloat(maxWeight),
          ageCategory: ageCategory || undefined,
          minAgeMonths: minAgeMonths ? parseInt(minAgeMonths) : undefined,
          maxAgeMonths: maxAgeMonths ? parseInt(maxAgeMonths) : undefined,
          quantity: parseInt(quantity),
          deliveryLocation,
          maxPricePerKg: maxPricePerKg ? parseFloat(maxPricePerKg) : undefined,
          maxTotalPrice: maxTotalPrice ? parseFloat(maxTotalPrice) : undefined,
          deliveryDate: deliveryDate || undefined,
          message: message.trim() || undefined,
        });

        Alert.alert('Succès', 'Votre demande d\'achat a été créée. Les producteurs correspondants seront notifiés.');
      }
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de créer la demande d\'achat');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setRace('');
    setMinWeight('');
    setMaxWeight('');
    setAgeCategory('');
    setMinAgeMonths('');
    setMaxAgeMonths('');
    setQuantity('');
    setDeliveryCity('');
    setDeliveryRegion('');
    setDeliveryDepartment('');
    setDeliveryRadius('50');
    setMaxPricePerKg('');
    setMaxTotalPrice('');
    setDeliveryDate('');
    setMessage('');
    setShowRacePicker(false);
    onClose();
  };

  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      Alert.alert('Succès', 'Localisation obtenue');
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation');
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header fixe */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editRequest ? 'Modifier la demande d\'achat' : 'Créer une demande d\'achat'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
              {/* Titre */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Titre du besoin</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Besoin de porcs d'engraissement"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Race */}
              <View style={[styles.field, styles.raceFieldContainer]}>
                <Text style={[styles.label, { color: colors.text }]}>Race</Text>
                <View style={styles.racePickerContainer}>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setShowRacePicker(!showRacePicker)}
                  >
                    <Text style={[styles.pickerText, { color: race ? colors.text : colors.textSecondary }]}>
                      {race || 'Sélectionner une race'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showRacePicker && (
                    <View style={[styles.pickerDropdown, { backgroundColor: colors.surfaceSolid || '#FFFFFF', borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }]}>
                      <ScrollView 
                        nestedScrollEnabled={true} 
                        style={[styles.pickerScrollView, { backgroundColor: colors.surfaceSolid || '#FFFFFF', maxHeight: 200 }]}
                      >
                        <TouchableOpacity
                          style={[styles.pickerOption, { backgroundColor: colors.surfaceSolid || '#FFFFFF', borderBottomColor: colors.divider }]}
                          onPress={() => {
                            setRace('Peu importe');
                            setShowRacePicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text, fontWeight: '600' }]}>Peu importe</Text>
                        </TouchableOpacity>
                        {RACES_LIST.map((r) => (
                          <TouchableOpacity
                            key={r}
                            style={[styles.pickerOption, { backgroundColor: colors.surfaceSolid || '#FFFFFF', borderBottomColor: colors.divider }]}
                            onPress={() => {
                              setRace(r);
                              setShowRacePicker(false);
                            }}
                          >
                            <Text style={[styles.pickerOptionText, { color: colors.text }]}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Poids */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Poids vif souhaité (kg) *</Text>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={minWeight}
                      onChangeText={setMinWeight}
                      placeholder="Min"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={maxWeight}
                      onChangeText={setMaxWeight}
                      placeholder="Max"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Âge */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Catégorie d'âge</Text>
                <View style={styles.row}>
                  {AGE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.ageCategoryButton,
                        ageCategory === cat.value && { backgroundColor: colors.primary },
                        { borderColor: colors.border },
                      ]}
                      onPress={() => setAgeCategory(cat.value)}
                    >
                      <Text
                        style={[
                          styles.ageCategoryText,
                          { color: ageCategory === cat.value ? colors.textOnPrimary : colors.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.row} style={{ marginTop: SPACING.sm }}>
                  <View style={styles.halfField}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={minAgeMonths}
                      onChangeText={setMinAgeMonths}
                      placeholder="Âge min (mois)"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={maxAgeMonths}
                      onChangeText={setMaxAgeMonths}
                      placeholder="Âge max (mois)"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Quantité */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Quantité souhaitée (têtes) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Ex: 10"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Localisation */}
              <View style={styles.field}>
                <View style={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.label, { color: colors.text }]}>Localisation de livraison</Text>
                  <TouchableOpacity onPress={handleGetLocation} style={styles.locationButton}>
                    <Ionicons name="location" size={16} color={colors.primary} />
                    <Text style={[styles.locationButtonText, { color: colors.primary }]}>Utiliser ma position</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={deliveryCity}
                  onChangeText={setDeliveryCity}
                  placeholder="Ville"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: SPACING.sm }]}
                  value={deliveryRegion}
                  onChangeText={setDeliveryRegion}
                  placeholder="Région"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: SPACING.sm }]}
                  value={deliveryDepartment}
                  onChangeText={setDeliveryDepartment}
                  placeholder="Département (optionnel)"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: SPACING.sm }]}
                  value={deliveryRadius}
                  onChangeText={setDeliveryRadius}
                  placeholder="Rayon (km)"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Prix */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Prix maximum souhaité</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={maxPricePerKg}
                  onChangeText={setMaxPricePerKg}
                  placeholder="Prix max au kg (FCFA)"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.label, { color: colors.text, marginTop: SPACING.sm }]}>ou Prix total maximum</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={maxTotalPrice}
                  onChangeText={setMaxTotalPrice}
                  placeholder="Prix total max (FCFA)"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Date de livraison */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Date souhaitée de livraison</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Message */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Message / Remarques</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Informations complémentaires..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
        </ScrollView>

        {/* Footer fixe */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
                <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>
                  {editRequest ? 'Enregistrer les modifications' : 'Publier la demande'}
                </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? SPACING.xl + 8 : SPACING.lg + 24,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  raceFieldContainer: {
    zIndex: 1,
  },
  racePickerContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfField: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pickerText: {
    fontSize: 16,
  },
  pickerDropdown: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    width: '100%',
    overflow: 'hidden',
  },
  pickerScrollView: {
    flexGrow: 0,
  },
  pickerOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerOptionText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ageCategoryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  ageCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.lg + 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

