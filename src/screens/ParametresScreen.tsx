import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { setDevise, setLangue, setNotifications, setTheme } from '../store/slices/parametresSlice';
import { Section, CustomModal, FormField } from '../components/UIComponents';
import { CalculsAgricoles } from '../utils/calculs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Devise, DeviseConfig } from '../types';
import { DEVISES_CONFIG } from '../store/slices/parametresSlice';

const ParametresScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { parametres, deviseConfig } = useSelector((state: RootState) => state.parametres);

  const [showDeviseModal, setShowDeviseModal] = useState(false);
  const [showLangueModal, setShowLangueModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Fonctions de gestion
  const handleChangerDevise = (devise: Devise) => {
    dispatch(setDevise(devise));
    setShowDeviseModal(false);
    Alert.alert('Succès', `Devise changée pour ${DEVISES_CONFIG[devise].nom}`);
  };

  const handleChangerLangue = (langue: 'fr' | 'en') => {
    dispatch(setLangue(langue));
    setShowLangueModal(false);
    Alert.alert('Succès', `Langue changée pour ${langue === 'fr' ? 'Français' : 'English'}`);
  };

  const handleChangerTheme = (theme: 'clair' | 'sombre') => {
    dispatch(setTheme(theme));
    setShowThemeModal(false);
    Alert.alert('Succès', `Thème changé pour ${theme === 'clair' ? 'Clair' : 'Sombre'}`);
  };

  const handleToggleNotifications = () => {
    dispatch(setNotifications(!parametres.notifications));
    Alert.alert('Succès', `Notifications ${!parametres.notifications ? 'activées' : 'désactivées'}`);
  };

  const ParametreCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    onPress, 
    subtitle 
  }: {
    title: string;
    value: string;
    icon: string;
    color: string;
    onPress: () => void;
    subtitle?: string;
  }) => (
    <TouchableOpacity style={[styles.parametreCard, { borderLeftColor: color }]} onPress={onPress}>
      <Icon name={icon} size={24} color={color} />
      <View style={styles.parametreContent}>
        <Text style={styles.parametreTitle}>{title}</Text>
        <Text style={styles.parametreValue}>{value}</Text>
        {subtitle && <Text style={styles.parametreSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const DeviseOption = ({ devise, config }: { devise: Devise; config: DeviseConfig }) => (
    <TouchableOpacity
      style={[
        styles.deviseOption,
        parametres.devise === devise && styles.deviseOptionSelected
      ]}
      onPress={() => handleChangerDevise(devise)}
    >
      <View style={styles.deviseInfo}>
        <Text style={styles.deviseCode}>{devise}</Text>
        <Text style={styles.deviseNom}>{config.nom}</Text>
        <Text style={styles.deviseSymbole}>{config.symbole}</Text>
      </View>
      {parametres.devise === devise && (
        <Icon name="check" size={24} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  const LangueOption = ({ code, nom }: { code: 'fr' | 'en'; nom: string }) => (
    <TouchableOpacity
      style={[
        styles.langueOption,
        parametres.langue === code && styles.langueOptionSelected
      ]}
      onPress={() => handleChangerLangue(code)}
    >
      <Text style={styles.langueNom}>{nom}</Text>
      {parametres.langue === code && (
        <Icon name="check" size={24} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  const ThemeOption = ({ code, nom }: { code: 'clair' | 'sombre'; nom: string }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        parametres.theme === code && styles.themeOptionSelected
      ]}
      onPress={() => handleChangerTheme(code)}
    >
      <Text style={styles.themeNom}>{nom}</Text>
      {parametres.theme === code && (
        <Icon name="check" size={24} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>Personnalisez votre application</Text>
      </View>

      {/* Paramètres généraux */}
      <Section title="Général">
        <ParametreCard
          title="Devise"
          value={`${deviseConfig.symbole} - ${deviseConfig.nom}`}
          icon="euro"
          color="#4CAF50"
          onPress={() => setShowDeviseModal(true)}
          subtitle="Devise utilisée pour les montants"
        />
        
        <ParametreCard
          title="Langue"
          value={parametres.langue === 'fr' ? 'Français' : 'English'}
          icon="language"
          color="#2196F3"
          onPress={() => setShowLangueModal(true)}
          subtitle="Langue de l'interface"
        />
        
        <ParametreCard
          title="Thème"
          value={parametres.theme === 'clair' ? 'Clair' : 'Sombre'}
          icon="palette"
          color="#FF9800"
          onPress={() => setShowThemeModal(true)}
          subtitle="Apparence de l'application"
        />
      </Section>

      {/* Paramètres de notifications */}
      <Section title="Notifications">
        <ParametreCard
          title="Notifications"
          value={parametres.notifications ? 'Activées' : 'Désactivées'}
          icon="notifications"
          color={parametres.notifications ? '#4CAF50' : '#F44336'}
          onPress={handleToggleNotifications}
          subtitle="Alertes et rappels"
        />
      </Section>

      {/* Informations sur la devise */}
      <Section title="Informations Devise">
        <View style={styles.deviseInfoContainer}>
          <View style={styles.deviseInfoItem}>
            <Text style={styles.deviseInfoLabel}>Devise actuelle</Text>
            <Text style={styles.deviseInfoValue}>{deviseConfig.nom} ({deviseConfig.code})</Text>
          </View>
          <View style={styles.deviseInfoItem}>
            <Text style={styles.deviseInfoLabel}>Symbole</Text>
            <Text style={styles.deviseInfoValue}>{deviseConfig.symbole}</Text>
          </View>
          <View style={styles.deviseInfoItem}>
            <Text style={styles.deviseInfoLabel}>Taux de change</Text>
            <Text style={styles.deviseInfoValue}>1 EUR = {deviseConfig.tauxChange} {deviseConfig.code}</Text>
          </View>
          <View style={styles.deviseInfoItem}>
            <Text style={styles.deviseInfoLabel}>Position symbole</Text>
            <Text style={styles.deviseInfoValue}>
              {deviseConfig.positionSymbole === 'before' ? 'Avant le montant' : 'Après le montant'}
            </Text>
          </View>
        </View>
      </Section>

      {/* Exemple de formatage */}
      <Section title="Exemple de Formatage">
        <View style={styles.exempleContainer}>
          <Text style={styles.exempleLabel}>Exemple avec 1000 EUR :</Text>
          <Text style={styles.exempleValue}>
            {CalculsAgricoles.formaterMontant(1000, deviseConfig)}
          </Text>
        </View>
      </Section>

      {/* Modal de sélection de devise */}
      <CustomModal
        visible={showDeviseModal}
        title="Choisir une devise"
        onClose={() => setShowDeviseModal(false)}
      >
        <View style={styles.modalContent}>
          {Object.entries(DEVISES_CONFIG).map(([code, config]) => (
            <DeviseOption key={code} devise={code as Devise} config={config} />
          ))}
        </View>
      </CustomModal>

      {/* Modal de sélection de langue */}
      <CustomModal
        visible={showLangueModal}
        title="Choisir une langue"
        onClose={() => setShowLangueModal(false)}
      >
        <View style={styles.modalContent}>
          <LangueOption code="fr" nom="Français" />
          <LangueOption code="en" nom="English" />
        </View>
      </CustomModal>

      {/* Modal de sélection de thème */}
      <CustomModal
        visible={showThemeModal}
        title="Choisir un thème"
        onClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalContent}>
          <ThemeOption code="clair" nom="Clair" />
          <ThemeOption code="sombre" nom="Sombre" />
        </View>
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
  parametreCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parametreContent: {
    flex: 1,
    marginLeft: 15,
  },
  parametreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  parametreValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  parametreSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deviseInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviseInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviseInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  deviseInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  exempleContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exempleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  exempleValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalContent: {
    padding: 10,
  },
  deviseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviseOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  deviseInfo: {
    flex: 1,
  },
  deviseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviseNom: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviseSymbole: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  langueOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  langueOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  langueNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  themeOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  themeNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ParametresScreen;
