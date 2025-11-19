/**
 * ProfilScreen - Écran de profil du fermier
 * Gestion des informations personnelles
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfilFermier {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  photo_uri?: string;
}

const PROFIL_STORAGE_KEY = '@profil_fermier';

export default function ProfilScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);

  const [profil, setProfil] = useState<ProfilFermier>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    photo_uri: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Charger le profil depuis AsyncStorage
  useEffect(() => {
    loadProfil();
  }, []);

  const loadProfil = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFIL_STORAGE_KEY);
      if (stored) {
        setProfil(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const saveProfil = async () => {
    if (!profil.nom.trim() || !profil.prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(PROFIL_STORAGE_KEY, JSON.stringify(profil));
      setHasChanges(false);
      Alert.alert('Succès', 'Profil enregistré avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setLoading(false);
    }
  };

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
        setProfil({ ...profil, photo_uri: result.assets[0].uri });
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission nécessaire pour utiliser la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfil({ ...profil, photo_uri: result.assets[0].uri });
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: takePhoto,
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: pickImage,
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const updateField = (field: keyof ProfilFermier, value: string) => {
    setProfil({ ...profil, [field]: value });
    setHasChanges(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Bouton retour */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Mon Profil</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Gérez vos informations personnelles
            </Text>
          </View>

          {/* Photo de profil */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={[styles.photoContainer, { borderColor: colors.primary }]}
              onPress={handlePhotoOptions}
              activeOpacity={0.8}
            >
              {profil.photo_uri ? (
                <Image source={{ uri: profil.photo_uri }} style={styles.photo} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                  {profil.nom && profil.prenom ? (
                    <Text style={[styles.initialesText, { color: colors.primary }]}>
                      {profil.prenom.charAt(0).toUpperCase()}{profil.nom.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <Ionicons name="person" size={60} color={colors.primary} />
                  )}
                </View>
              )}
              <View style={[styles.photoEditBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
              Appuyez pour modifier votre photo
            </Text>
          </View>

          {/* Formulaire */}
          <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Votre nom"
                  placeholderTextColor={colors.textSecondary}
                  value={profil.nom}
                  onChangeText={(text) => updateField('nom', text)}
                />
              </View>
            </View>

            {/* Prénom */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Prénom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Votre prénom"
                  placeholderTextColor={colors.textSecondary}
                  value={profil.prenom}
                  onChangeText={(text) => updateField('prenom', text)}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="votre.email@exemple.com"
                  placeholderTextColor={colors.textSecondary}
                  value={profil.email}
                  onChangeText={(text) => updateField('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Téléphone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Téléphone</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="+XXX XX XX XX XX"
                  placeholderTextColor={colors.textSecondary}
                  value={profil.telephone}
                  onChangeText={(text) => updateField('telephone', text)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Adresse */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Votre adresse"
                  placeholderTextColor={colors.textSecondary}
                  value={profil.adresse}
                  onChangeText={(text) => updateField('adresse', text)}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* Informations du projet */}
          {projetActif && (
            <View style={[styles.projetSection, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <View style={styles.projetHeader}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <Text style={[styles.projetTitle, { color: colors.primary }]}>
                  Projet actif
                </Text>
              </View>
              <Text style={[styles.projetNom, { color: colors.text }]}>
                {projetActif.nom}
              </Text>
              {projetActif.description && (
                <Text style={[styles.projetDescription, { color: colors.textSecondary }]}>
                  {projetActif.description}
                </Text>
              )}
            </View>
          )}

          {/* Bouton d'enregistrement */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={saveProfil}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.saveButtonText}>Enregistrement...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
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
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialesText: {
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
  },
  formSection: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.sm,
  },
  projetSection: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  projetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  projetTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  projetNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  projetDescription: {
    fontSize: FONT_SIZES.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

