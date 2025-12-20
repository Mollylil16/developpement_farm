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
  const [photo, setPhoto] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

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
      } else {
        // Utiliser les données du state Redux comme fallback
        if (user) {
          setNom(user.nom || '');
          setPrenom(user.prenom || '');
          setEmail(user.email || '');
          setTelephone(user.telephone || '');
          setPhoto(user.photo || '');
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
        setPhoto(result.assets[0].uri);
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

      // Mettre à jour dans la base de données
      const { UserRepository } = await import('../database/repositories');
      const userRepo = new UserRepository();
      await userRepo.update(user.id, {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email?.trim() || undefined,
        telephone: telephone?.trim() || undefined,
        photo: photo || undefined,
      });

      // Recharger l'utilisateur dans le state Redux pour que les autres composants voient les changements
      await dispatch(loadUserFromStorageThunk());

      Alert.alert('Succès', 'Profil enregistré avec succès');

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
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: `${COLORS.primary}20` }]}>
                  <Ionicons name="person" size={48} color={COLORS.primary} />
                </View>
              )}
              <View style={[styles.photoEditBadge, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
              Toucher pour modifier la photo
            </Text>
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
              loading && styles.saveButtonDisabled,
            ]}
            onPress={validateAndSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
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
});
