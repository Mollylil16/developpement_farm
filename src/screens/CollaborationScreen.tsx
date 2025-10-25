import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  creerProjet, 
  rejoindreProjet, 
  inviterUtilisateur,
  ajouterActiviteLocale,
  setProjetActuel 
} from '../store/slices/collaborationSlice';
import { Section, CustomModal, FormField } from '../components/UIComponents';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Projet, Utilisateur, ActiviteUtilisateur } from '../types';

const CollaborationScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { projets, projetActuel, utilisateurActuel, activites, loading, error } = useSelector((state: RootState) => state.collaboration);

  const [showCreerProjet, setShowCreerProjet] = useState(false);
  const [showRejoindreProjet, setShowRejoindreProjet] = useState(false);
  const [showInviterUtilisateur, setShowInviterUtilisateur] = useState(false);
  const [showActivites, setShowActivites] = useState(false);
  
  const [projetForm, setProjetForm] = useState({
    nom: '',
    description: '',
  });
  
  const [lienPartage, setLienPartage] = useState('');
  const [invitationForm, setInvitationForm] = useState({
    email: '',
    role: 'collaborateur' as 'collaborateur' | 'lecteur',
  });

  // Fonctions de gestion
  const handleCreerProjet = async () => {
    if (!projetForm.nom.trim()) {
      Alert.alert('Erreur', 'Le nom du projet est requis');
      return;
    }

    if (!utilisateurActuel) {
      Alert.alert('Erreur', 'Utilisateur non identifié');
      return;
    }

    try {
      const result = await dispatch(creerProjet({
        nom: projetForm.nom,
        description: projetForm.description,
        proprietaireId: utilisateurActuel.id,
        proprietaireNom: utilisateurActuel.nom,
      })).unwrap();

      // Enregistrer l'activité
      dispatch(ajouterActiviteLocale({
        utilisateurId: utilisateurActuel.id,
        utilisateurNom: utilisateurActuel.nom,
        action: 'ajout',
        typeDonnee: 'projet',
        description: `Projet "${result.nom}" créé`,
        details: { projetId: result.id },
      } as any));

      setShowCreerProjet(false);
      setProjetForm({ nom: '', description: '' });
      Alert.alert('Succès', `Projet "${result.nom}" créé avec succès !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le projet');
    }
  };

  const handleRejoindreProjet = async () => {
    if (!lienPartage.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un lien de partage');
      return;
    }

    try {
      const result = await dispatch(rejoindreProjet(lienPartage)).unwrap();
      
      // Enregistrer l'activité
      if (utilisateurActuel) {
        dispatch(ajouterActiviteLocale({
          utilisateurId: utilisateurActuel.id,
          utilisateurNom: utilisateurActuel.nom,
          action: 'connexion',
          typeDonnee: 'projet',
          description: `A rejoint le projet "${result.nom}"`,
          details: { projetId: result.id },
        } as any));
      }

      setShowRejoindreProjet(false);
      setLienPartage('');
      Alert.alert('Succès', `Vous avez rejoint le projet "${result.nom}" !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rejoindre le projet');
    }
  };

  const handleInviterUtilisateur = async () => {
    if (!invitationForm.email.trim()) {
      Alert.alert('Erreur', 'L\'email est requis');
      return;
    }

    if (!projetActuel) {
      Alert.alert('Erreur', 'Aucun projet sélectionné');
      return;
    }

    try {
      const result = await dispatch(inviterUtilisateur({
        projetId: projetActuel.id,
        email: invitationForm.email,
        role: invitationForm.role,
      })).unwrap();

      // Enregistrer l'activité
      if (utilisateurActuel) {
        dispatch(ajouterActiviteLocale({
          utilisateurId: utilisateurActuel.id,
          utilisateurNom: utilisateurActuel.nom,
          action: 'ajout',
          typeDonnee: 'projet',
          description: `Invitation envoyée à ${invitationForm.email}`,
          details: { email: invitationForm.email, role: invitationForm.role },
        } as any));
      }

      setShowInviterUtilisateur(false);
      setInvitationForm({ email: '', role: 'collaborateur' });
      Alert.alert('Succès', `Invitation envoyée à ${invitationForm.email} !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation');
    }
  };

  const handlePartagerLien = async () => {
    if (!projetActuel) {
      Alert.alert('Erreur', 'Aucun projet sélectionné');
      return;
    }

    try {
      await Share.share({
        message: `Rejoignez mon projet "${projetActuel.nom}" sur FarmTrack !\n\nLien: ${projetActuel.lienPartage}\n\nTéléchargez l'app FarmTrack et utilisez ce lien pour accéder au projet.`,
        title: `Invitation - ${projetActuel.nom}`,
      });
    } catch (error) {
      // Fallback: copier dans le presse-papiers
      Clipboard.setString(projetActuel.lienPartage);
      Alert.alert('Succès', 'Lien copié dans le presse-papiers !');
    }
  };

  const handleCopierLien = () => {
    if (!projetActuel) return;
    
    Clipboard.setString(projetActuel.lienPartage);
    Alert.alert('Succès', 'Lien copié dans le presse-papiers !');
  };

  const ProjetCard = ({ projet }: { projet: Projet }) => (
    <TouchableOpacity 
      style={[
        styles.projetCard,
        projetActuel?.id === projet.id && styles.projetCardSelected
      ]}
      onPress={() => dispatch(setProjetActuel(projet))}
    >
      <View style={styles.projetHeader}>
        <Icon name="folder" size={24} color="#2E7D32" />
        <View style={styles.projetInfo}>
          <Text style={styles.projetNom}>{projet.nom}</Text>
          <Text style={styles.projetProprietaire}>Par {projet.proprietaireNom}</Text>
        </View>
        {projetActuel?.id === projet.id && (
          <Icon name="check-circle" size={24} color="#4CAF50" />
        )}
      </View>
      
      {projet.description && (
        <Text style={styles.projetDescription}>{projet.description}</Text>
      )}
      
      <View style={styles.projetStats}>
        <View style={styles.statItem}>
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.statText}>{projet.utilisateurs.length} utilisateur(s)</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.statText}>
            Modifié {projet.derniereModification.toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const UtilisateurCard = ({ utilisateur }: { utilisateur: Utilisateur }) => (
    <View style={styles.utilisateurCard}>
      <View style={styles.utilisateurInfo}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(utilisateur.nom) }]}>
          <Text style={styles.avatarText}>
            {utilisateur.nom.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.utilisateurDetails}>
          <Text style={styles.utilisateurNom}>{utilisateur.nom}</Text>
          <Text style={styles.utilisateurRole}>{utilisateur.role}</Text>
          {utilisateur.derniereActivite && (
            <Text style={styles.utilisateurActivite}>
              Dernière activité: {utilisateur.derniereActivite.toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(utilisateur.role) }]}>
        <Text style={styles.roleText}>{utilisateur.role}</Text>
      </View>
    </View>
  );

  const ActiviteCard = ({ activite }: { activite: ActiviteUtilisateur }) => (
    <View style={styles.activiteCard}>
      <View style={styles.activiteHeader}>
        <View style={[styles.activiteAvatar, { backgroundColor: getAvatarColor(activite.utilisateurNom) }]}>
          <Text style={styles.activiteAvatarText}>
            {activite.utilisateurNom.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.activiteInfo}>
          <Text style={styles.activiteUtilisateur}>{activite.utilisateurNom}</Text>
          <Text style={styles.activiteDescription}>{activite.description}</Text>
        </View>
        <Text style={styles.activiteDate}>
          {activite.date.toLocaleDateString()} {activite.date.toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  // Fonctions utilitaires
  const getAvatarColor = (nom: string) => {
    const colors = ['#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'];
    const index = nom.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'proprietaire': return '#4CAF50';
      case 'collaborateur': return '#2196F3';
      case 'lecteur': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collaboration</Text>
        <Text style={styles.subtitle}>Gérez vos projets partagés</Text>
      </View>

      {/* Actions rapides */}
      <Section title="Actions Rapides">
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => setShowCreerProjet(true)}
          >
            <Icon name="add" size={24} color="#fff" />
            <Text style={styles.actionText}>Créer un projet</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={() => setShowRejoindreProjet(true)}
          >
            <Icon name="group-add" size={24} color="#fff" />
            <Text style={styles.actionText}>Rejoindre</Text>
          </TouchableOpacity>
          
          {projetActuel && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={handlePartagerLien}
            >
              <Icon name="share" size={24} color="#fff" />
              <Text style={styles.actionText}>Partager</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      {/* Projets */}
      <Section title="Mes Projets">
        {projets.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun projet trouvé</Text>
            <Text style={styles.emptySubtext}>Créez votre premier projet ou rejoignez-en un</Text>
          </View>
        ) : (
          projets.map((projet) => (
            <ProjetCard key={projet.id} projet={projet} />
          ))
        )}
      </Section>

      {/* Projet actuel */}
      {projetActuel && (
        <>
          {/* Informations du projet */}
          <Section title="Projet Actuel">
            <View style={styles.projetActuelContainer}>
              <Text style={styles.projetActuelNom}>{projetActuel.nom}</Text>
              {projetActuel.description && (
                <Text style={styles.projetActuelDescription}>{projetActuel.description}</Text>
              )}
              
              <View style={styles.lienContainer}>
                <Text style={styles.lienLabel}>Lien de partage:</Text>
                <View style={styles.lienRow}>
                  <Text style={styles.lienText}>{projetActuel.lienPartage}</Text>
                  <TouchableOpacity onPress={handleCopierLien}>
                    <Icon name="content-copy" size={20} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Section>

          {/* Utilisateurs */}
          <Section title="Utilisateurs">
            <TouchableOpacity 
              style={styles.inviterButton}
              onPress={() => setShowInviterUtilisateur(true)}
            >
              <Icon name="person-add" size={20} color="#4CAF50" />
              <Text style={styles.inviterText}>Inviter un utilisateur</Text>
            </TouchableOpacity>
            
            {projetActuel.utilisateurs.map((utilisateur) => (
              <UtilisateurCard key={utilisateur.id} utilisateur={utilisateur} />
            ))}
          </Section>

          {/* Activités récentes */}
          <Section title="Activités Récentes">
            <TouchableOpacity 
              style={styles.voirToutesButton}
              onPress={() => setShowActivites(true)}
            >
              <Text style={styles.voirToutesText}>Voir toutes les activités</Text>
              <Icon name="chevron-right" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            {activites.slice(0, 5).map((activite) => (
              <ActiviteCard key={activite.id} activite={activite} />
            ))}
          </Section>
        </>
      )}

      {/* Modal Créer Projet */}
      <CustomModal
        visible={showCreerProjet}
        title="Créer un nouveau projet"
        onClose={() => setShowCreerProjet(false)}
      >
        <View style={styles.modalContent}>
          <FormField
            label="Nom du projet *"
            value={projetForm.nom}
            onChangeText={(text) => setProjetForm({...projetForm, nom: text})}
            placeholder="Ex: Ferme de la Vallée"
          />
          
          <FormField
            label="Description"
            value={projetForm.description}
            onChangeText={(text) => setProjetForm({...projetForm, description: text})}
            placeholder="Description du projet (optionnel)"
            multiline
          />
          
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={handleCreerProjet}
            disabled={loading}
          >
            <Text style={styles.modalButtonText}>
              {loading ? 'Création...' : 'Créer le projet'}
            </Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* Modal Rejoindre Projet */}
      <CustomModal
        visible={showRejoindreProjet}
        title="Rejoindre un projet"
        onClose={() => setShowRejoindreProjet(false)}
      >
        <View style={styles.modalContent}>
          <FormField
            label="Lien de partage *"
            value={lienPartage}
            onChangeText={setLienPartage}
            placeholder="farmtrack://projet/..."
          />
          
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={handleRejoindreProjet}
            disabled={loading}
          >
            <Text style={styles.modalButtonText}>
              {loading ? 'Connexion...' : 'Rejoindre le projet'}
            </Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* Modal Inviter Utilisateur */}
      <CustomModal
        visible={showInviterUtilisateur}
        title="Inviter un utilisateur"
        onClose={() => setShowInviterUtilisateur(false)}
      >
        <View style={styles.modalContent}>
          <FormField
            label="Email *"
            value={invitationForm.email}
            onChangeText={(text) => setInvitationForm({...invitationForm, email: text})}
            placeholder="utilisateur@example.com"
            keyboardType="email-address"
          />
          
          <Text style={styles.roleLabel}>Rôle:</Text>
          <View style={styles.roleOptions}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                invitationForm.role === 'collaborateur' && styles.roleOptionSelected
              ]}
              onPress={() => setInvitationForm({...invitationForm, role: 'collaborateur'})}
            >
              <Text style={styles.roleOptionText}>Collaborateur</Text>
              <Text style={styles.roleOptionDesc}>Peut modifier les données</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleOption,
                invitationForm.role === 'lecteur' && styles.roleOptionSelected
              ]}
              onPress={() => setInvitationForm({...invitationForm, role: 'lecteur'})}
            >
              <Text style={styles.roleOptionText}>Lecteur</Text>
              <Text style={styles.roleOptionDesc}>Lecture seule</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={handleInviterUtilisateur}
            disabled={loading}
          >
            <Text style={styles.modalButtonText}>
              {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* Modal Activités */}
      <CustomModal
        visible={showActivites}
        title="Toutes les activités"
        onClose={() => setShowActivites(false)}
      >
        <ScrollView style={styles.activitesModalContent}>
          {activites.map((activite) => (
            <ActiviteCard key={activite.id} activite={activite} />
          ))}
        </ScrollView>
      </CustomModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  projetCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  projetCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  projetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  projetInfo: {
    flex: 1,
    marginLeft: 10,
  },
  projetNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  projetProprietaire: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  projetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  projetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  projetActuelContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  projetActuelNom: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  projetActuelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  lienContainer: {
    marginTop: 10,
  },
  lienLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  lienRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
  },
  lienText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  inviterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  inviterText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  utilisateurCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilisateurInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  utilisateurDetails: {
    flex: 1,
  },
  utilisateurNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  utilisateurRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  utilisateurActivite: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  voirToutesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  voirToutesText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  activiteCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  activiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activiteAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activiteAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activiteInfo: {
    flex: 1,
  },
  activiteUtilisateur: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  activiteDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activiteDate: {
    fontSize: 10,
    color: '#999',
  },
  modalContent: {
    padding: 10,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  roleOptions: {
    marginBottom: 20,
  },
  roleOption: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  roleOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  roleOptionDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  activitesModalContent: {
    maxHeight: 400,
  },
});

export default CollaborationScreen;
