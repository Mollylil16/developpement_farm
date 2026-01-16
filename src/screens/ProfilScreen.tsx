/**
 * ProfilScreen - Écran de profil utilisateur simple
 * Gestion des informations personnelles de base
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadUserFromStorageThunk, signOut } from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';

export default function ProfilScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);

  // Initialiser les champs à vide - ils seront chargés depuis la DB
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [photo, setPhoto] = useState(''); // URL serveur ou URI locale
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null); // URI locale uniquement

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Charger les données du profil depuis la base de données
  const loadProfilData = async () => {
    if (!user?.id) {
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);

      // Charger depuis l'API backend
      const apiUser = await apiClient.get<any>(`/users/${user.id}`);

      if (apiUser) {
        // Utilisateur trouvé via l'API backend
        setNom(apiUser.nom || '');
        setPrenom(apiUser.prenom || '');
        setEmail(apiUser.email || '');
        setTelephone(apiUser.telephone || '');
        setPhoto(apiUser.photo || '');
        setLocalPhotoUri(null); // Réinitialiser l'URI locale
      } else {
        // Utiliser les données du state Redux comme fallback
        if (user) {
          setNom(user.nom || '');
          setPrenom(user.prenom || '');
          setEmail(user.email || '');
          setTelephone(user.telephone || '');
          setPhoto(user.photo || '');
          setLocalPhotoUri(null); // Réinitialiser l'URI locale
        }
      }
    } catch (error: unknown) {
      console.error('❌ Erreur chargement profil:', error);
      // En cas d'erreur, utiliser les données du state Redux comme fallback
      if (user) {
        setNom(user.nom || '');
        setPrenom(user.prenom || '');
        setEmail(user.email || '');
        setTelephone(user.telephone || '');
        setPhoto(user.photo || '');
        setLocalPhotoUri(null); // Réinitialiser l'URI locale
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Charger les données au montage et quand l'écran revient au focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfilData();
    }, [user?.id])
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission nécessaire pour accéder aux photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        // Stocker l'URI locale pour l'upload ultérieur
        setLocalPhotoUri(selectedUri);
        // Ne PAS mettre à jour photo avec l'URI locale ici
        // On l'affichera seulement via localPhotoUri dans le rendu
        // Cela évite d'avoir une URI locale dans photo si l'upload échoue
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  };

  const validateAndSave = async () => {
    // Validation
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires');
      return;
    }

    // Validation: au moins email ou téléphone
    if (!email?.trim() && !telephone?.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner au moins un email ou un numéro de téléphone');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        Alert.alert('Session expirée', 'Votre session a expiré. Veuillez vous reconnecter.', [
          {
            text: 'OK',
            onPress: () => {
              // Retour à l'écran de connexion
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            },
          },
        ]);
        setLoading(false);
        return;
      }

      const { UserRepository } = await import('../database/repositories');
      const userRepo = new UserRepository();

      // Si une nouvelle photo locale a été sélectionnée, l'uploader d'abord
      let finalPhotoUrl = user.photo || ''; // Utiliser la photo actuelle de l'utilisateur comme base
      let uploadFailed = false;
      
      // Détecter si c'est une nouvelle photo locale (pas encore uploadée)
      const isNewLocalPhoto = localPhotoUri && (
        localPhotoUri.startsWith('file://') || 
        localPhotoUri.startsWith('content://') || 
        localPhotoUri.startsWith('ph://') ||
        localPhotoUri.startsWith('assets-library://')
      );

      if (isNewLocalPhoto) {
        try {
          setUploadingPhoto(true);
          finalPhotoUrl = await userRepo.uploadPhoto(user.id, localPhotoUri);
          // Mettre à jour l'état avec l'URL serveur seulement si l'upload réussit
          setPhoto(finalPhotoUrl);
          setLocalPhotoUri(null); // Réinitialiser après upload réussi
        } catch (uploadError: unknown) {
          setUploadingPhoto(false);
          uploadFailed = true;
          
          // Améliorer le message d'erreur selon le type d'erreur
          let errorMessage = 'Erreur lors du téléchargement de la photo';
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('connexion') || uploadError.message.includes('Network')) {
              errorMessage = 'Erreur de connexion. Vérifiez votre connexion Internet.';
            } else if (uploadError.message.includes('timeout')) {
              errorMessage = 'Le téléchargement a pris trop de temps. Vérifiez votre connexion et réessayez.';
            } else {
              errorMessage = uploadError.message;
            }
          }
          
          // Demander à l'utilisateur ce qu'il veut faire
          const userChoice = await new Promise<'continue' | 'cancel'>((resolve) => {
            Alert.alert(
              'Erreur d\'upload',
              errorMessage,
              [
                {
                  text: 'Continuer sans photo',
                  style: 'cancel',
                  onPress: () => resolve('continue'),
                },
                {
                  text: 'Annuler',
                  style: 'destructive',
                  onPress: () => resolve('cancel'),
                },
              ],
              { cancelable: false }
            );
          });

          if (userChoice === 'cancel') {
            setLoading(false);
            // Réinitialiser localPhotoUri pour permettre une nouvelle tentative
            setLocalPhotoUri(null);
            return;
          }

          // Continuer sans mettre à jour la photo (garder l'ancienne ou vide)
          finalPhotoUrl = user.photo || '';
          setLocalPhotoUri(null);
          // Ne pas mettre à jour photo avec l'URI locale - garder l'ancienne ou vide
          setPhoto(finalPhotoUrl);
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Mettre à jour dans la base de données
      await userRepo.update(user.id, {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email?.trim() || undefined,
        telephone: telephone?.trim() || undefined,
        photo: finalPhotoUrl || undefined,
      });

      // Recharger l'utilisateur dans le state Redux pour que les autres composants voient les changements
      await dispatch(loadUserFromStorageThunk());
      
      // Déclencher une vérification immédiate de la synchronisation pour les autres appareils
      const { profileSyncService } = await import('../services/profileSyncService');
      profileSyncService.checkNow();

      // Afficher un message différent si l'upload a échoué
      if (uploadFailed) {
        Alert.alert(
          'Profil enregistré',
          'Vos informations ont été enregistrées, mais la photo n\'a pas pu être téléchargée. Vous pourrez réessayer plus tard.'
        );
      } else {
        Alert.alert('Succès', 'Profil enregistré avec succès');
      }

      // Retour
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: unknown) {
      console.error('❌ Erreur sauvegarde profil:', error);

      // Vérifier si c'est une erreur de profil introuvable
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage && errorMessage.includes('Profil introuvable')) {
        // Proposer la déconnexion
        Alert.alert(
          'Profil introuvable',
          "Votre profil n'existe plus dans la base de données. Vous devez vous reconnecter.",
          [
            {
              text: 'Se déconnecter',
              onPress: async () => {
                await dispatch(signOut());
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // Autre erreur
        const errorMsg = error instanceof Error ? error.message : 'Impossible de sauvegarder le profil';
        Alert.alert('Erreur', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement du profil...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo de profil */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={[styles.photoContainer, { borderColor: colors.border }]}
              onPress={pickImage}
              disabled={uploadingPhoto}
            >
              {/* Afficher localPhotoUri en priorité pour l'aperçu, puis photo (URL serveur) */}
              {localPhotoUri ? (
                <Image source={{ uri: localPhotoUri }} style={styles.photo} resizeMode="cover" />
              ) : photo ? (
                <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: `${COLORS.primary}20` }]}>
                  <Ionicons name="person" size={48} color={COLORS.primary} />
                </View>
              )}
              {uploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.uploadingText}>Upload...</Text>
                </View>
              )}
              {!uploadingPhoto && (
                <View style={[styles.photoEditBadge, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.photoActions}>
              <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                Toucher pour modifier la photo
              </Text>
              {photo && !localPhotoUri && (
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={async () => {
                    Alert.alert(
                      'Supprimer la photo',
                      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
                      [
                        {
                          text: 'Annuler',
                          style: 'cancel',
                        },
                        {
                          text: 'Supprimer',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              setLoading(true);
                              const { UserRepository } = await import('../database/repositories');
                              const userRepo = new UserRepository();
                              await userRepo.deletePhoto(user?.id || '');
                              setPhoto('');
                              setLocalPhotoUri(null);
                              await dispatch(loadUserFromStorageThunk());
                              const { profileSyncService } = await import('../services/profileSyncService');
                              profileSyncService.checkNow();
                              Alert.alert('Succès', 'Photo supprimée avec succès');
                            } catch (error) {
                              console.error('Erreur suppression photo:', error);
                              Alert.alert('Erreur', 'Impossible de supprimer la photo');
                            } finally {
                              setLoading(false);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={[styles.deletePhotoText, { color: COLORS.error }]}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Informations personnelles */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Informations personnelles
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Nom <Text style={{ color: COLORS.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={nom}
                onChangeText={setNom}
                placeholder="Nom"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Prénom <Text style={{ color: COLORS.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={prenom}
                onChangeText={setPrenom}
                placeholder="Prénom"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Téléphone</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={telephone}
                onChangeText={setTelephone}
                placeholder="+225 XX XX XX XX XX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Bouton de sauvegarde */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: COLORS.primary },
              (loading || uploadingPhoto) && styles.saveButtonDisabled,
            ]}
            onPress={validateAndSave}
            disabled={loading || uploadingPhoto}
          >
            {loading || uploadingPhoto ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {uploadingPhoto ? 'Téléchargement de la photo...' : 'Enregistrement...'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
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
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    ...FONTS.h2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    fontStyle: 'italic',
    ...FONTS.small,
  },
  photoActions: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deletePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },
  deletePhotoText: {
    ...FONTS.small,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    marginBottom: SPACING.md,
    ...FONTS.h3,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    marginBottom: SPACING.xs,
    ...FONTS.body,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...FONTS.body,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    ...FONTS.body,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...FONTS.body,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFF',
    marginTop: SPACING.xs,
    fontSize: 12,
  },
});
