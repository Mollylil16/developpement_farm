import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Composant de carte statistique réutilisable
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle, 
  onPress 
}) => (
  <TouchableOpacity 
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <Icon name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

// Composant de bouton d'action rapide
interface QuickActionButtonProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  title, 
  icon, 
  color, 
  onPress 
}) => (
  <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
    <Icon name={icon} size={24} color={color} />
    <Text style={styles.quickActionText}>{title}</Text>
  </TouchableOpacity>
);

// Composant de modal réutilisable
interface ModalProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveText?: string;
  loading?: boolean;
}

export const CustomModal: React.FC<ModalProps> = ({ 
  visible, 
  title, 
  children, 
  onClose, 
  onSave, 
  saveText = 'Enregistrer',
  loading = false
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody}>
          {children}
        </ScrollView>
        
        {onSave && (
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={onSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{saveText}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  </Modal>
);

// Composant de champ de formulaire
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  required?: boolean;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  required = false,
  error
}) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={[
        styles.formInput,
        multiline && styles.formInputMultiline,
        error ? styles.formInputError : null
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Composant de sélecteur de type
interface TypeSelectorProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  required?: boolean;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  label,
  value,
  options,
  onSelect,
  required = false
}) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={styles.selectorContainer}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.selectorOption,
            value === option.value && styles.selectorOptionSelected
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text style={[
            styles.selectorOptionText,
            value === option.value && styles.selectorOptionTextSelected
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Composant d'alerte
interface AlertItemProps {
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  onDismiss?: () => void;
}

export const AlertItem: React.FC<AlertItemProps> = ({ type, message, onDismiss }) => {
  const getAlertConfig = () => {
    switch (type) {
      case 'warning':
        return { icon: 'warning', color: '#FF9800', bgColor: '#FFF3E0' };
      case 'info':
        return { icon: 'info', color: '#2196F3', bgColor: '#E3F2FD' };
      case 'success':
        return { icon: 'check-circle', color: '#4CAF50', bgColor: '#E8F5E8' };
      case 'error':
        return { icon: 'error', color: '#F44336', bgColor: '#FFEBEE' };
      default:
        return { icon: 'info', color: '#2196F3', bgColor: '#E3F2FD' };
    }
  };

  const config = getAlertConfig();

  return (
    <View style={[styles.alertItem, { backgroundColor: config.bgColor }]}>
      <Icon name={config.icon} size={20} color={config.color} />
      <Text style={[styles.alertText, { color: config.color }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.alertDismiss}>
          <Icon name="close" size={16} color={config.color} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Composant de bouton flottant
interface FloatingButtonProps {
  icon: string;
  onPress: () => void;
  color?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ 
  icon, 
  onPress, 
  color = '#2E7D32' 
}) => (
  <TouchableOpacity style={[styles.floatingButton, { backgroundColor: color }]} onPress={onPress}>
    <Icon name={icon} size={24} color="#fff" />
  </TouchableOpacity>
);

// Composant de section avec titre
interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export const Section: React.FC<SectionProps> = ({ title, children, action }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.text}</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  // StatCard styles
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },

  // QuickActionButton styles
  quickActionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Form styles
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  formInputError: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },

  // Selector styles
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectorOption: {
    padding: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectorOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectorOptionTextSelected: {
    color: '#fff',
  },

  // Alert styles
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  alertDismiss: {
    padding: 5,
  },

  // FloatingButton styles
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Section styles
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionAction: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
});
