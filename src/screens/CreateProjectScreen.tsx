/**
 * Écran de création de projet avec animations fluides et design moderne
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createProjet } from '../store/slices/projetSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { CreateProjetInput } from '../types';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Card from '../components/Card';

export default function CreateProjectScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjetInput>({
    nom: '',
    localisation: '',
    nombre_truies: 0,
    nombre_verrats: 0,
    nombre_porcelets: 0,
    poids_moyen_actuel: 0,
    age_moyen_actuel: 0,
    notes: '',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animation d'entrée fluide
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (!formData.nom.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme est requis');
      return;
    }
    if (!formData.localisation.trim()) {
      Alert.alert('Erreur', 'La localisation est requise');
      return;
    }
    if (formData.nombre_truies < 0 || formData.nombre_verrats < 0 || formData.nombre_porcelets < 0) {
      Alert.alert('Erreur', 'Les nombres ne peuvent pas être négatifs');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createProjet({
          ...formData,
          proprietaire_id: user?.id || 'user_1', // Récupéré depuis l'authentification
        })
      ).unwrap();

      // La navigation sera gérée automatiquement par AppNavigator
      // grâce au useEffect qui écoute les changements de projetActif
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Header amélioré */}
              <View style={styles.header}>
                <View style={styles.headerIconContainer}>
                  <Text style={styles.headerIcon}>🏡</Text>
                </View>
                <Text style={styles.title}>Créer votre ferme</Text>
                <Text style={styles.subtitle}>
                  Remplissez les informations de base pour démarrer la gestion de votre élevage
                </Text>
              </View>

              {/* Section Informations générales */}
              <Card elevation="small" padding="large" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📋</Text>
                  <Text style={styles.sectionTitle}>Informations générales</Text>
                </View>
                <View style={styles.formSection}>
                  <FormField
                    label="Nom de la ferme"
                    placeholder="Ex: Ferme des Oliviers"
                    value={formData.nom}
                    onChangeText={(text) => setFormData({ ...formData, nom: text })}
                    required
                  />

                  <FormField
                    label="Localisation"
                    placeholder="Ex: Dakar, Sénégal"
                    value={formData.localisation}
                    onChangeText={(text) => setFormData({ ...formData, localisation: text })}
                    required
                  />
                </View>
              </Card>

              {/* Section Effectifs */}
              <Card elevation="small" padding="large" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🐷</Text>
                  <Text style={styles.sectionTitle}>Effectifs initiaux</Text>
                </View>
                <View style={styles.formSection}>
                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      <FormField
                        label="Truies"
                        placeholder="Ex: 45"
                        keyboardType="numeric"
                        value={formData.nombre_truies.toString()}
                        onChangeText={(text) =>
                          setFormData({ ...formData, nombre_truies: parseInt(text) || 0 })
                        }
                        required
                      />
                    </View>
                    <View style={styles.halfWidth}>
                      <FormField
                        label="Verrats"
                        placeholder="Ex: 5"
                        keyboardType="numeric"
                        value={formData.nombre_verrats.toString()}
                        onChangeText={(text) =>
                          setFormData({ ...formData, nombre_verrats: parseInt(text) || 0 })
                        }
                        required
                      />
                    </View>
                  </View>

                  <FormField
                    label="Porcelets"
                    placeholder="Ex: 120"
                    keyboardType="numeric"
                    value={formData.nombre_porcelets.toString()}
                    onChangeText={(text) =>
                      setFormData({ ...formData, nombre_porcelets: parseInt(text) || 0 })
                    }
                    required
                  />
                </View>
              </Card>

              {/* Section Statistiques */}
              <Card elevation="small" padding="large" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📊</Text>
                  <Text style={styles.sectionTitle}>Statistiques moyennes</Text>
                </View>
                <View style={styles.formSection}>
                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      <FormField
                        label="Poids moyen (kg)"
                        placeholder="Ex: 45.5"
                        keyboardType="decimal-pad"
                        value={formData.poids_moyen_actuel.toString()}
                        onChangeText={(text) =>
                          setFormData({ ...formData, poids_moyen_actuel: parseFloat(text) || 0 })
                        }
                        required
                      />
                    </View>
                    <View style={styles.halfWidth}>
                      <FormField
                        label="Âge moyen (jours)"
                        placeholder="Ex: 90"
                        keyboardType="numeric"
                        value={formData.age_moyen_actuel.toString()}
                        onChangeText={(text) =>
                          setFormData({ ...formData, age_moyen_actuel: parseInt(text) || 0 })
                        }
                        required
                      />
                    </View>
                  </View>
                </View>
              </Card>

              {/* Section Notes */}
              <Card elevation="small" padding="large" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📝</Text>
                  <Text style={styles.sectionTitle}>Notes supplémentaires</Text>
                </View>
                <View style={styles.formSection}>
                  <FormField
                    label=""
                    placeholder="Ajoutez des notes supplémentaires (optionnel)..."
                    multiline
                    numberOfLines={4}
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  />
                </View>
              </Card>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title={loading ? 'Création en cours...' : 'Créer ma ferme 🚀'}
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  loading={loading}
                  fullWidth
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl + 10,
    paddingBottom: SPACING.lg + 10,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.primaryLight + '30',
  },
  headerIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  sectionCard: {
    marginBottom: SPACING.lg + 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryLight + '30',
  },
  sectionIcon: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  formSection: {
    marginTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  actions: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
});

