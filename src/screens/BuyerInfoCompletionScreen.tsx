/**
 * Écran de complément d'information pour les acheteurs
 * Collecte les informations spécifiques au profil acheteur
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';
import { useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';
import type { RoleType } from '../types/roles';

const BuyerInfoCompletionScreen: React.FC = () => {
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

  const [buyerType, setBuyerType] = useState<
    'individual' | 'restaurant' | 'butcher' | 'wholesaler' | 'retailer'
  >('individual');
  const [companyName, setCompanyName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');

  // Pour le technicien
  const [techLevel, setTechLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>(
    'beginner'
  );
  const [skills, setSkills] = useState('');
  const [skillsArray, setSkillsArray] = useState<string[]>([]);

  const isTechnician = profileType === 'technician';

  // Pré-remplir le numéro de téléphone
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Si on a un identifier qui est un téléphone, pré-remplir
        if (identifier && !isEmail) {
          setContactPhone(identifier);
        } else if (userId) {
          // Si on a un userId, charger les données utilisateur existantes depuis l'API backend
          const currentUser = await apiClient.get<any>(`/users/${userId}`);
          if (currentUser?.telephone) {
            setContactPhone(currentUser.telephone);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      }
    };

    loadUserData();
  }, [identifier, isEmail, userId]);

  // Convertir skills string en array
  useEffect(() => {
    if (skills.trim()) {
      setSkillsArray(
        skills
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      );
    } else {
      setSkillsArray([]);
    }
  }, [skills]);

  const buyerTypes = [
    { value: 'individual' as const, label: 'Particulier' },
    { value: 'restaurant' as const, label: 'Restaurant' },
    { value: 'butcher' as const, label: 'Boucherie' },
    { value: 'wholesaler' as const, label: 'Grossiste' },
    { value: 'retailer' as const, label: 'Détaillant' },
  ];

  const handleComplete = async () => {
    if (isTechnician) {
      // Validation pour technicien
      if (skillsArray.length === 0) {
        Alert.alert('Erreur', 'Veuillez renseigner au moins une compétence');
        return;
      }
      // Le téléphone n'est pas obligatoire pour le technicien, mais on le met à jour si fourni
    } else {
      // Validation pour acheteur
      if (buyerType !== 'individual' && !companyName) {
        Alert.alert('Erreur', "Veuillez renseigner le nom de l'entreprise");
        return;
      }

      if (!contactPhone) {
        Alert.alert('Erreur', 'Veuillez renseigner un contact téléphonique');
        return;
      }
    }

    try {
      const onboardingService = await getOnboardingService();
      let finalUserId = userId;

      // Si pas de userId mais qu'on a identifier, créer le compte d'abord
      if (!finalUserId && identifier) {
        try {
          // Créer le compte utilisateur
          const newUser = await onboardingService.createUser({
            email: isEmail ? identifier : undefined,
            phone: !isEmail ? identifier : undefined,
            firstName: '', // Sera complété plus tard
            lastName: '', // Sera complété plus tard
            password: '', // Pas de mot de passe pour l'instant
            profileType: profileType || 'buyer',
          });
          finalUserId = newUser.id;
          // Mettre à jour l'utilisateur dans le store Redux
          dispatch(updateUser(newUser));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error) || 'Impossible de créer le compte';
          Alert.alert('Erreur', errorMessage);
          return;
        }
      }

      if (!finalUserId) {
        Alert.alert('Erreur', 'Impossible de créer le compte');
        return;
      }

      // Charger l'utilisateur depuis l'API backend pour mettre à jour le téléphone si nécessaire
      const currentUser = await apiClient.get<any>(`/users/${finalUserId}`);

      // Mettre à jour le numéro de téléphone au niveau User si fourni
      // Cela évite d'avoir deux numéros différents pour le même utilisateur
      let phoneToUpdate: string | undefined = undefined;
      if (contactPhone) {
        phoneToUpdate = contactPhone.trim().replace(/\s+/g, '');
      } else if (identifier && !isEmail) {
        // Si on a un identifier qui est un téléphone mais pas de contactPhone dans le formulaire
        // (cas du technicien), utiliser l'identifier
        phoneToUpdate = identifier.trim().replace(/\s+/g, '');
      }

      // Importer UserRepository dynamiquement
      const { UserRepository } = await import('../database/repositories');
      const userRepo = new UserRepository();

      if (phoneToUpdate && currentUser && phoneToUpdate !== currentUser.telephone) {
        await userRepo.update(finalUserId, {
          telephone: phoneToUpdate,
        });
        // Recharger l'utilisateur
        const updatedUser = await userRepo.findById(finalUserId);
        if (updatedUser) {
          dispatch(updateUser(updatedUser));
        }
      }

      // IMPORTANT: Ne pas vérifier si le profil existe déjà ici car c'est la première création
      // Le profil n'est créé qu'à la fin de cette fonction après avoir rempli le formulaire
      
      if (isTechnician) {
        // Créer le profil technicien (première fois)
        await onboardingService.createTechnicianProfile(finalUserId, {
          qualifications: {
            level: techLevel,
          },
          skills: skillsArray,
        });
      } else {
        // Créer le profil acheteur (première fois)
        await onboardingService.createBuyerProfile(finalUserId, {
          buyerType,
          businessInfo:
            buyerType !== 'individual'
              ? {
                  companyName,
                  contactPhone,
                  address,
                }
              : undefined,
        });
      }

      // Marquer l'onboarding comme terminé
      await onboardingService.completeOnboarding(finalUserId);

      // Recharger l'utilisateur mis à jour dans le store Redux
      const updatedUser = await userRepo.findById(finalUserId);
      if (updatedUser) {
        dispatch(updateUser(updatedUser));
      }

      // Rediriger selon le profil
      const finalProfileType = profileType || 'buyer';
      if (finalProfileType === 'technician') {
        (navigation as any).navigate('Main', { screen: SCREENS.DASHBOARD_TECH });
      } else {
        (navigation as any).navigate('Main', { screen: SCREENS.DASHBOARD_BUYER });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Erreur lors de la création du profil: ${errorMessage}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Compléter votre profil</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Dernière étape !</Text>
        </View>

        <View style={styles.form}>
          {isTechnician ? (
            <>
              {/* Formulaire Technicien */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Niveau de qualification *
                </Text>
                <View style={styles.radioGroup}>
                  {[
                    { value: 'beginner' as const, label: 'Débutant' },
                    { value: 'intermediate' as const, label: 'Intermédiaire' },
                    { value: 'advanced' as const, label: 'Avancé' },
                    { value: 'expert' as const, label: 'Expert' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.radioOption,
                        techLevel === option.value && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setTechLevel(option.value)}
                    >
                      <View style={[styles.radio, { borderColor: colors.primary }]}>
                        {techLevel === option.value && (
                          <View
                            style={[styles.radioSelected, { backgroundColor: colors.primary }]}
                          />
                        )}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Compétences *</Text>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Séparez les compétences par des virgules (ex: Reproduction, Nutrition, Santé)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="Ex: Reproduction, Nutrition animale, Santé porcine"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          ) : (
            <>
              {/* Formulaire Acheteur */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Type d'acheteur *</Text>
                <View style={styles.radioGroup}>
                  {buyerTypes.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.radioOption,
                        buyerType === option.value && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setBuyerType(option.value)}
                    >
                      <View style={[styles.radio, { borderColor: colors.primary }]}>
                        {buyerType === option.value && (
                          <View
                            style={[styles.radioSelected, { backgroundColor: colors.primary }]}
                          />
                        )}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {buyerType !== 'individual' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Nom de l'entreprise *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Nom de votre entreprise"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              )}
            </>
          )}

          {/* Contact téléphonique - commun aux deux profils (optionnel pour technicien) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Contact téléphonique {!isTechnician ? '*' : '(optionnel)'}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+225 XX XX XX XX XX"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
            {isTechnician && contactPhone && (
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Ce numéro sera synchronisé avec vos autres profils
              </Text>
            )}
          </View>

          {!isTechnician && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Adresse (optionnel)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="Votre adresse complète"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>

        <Button title="Terminer" onPress={handleComplete} style={styles.submitButton} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.xs,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
  },
  form: {
    paddingHorizontal: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  radioGroup: {
    gap: SPACING.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: FONT_SIZES.md,
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
  submitButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
    fontStyle: 'italic',
  },
});

export default BuyerInfoCompletionScreen;
