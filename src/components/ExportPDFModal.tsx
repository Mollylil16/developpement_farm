import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { CustomModal, FormField } from './UIComponents';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RapportPDFOptions } from '../services/PDFGeneratorService';

interface ExportPDFModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (options: RapportPDFOptions) => void;
  loading?: boolean;
}

const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  visible,
  onClose,
  onExport,
  loading = false,
}) => {
  const [options, setOptions] = useState<RapportPDFOptions>({
    type: 'complet',
    includeCharts: true,
    includeDetails: true,
    language: 'fr',
  });

  const handleExport = () => {
    onExport(options);
  };

  const TypeOption = ({ value, label, description }: { value: RapportPDFOptions['type']; label: string; description: string }) => (
    <TouchableOpacity
      style={[
        styles.typeOption,
        options.type === value && styles.typeOptionSelected
      ]}
      onPress={() => setOptions({...options, type: value})}
    >
      <View style={styles.typeOptionContent}>
        <Text style={styles.typeOptionLabel}>{label}</Text>
        <Text style={styles.typeOptionDescription}>{description}</Text>
      </View>
      {options.type === value && (
        <Icon name="check-circle" size={24} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  const CheckboxOption = ({ 
    label, 
    description, 
    value, 
    onToggle 
  }: { 
    label: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void; 
  }) => (
    <TouchableOpacity style={styles.checkboxOption} onPress={onToggle}>
      <View style={styles.checkboxContent}>
        <Text style={styles.checkboxLabel}>{label}</Text>
        <Text style={styles.checkboxDescription}>{description}</Text>
      </View>
      <View style={[styles.checkbox, value && styles.checkboxSelected]}>
        {value && <Icon name="check" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <CustomModal
      visible={visible}
      title="Exporter en PDF"
      onClose={onClose}
    >
      <ScrollView style={styles.modalContent}>
        {/* Type de rapport */}
        <Text style={styles.sectionTitle}>Type de rapport</Text>
        <TypeOption
          value="complet"
          label="Rapport Complet"
          description="Toutes les sections (finance, production, reproduction, nutrition)"
        />
        <TypeOption
          value="finance"
          label="Rapport Financier"
          description="Analyse financière détaillée avec chiffres et graphiques"
        />
        <TypeOption
          value="production"
          label="Rapport de Production"
          description="Analyse de la production et des performances"
        />
        <TypeOption
          value="reproduction"
          label="Rapport de Reproduction"
          description="Analyse de la reproduction et des gestations"
        />
        <TypeOption
          value="nutrition"
          label="Rapport Nutritionnel"
          description="Analyse nutritionnelle et recommandations"
        />

        {/* Options d'inclusion */}
        <Text style={styles.sectionTitle}>Options d'inclusion</Text>
        <CheckboxOption
          label="Inclure les graphiques"
          description="Ajouter les graphiques et visualisations"
          value={options.includeCharts}
          onToggle={() => setOptions({...options, includeCharts: !options.includeCharts})}
        />
        <CheckboxOption
          label="Inclure les détails"
          description="Ajouter les annexes détaillées"
          value={options.includeDetails}
          onToggle={() => setOptions({...options, includeDetails: !options.includeDetails})}
        />

        {/* Langue */}
        <Text style={styles.sectionTitle}>Langue</Text>
        <View style={styles.languageOptions}>
          <TouchableOpacity
            style={[
              styles.languageOption,
              options.language === 'fr' && styles.languageOptionSelected
            ]}
            onPress={() => setOptions({...options, language: 'fr'})}
          >
            <Text style={styles.languageText}>Français</Text>
            {options.language === 'fr' && (
              <Icon name="check" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageOption,
              options.language === 'en' && styles.languageOptionSelected
            ]}
            onPress={() => setOptions({...options, language: 'en'})}
          >
            <Text style={styles.languageText}>English</Text>
            {options.language === 'en' && (
              <Icon name="check" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>

        {/* Aperçu des options */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Aperçu du rapport</Text>
          <Text style={styles.previewText}>
            {options.type === 'complet' && 'Rapport complet avec toutes les sections'}
            {options.type === 'finance' && 'Rapport financier avec analyse détaillée'}
            {options.type === 'production' && 'Rapport de production avec KPIs'}
            {options.type === 'reproduction' && 'Rapport de reproduction avec gestations'}
            {options.type === 'nutrition' && 'Rapport nutritionnel avec recommandations'}
          </Text>
          <Text style={styles.previewDetails}>
            {options.includeCharts && '• Graphiques inclus\n'}
            {options.includeDetails && '• Annexes détaillées incluses\n'}
            • Langue: {options.language === 'fr' ? 'Français' : 'English'}
          </Text>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.exportButton, loading && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={loading}
          >
            <Icon name="picture-as-pdf" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>
              {loading ? 'Génération...' : 'Générer PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 10,
    maxHeight: 600,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  typeOption: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  typeOptionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  languageOption: {
    flex: 1,
    padding: 15,
    marginHorizontal: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  languageOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  languageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  previewContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  previewDetails: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  exportButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
});

export default ExportPDFModal;
