/**
 * Écran de complément d'information pour les vétérinaires
 * 3 étapes : Documents, Qualifications, Lieu de fonction
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';
import { useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';
import type { RoleType } from '../types/roles';
import MapLocationPickerModal from '../components/MapLocationPickerModal';

interface DocumentFile {
  uri: string;
  name?: string;
  type?: string;
}

const VeterinarianInfoCompletionScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { userId, identifier, profileType, isEmail } =
    (route.params as {
      userId?: string;
      identifier?: string;
      profileType?: RoleType;
      isEmail?: boolean;
    }) || {};

  const [step, setStep] = useState(1); // 1: Documents, 2: Qualifications, 3: Lieu

  // Étape 1: Documents obligatoires
  const [identityCard, setIdentityCard] = useState<DocumentFile | null>(null);
  const [professionalProof, setProfessionalProof] = useState<DocumentFile | null>(null);

  // Étape 2: Qualifications
  const [degree, setDegree] = useState('');
  const [university, setUniversity] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedBy, setLicenseIssuedBy] = useState('');
  const [licenseValidUntil, setLicenseValidUntil] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [yearsOfPractice, setYearsOfPractice] = useState('');

  // Étape 3: Lieu de fonction
  const [workAddress, setWorkAddress] = useState('');
  const [workCity, setWorkCity] = useState('');
  const [workRegion, setWorkRegion] = useState('');
  const [workLocation, setWorkLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const availableSpecializations = [
    'Porcins',
    'Bovins',
    'Volailles',
    'Reproduction',
    'Nutrition animale',
    'Chirurgie',
    'Médecine préventive',
  ];

  // Pré-remplir le numéro de téléphone si disponible
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Si on a un identifier qui est un téléphone, on le note (mais le vétérinaire n'a pas de champ téléphone dans le formulaire)
        // Le téléphone sera mis à jour au niveau User lors de la soumission si nécessaire
        if (userId) {
          // Charger les données utilisateur existantes depuis l'API backend
          const currentUser = await apiClient.get<any>(`/users/${userId}`);
          // Le téléphone sera synchronisé au niveau User, pas besoin de le pré-remplir dans le formulaire vétérinaire
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      }
    };

    loadUserData();
  }, [identifier, isEmail, userId]);

  const pickIdentityCard = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIdentityCard({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || 'identity.jpg',
          type: result.assets[0].type || 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  };

  const pickProfessionalProof = async () => {
    try {
      // Demander à l'utilisateur s'il veut sélectionner une image ou un document PDF
      Alert.alert('Sélectionner un document', 'Choisissez le type de document à télécharger', [
        {
          text: 'Image (recommandé)',
          onPress: async () => {
            try {
              // Demander les permissions pour accéder à la galerie
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Permission requise',
                  "L'application a besoin de l'accès à vos photos pour télécharger le document."
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
              });

              if (!result.canceled && result.assets[0]) {
                setProfessionalProof({
                  uri: result.assets[0].uri,
                  name: result.assets[0].fileName || 'professional_proof.jpg',
                  type: result.assets[0].type || 'image/jpeg',
                });
              }
            } catch (error: unknown) {
              console.error('Erreur sélection image:', error);
              const errorMessage = error instanceof Error ? error.message : '';
              Alert.alert('Erreur', "Impossible de sélectionner l'image. " + errorMessage);
            }
          },
        },
        {
          text: 'Document PDF',
          onPress: async () => {
            try {
              const permissionResult = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
              });

              if (
                permissionResult.type === 'success' &&
                'uri' in permissionResult &&
                permissionResult.uri
              ) {
                setProfessionalProof({
                  uri: permissionResult.uri,
                  name: 'name' in permissionResult ? permissionResult.name : 'professional_proof.pdf',
                  type:
                    'mimeType' in permissionResult
                      ? permissionResult.mimeType
                      : 'application/pdf',
                });
              } else if (permissionResult.type === 'cancel') {
                // L'utilisateur a annulé, ne rien faire
                return;
              }
            } catch (error: unknown) {
              console.error('Erreur sélection document PDF:', error);
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Impossible de sélectionner le document PDF. Essayez de sélectionner une image à la place.';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]);
    } catch (error: unknown) {
      console.error('Erreur pickProfessionalProof:', error);
      Alert.alert(
        'Erreur',
        "Impossible d'ouvrir le sélecteur de documents. " + (error instanceof Error ? error.message : String(error) || '')
      );
    }
  };

  const toggleSpecialization = (spec: string) => {
    if (specializations.includes(spec)) {
      setSpecializations(specializations.filter((s) => s !== spec));
    } else {
      setSpecializations([...specializations, spec]);
    }
  };

  const handleSubmit = async () => {
    if (step < 3) {
      // Validation de l'étape actuelle
      if (step === 1) {
        if (!identityCard || !professionalProof) {
          Alert.alert('Erreur', 'Veuillez télécharger tous les documents obligatoires');
          return;
        }
      } else if (step === 2) {
        if (
          !degree ||
          !university ||
          !graduationYear ||
          !licenseNumber ||
          specializations.length === 0
        ) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
          return;
        }
      } else if (step === 3) {
        if (!workAddress || !workCity || !workLocation) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
          return;
        }
      }
      setStep(step + 1);
      return;
    }

    // Étape finale : soumettre
    try {
      const onboardingService = await getOnboardingService();
      let finalUserId = userId;

      // Si pas de userId mais qu'on a identifier, créer le compte d'abord
      if (!finalUserId && identifier) {
        // Créer le compte utilisateur
        const newUser = await onboardingService.createUser({
          email: isEmail ? identifier : undefined,
          phone: !isEmail ? identifier : undefined,
          firstName: '', // Sera complété plus tard
          lastName: '', // Sera complété plus tard
          password: '', // Pas de mot de passe pour l'instant
          profileType: profileType || 'veterinarian',
        });
        finalUserId = newUser.id;
        // Mettre à jour l'utilisateur dans le store Redux
        dispatch(updateUser(newUser));
      }

      if (!finalUserId) {
        Alert.alert('Erreur', 'Impossible de créer le compte');
        return;
      }

      // Vérifier si le profil existe déjà
      const { UserRepository } = await import('../database/repositories');
      const userRepo = new UserRepository();
      const currentUser = await userRepo.findById(finalUserId);

      // Mettre à jour le numéro de téléphone au niveau User si fourni via identifier
      // Cela évite d'avoir deux numéros différents pour le même utilisateur
      if (identifier && !isEmail && currentUser) {
        const normalizedPhone = identifier.trim().replace(/\s+/g, '');
        if (normalizedPhone !== currentUser.telephone) {
          await userRepo.update(finalUserId, {
            telephone: normalizedPhone,
          });
          // Recharger l'utilisateur
          const updatedUser = await userRepo.findById(finalUserId);
          if (updatedUser) {
            dispatch(updateUser(updatedUser));
          }
        }
      }

      if (currentUser?.roles?.veterinarian) {
        // Le profil existe déjà, juste mettre à jour et naviguer
        Alert.alert(
          'Info',
          'Votre profil vétérinaire existe déjà. Redirection vers le dashboard...'
        );
        const updatedUser = await userRepo.findById(finalUserId);
        if (updatedUser) {
          dispatch(updateUser(updatedUser));
        }
        (navigation as any).navigate('Main', { screen: SCREENS.DASHBOARD_VET });
        return;
      }

      // Upload des documents
      const identityCardUrl = await onboardingService.uploadDocument(identityCard!);
      const professionalProofUrl = await onboardingService.uploadDocument(professionalProof!);

      // Créer le profil vétérinaire
      await onboardingService.createVeterinarianProfile(finalUserId, {
        qualifications: {
          degree,
          university,
          graduationYear: parseInt(graduationYear),
          licenseNumber,
          licenseIssuedBy,
          licenseValidUntil:
            licenseValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an par défaut
          documents: {
            identityCard: {
              url: identityCardUrl,
              uploadedAt: new Date().toISOString(),
              verified: false,
            },
            professionalProof: {
              url: professionalProofUrl,
              uploadedAt: new Date().toISOString(),
              verified: false,
            },
          },
        },
        specializations,
        experience: {
          yearsOfPractice: parseInt(yearsOfPractice) || 0,
        },
        workLocation: {
          address: workAddress,
          city: workCity,
          region: workRegion,
          latitude: workLocation?.lat || 0,
          longitude: workLocation?.lng || 0,
          serviceRadius,
        },
      });

      // Marquer l'onboarding comme terminé
      await onboardingService.completeOnboarding(finalUserId, 'veterinarian');

      // Recharger l'utilisateur mis à jour dans le store Redux
      // Réutiliser db et userRepo déjà déclarés plus haut
      const updatedUser = await userRepo.findById(finalUserId);
      if (updatedUser) {
        dispatch(updateUser(updatedUser));
      }

      // Rediriger vers le dashboard avec message de validation en attente (dans le navigateur Main)
      (navigation as any).navigate('Main', {
        screen: SCREENS.DASHBOARD_VET,
        params: { showPendingValidation: true },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Erreur lors de la soumission: ${errorMessage}`);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Documents obligatoires</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Ces documents sont nécessaires pour valider votre profil
      </Text>

      {/* Photo d'identité */}
      <View
        style={[
          styles.documentCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.documentHeader}>
          <Ionicons name="card" size={24} color="#EF4444" />
          <View style={styles.documentInfo}>
            <Text style={[styles.documentTitle, { color: colors.text }]}>Photo d'identité *</Text>
            <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>
              Carte d'identité, passeport ou permis de conduire
            </Text>
          </View>
        </View>

        {identityCard ? (
          <View style={styles.documentPreview}>
            <Image source={{ uri: identityCard.uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.changeButton} onPress={pickIdentityCard}>
              <Text style={[styles.changeButtonText, { color: colors.primary }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: colors.primary }]}
            onPress={pickIdentityCard}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Télécharger</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preuve profession */}
      <View
        style={[
          styles.documentCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.documentHeader}>
          <Ionicons name="school" size={24} color="#EF4444" />
          <View style={styles.documentInfo}>
            <Text style={[styles.documentTitle, { color: colors.text }]}>
              Preuve de profession *
            </Text>
            <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>
              Diplôme, licence vétérinaire ou certificat d'exercice
            </Text>
          </View>
        </View>

        {professionalProof ? (
          <View style={styles.documentPreview}>
            <View style={[styles.fileInfo, { backgroundColor: colors.background }]}>
              <Ionicons name="document" size={32} color="#EF4444" />
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {professionalProof.name}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeButton} onPress={pickProfessionalProof}>
              <Text style={[styles.changeButtonText, { color: colors.primary }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: colors.primary }]}
            onPress={pickProfessionalProof}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Télécharger</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.info + '15' }]}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          Vos documents seront vérifiés par notre équipe sous 24-48h
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Qualifications</Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Diplôme *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={degree}
          onChangeText={setDegree}
          placeholder="Docteur en médecine vétérinaire"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Université *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={university}
          onChangeText={setUniversity}
          placeholder="Nom de l'université"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.xs }]}>
          <Text style={[styles.label, { color: colors.text }]}>Année de graduation *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={graduationYear}
            onChangeText={setGraduationYear}
            placeholder="2015"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.xs }]}>
          <Text style={[styles.label, { color: colors.text }]}>Années d'expérience *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={yearsOfPractice}
            onChangeText={setYearsOfPractice}
            placeholder="9"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Numéro de licence *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="VET-2024-XXXX"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Émis par *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={licenseIssuedBy}
          onChangeText={setLicenseIssuedBy}
          placeholder="Ordre des Vétérinaires"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Date d'expiration de la licence *
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={licenseValidUntil}
          onChangeText={setLicenseValidUntil}
          placeholder="2025-12-31"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Spécialités *</Text>
        <View style={styles.checkboxGroup}>
          {availableSpecializations.map((spec) => (
            <TouchableOpacity
              key={spec}
              style={styles.checkboxOption}
              onPress={() => toggleSpecialization(spec)}
            >
              <View style={[styles.checkbox, { borderColor: colors.primary }]}>
                {specializations.includes(spec) && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>{spec}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Lieu de fonction</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Où exercez-vous principalement votre activité ?
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Adresse *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={workAddress}
          onChangeText={setWorkAddress}
          placeholder="Adresse complète"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.xs }]}>
          <Text style={[styles.label, { color: colors.text }]}>Ville *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={workCity}
            onChangeText={setWorkCity}
            placeholder="Abidjan"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.xs }]}>
          <Text style={[styles.label, { color: colors.text }]}>Région *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={workRegion}
            onChangeText={setWorkRegion}
            placeholder="Lagunes"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Localisation sur la carte *</Text>
        <TouchableOpacity
          style={[
            styles.mapButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setMapModalVisible(true)}
        >
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.mapButtonText, { color: colors.text }]}>
            {workLocation ? 'Modifier la localisation' : 'Sélectionner sur la carte'}
          </Text>
        </TouchableOpacity>
        {workLocation && (
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            Coordonnées: {workLocation.lat.toFixed(6)}, {workLocation.lng.toFixed(6)}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Rayon de service (km)</Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderValue, { color: colors.primary }]}>{serviceRadius} km</Text>
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderFill,
                { width: `${((serviceRadius - 10) / 90) * 100}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>10 km</Text>
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>100 km</Text>
          </View>
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={[
                styles.sliderButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setServiceRadius(Math.max(10, serviceRadius - 5))}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sliderButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setServiceRadius(Math.min(100, serviceRadius + 5))}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.info + '15' }]}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          Nous vous proposerons des fermes dans ce rayon qui recherchent un vétérinaire
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step >= 1 && { backgroundColor: colors.primary }]} />
        <View style={[styles.progressStep, step >= 2 && { backgroundColor: colors.primary }]} />
        <View style={[styles.progressStep, step >= 3 && { backgroundColor: colors.primary }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.backStepButton, { borderColor: colors.border }]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.backStepButtonText, { color: colors.text }]}>Retour</Text>
          </TouchableOpacity>
        )}

        <Button
          title={step === 3 ? 'Soumettre' : 'Suivant'}
          onPress={handleSubmit}
          style={step === 1 ? [styles.nextButton, { flex: 1 }] : [styles.nextButton, { flex: 0.6 }]}
          disabled={
            (step === 1 && (!identityCard || !professionalProof)) ||
            (step === 2 &&
              (!degree ||
                !university ||
                !graduationYear ||
                !licenseNumber ||
                specializations.length === 0)) ||
            (step === 3 && (!workAddress || !workCity || !workLocation))
          }
        />
      </View>

      {/* Modal de sélection de localisation */}
      <MapLocationPickerModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        onConfirm={(location) => {
          setWorkLocation({ lat: location.lat, lng: location.lng });
          if (location.address) {
            // Optionnel: pré-remplir l'adresse si disponible
            const addressParts = location.address.split(',');
            if (addressParts.length >= 2) {
              setWorkCity(addressParts[addressParts.length - 2]?.trim() || '');
              setWorkRegion(addressParts[addressParts.length - 1]?.trim() || '');
            }
          }
        }}
        initialLocation={workLocation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  stepContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },
  documentCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  documentInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  documentTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  documentDescription: {
    fontSize: FONT_SIZES.sm,
  },
  documentPreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  fileName: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  changeButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  changeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
    gap: SPACING.xs,
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
    flex: 1,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
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
  row: {
    flexDirection: 'row',
  },
  checkboxGroup: {
    gap: SPACING.sm,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.md,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  mapButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  sliderContainer: {
    paddingVertical: SPACING.sm,
  },
  sliderValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  sliderLabel: {
    fontSize: FONT_SIZES.xs,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  backStepButton: {
    flex: 0.4,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  backStepButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  nextButton: {
    flex: 1,
  },
});

export default VeterinarianInfoCompletionScreen;
