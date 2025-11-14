/**
 * Écran Admin pour le développeur
 * Permet de gérer les utilisateurs et voir les statistiques de l'application
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../store/hooks';
import { databaseService } from '../services/database';
import { User } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminScreen() {
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersWithEmail: 0,
    usersWithPhone: 0,
    totalProjets: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allUsers = await databaseService.getAllUsers();
      setUsers(allUsers);
      
      // Calculer les statistiques
      const usersWithEmail = allUsers.filter(u => u.email).length;
      const usersWithPhone = allUsers.filter(u => u.telephone).length;
      
      // Compter les projets (tous les projets de tous les utilisateurs)
      let totalProjets = 0;
      for (const u of allUsers) {
        try {
          const projets = await databaseService.getAllProjets(u.id);
          totalProjets += projets.length;
        } catch (error) {
          // Ignorer les erreurs
        }
      }
      
      setStats({
        totalUsers: allUsers.length,
        usersWithEmail,
        usersWithPhone,
        totalProjets,
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: User) => {
    Alert.alert(
      `Utilisateur: ${user.prenom} ${user.nom}`,
      `ID: ${user.id}\n\nEmail: ${user.email || 'Non renseigné'}\nTéléphone: ${user.telephone || 'Non renseigné'}\n\nProvider: ${user.provider}\nDate création: ${new Date(user.date_creation).toLocaleDateString('fr-FR')}\nDernière connexion: ${user.derniere_connexion ? new Date(user.derniere_connexion).toLocaleDateString('fr-FR') : 'Jamais'}`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingSpinner message="Chargement des données..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Administration</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Gestion des utilisateurs et statistiques
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <Card elevation="small" padding="large" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalUsers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Utilisateurs</Text>
          </Card>
          <Card elevation="small" padding="large" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.usersWithEmail}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avec email</Text>
          </Card>
          <Card elevation="small" padding="large" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.info }]}>{stats.usersWithPhone}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avec téléphone</Text>
          </Card>
          <Card elevation="small" padding="large" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.totalProjets}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Projets</Text>
          </Card>
        </View>

        {/* Liste des utilisateurs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Utilisateurs ({users.length})</Text>
          {users.length === 0 ? (
            <Card elevation="small" padding="large">
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun utilisateur trouvé
              </Text>
            </Card>
          ) : (
            <FlatList
              data={users}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleUserPress(item)}
                  activeOpacity={0.7}
                >
                  <Card elevation="small" padding="large" style={styles.userCard}>
                    <View style={styles.userHeader}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
                          {item.prenom.charAt(0).toUpperCase()}{item.nom.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                          {item.prenom} {item.nom}
                        </Text>
                        <Text style={[styles.userIdentifier, { color: colors.textSecondary }]}>
                          {item.email || item.telephone || 'Pas d\'identifiant'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.userDetails, { borderTopColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ID:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                          {item.id}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Provider:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.provider}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Créé le:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {new Date(item.date_creation).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              )}
            />
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
  header: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userCard: {
    marginBottom: SPACING.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  userIdentifier: {
    fontSize: FONT_SIZES.sm,
  },
  userDetails: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
    textAlign: 'right',
  },
});

