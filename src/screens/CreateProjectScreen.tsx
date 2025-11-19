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
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createProjet } from '../store/slices/projetSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { CreateProjetInput } from '../types';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Card from '../components/Card';
import { signOut } from '../store/slices/authSlice';
import { SCREENS } from '../navigation/types';
import InvitationsModal from '../components/InvitationsModal';
import { loadInvitationsEnAttente } from '../store/slices/collaborationSlice';
import { loadProjets } from '../store/slices/projetSlice';

export default function CreateProjectScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  const [loading, setLoading] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const hasShownInvitationsRef = useRef(false);
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

  // Les invitations sont déjà chargées dans AppNavigator, pas besoin de les recharger ici
  // Évite une boucle infinie de rechargements

  // Afficher automatiquement le modal des invitations si elles existent
  useEffect(() => {
    if (invitationsEnAttente.length > 0 && !hasShownInvitationsRef.current && !projetActif) {
      hasShownInvitationsRef.current = true;
      // Délai pour laisser le temps à l'écran de se charger
      setTimeout(() => {
        setInvitationsModalVisible(true);
      }, 1000);
    }
  }, [invitationsEnAttente.length, projetActif?.id]);  // ✅ projetActif?.id au lieu de projetActif (objet)

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
      if (!user?.id) {
        Alert.alert('Erreur', 'Vous devez être connecté pour créer un projet');
        return;
      }

      const totalAnimaux = formData.nombre_truies + formData.nombre_verrats + formData.nombre_porcelets;
      
      await dispatch(
        createProjet({
          ...formData,
          proprietaire_id: user.id, // Récupéré depuis l'authentification
        })
      ).unwrap();

      // Si l'utilisateur a déjà un projet actif, il vient probablement des paramètres
      // Dans ce cas, on revient aux paramètres pour qu'il puisse voir son nouveau projet
      if (projetActif) {
        const message = totalAnimaux > 0
          ? `Votre nouveau projet a été créé avec ${totalAnimaux} animal${totalAnimaux > 1 ? 'x' : ''} dans votre cheptel. Vous pouvez basculer entre vos projets dans les paramètres.`
          : 'Votre nouveau projet a été créé et est maintenant actif. Vous pouvez basculer entre vos projets dans les paramètres.';
        
        Alert.alert(
          'Projet créé',
          message,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // Pas de projet actif = premier projet, la navigation sera gérée automatiquement par AppNavigator
        if (totalAnimaux > 0) {
          // Afficher un message informatif après la navigation automatique
          setTimeout(() => {
            Alert.alert(
              'Projet créé',
              `✓ Projet créé avec ${totalAnimaux} animal${totalAnimaux > 1 ? 'x' : ''} dans votre cheptel. Vous pouvez compléter les informations des animaux dans le module Cheptel.`,
              [{ text: 'OK' }]
            );
          }, 1000);
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
      navigation.reset({
        index: 0,
        routes: [{ name: SCREENS.WELCOME }],
      });
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Impossible de se déconnecter pour le moment.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
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
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={[styles.signOutButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.signOutText, { color: colors.error }]}>Se déconnecter</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.headerIconContainer, { backgroundColor: colors.primaryLight + '15', borderColor: colors.primaryLight + '30' }]}>
                  <Text style={styles.headerIcon}>🏡</Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Créer votre ferme</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Remplissez les informations de base pour démarrer la gestion de votre élevage
                </Text>
              </View>

              {/* Section Informations générales */}
              <Card elevation="small" padding="large" style={styles.sectionCard}>
                <View style={[styles.sectionHeader, { borderBottomColor: colors.primaryLight + '30' }]}>
                  <Text style={styles.sectionIcon}>📋</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations générales</Text>
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
                <View style={[styles.sectionHeader, { borderBottomColor: colors.primaryLight + '30' }]}>
                  <Text style={styles.sectionIcon}>🐷</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Effectifs initiaux</Text>
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
                <View style={[styles.sectionHeader, { borderBottomColor: colors.primaryLight + '30' }]}>
                  <Text style={styles.sectionIcon}>📊</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistiques moyennes</Text>
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
                <View style={[styles.sectionHeader, { borderBottomColor: colors.primaryLight + '30' }]}>
                  <Text style={styles.sectionIcon}>📝</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes supplémentaires</Text>
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
      
      {/* Modal d'invitations */}
      <InvitationsModal
        visible={invitationsModalVisible}
        onClose={() => {
          setInvitationsModalVisible(false);
          // Recharger les projets après acceptation/rejet d'invitation
          if (user) {
            dispatch(loadProjets());
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerActions: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.sm,
  },
  signOutButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: 999,
  },
  signOutText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
  },
  headerIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
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
  },
  sectionIcon: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
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

