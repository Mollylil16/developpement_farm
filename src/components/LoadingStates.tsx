import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Chargement...',
  size = 'large',
  color = '#2E7D32',
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size={size} color={color} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  retryText = 'Réessayer',
}) => (
  <View style={styles.errorContainer}>
    <Icon name="error-outline" size={48} color="#F44336" />
    <Text style={styles.errorTitle}>Erreur</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>{retryText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionText,
  onAction,
}) => (
  <View style={styles.emptyContainer}>
    <Icon name={icon} size={64} color="#ccc" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionText && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionButtonText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Chargement...',
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.overlayText}>{message}</Text>
      </View>
    </View>
  );
};

interface NetworkErrorProps {
  onRetry: () => void;
  message?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  message = 'Problème de connexion',
}) => (
  <View style={styles.networkErrorContainer}>
    <Icon name="wifi-off" size={48} color="#FF9800" />
    <Text style={styles.networkErrorTitle}>Connexion</Text>
    <Text style={styles.networkErrorMessage}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Icon name="refresh" size={20} color="#fff" />
      <Text style={styles.retryButtonText}>Réessayer</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 10,
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  networkErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  networkErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 10,
    marginBottom: 5,
  },
  networkErrorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
