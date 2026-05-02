import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Surveiller les erreurs de tous les slices
  const { error: porcsError } = useSelector((state: RootState) => state.porcs);
  const { error: reproductionError } = useSelector((state: RootState) => state.reproduction);
  const { error: nutritionError } = useSelector((state: RootState) => state.nutrition);
  const { error: financeError } = useSelector((state: RootState) => state.finance);
  const { error: alertesError } = useSelector((state: RootState) => state.alertes);
  const { error: planificationError } = useSelector((state: RootState) => state.planification);
  const { error: mortalitesError } = useSelector((state: RootState) => state.mortalites);

  // Détecter les erreurs critiques
  useEffect(() => {
    const criticalErrors = [
      porcsError,
      reproductionError,
      nutritionError,
      financeError,
      alertesError,
      planificationError,
      mortalitesError,
    ].filter(error => error && error.includes('critique'));

    if (criticalErrors.length > 0) {
      setGlobalError(criticalErrors[0] || 'Erreur critique détectée');
    }
  }, [porcsError, reproductionError, nutritionError, financeError, alertesError, planificationError, mortalitesError]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Recharger toutes les données critiques
      const { loadPorcs } = await import('../store/slices/porcsSlice');
      const { loadGestations } = await import('../store/slices/reproductionSlice');
      const { loadTransactions } = await import('../store/slices/financeSlice');
      const { calculateAlertes } = await import('../store/slices/alertesSlice');
      const { chargerMortalites } = await import('../store/slices/mortalitesSlice');

      await Promise.all([
        dispatch(loadPorcs()),
        dispatch(loadGestations()),
        dispatch(loadTransactions()),
        dispatch(calculateAlertes({ porcs: [], gestations: [], transactions: [] })),
        dispatch(chargerMortalites()),
      ]);

      setGlobalError(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de recharger les données. Veuillez redémarrer l\'application.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setGlobalError(null);
  };

  if (globalError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBanner}>
          <Icon name="error" size={24} color="#fff" />
          <Text style={styles.errorText}>{globalError}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              disabled={isRetrying}
            >
              <Icon name="refresh" size={16} color="#fff" />
              <Text style={styles.buttonText}>
                {isRetrying ? 'Rechargement...' : 'Réessayer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dismissButton} 
              onPress={handleDismiss}
            >
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {children}
      </View>
    );
  }

  return <>{children}</>;
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Une erreur est survenue</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Une erreur inattendue s\'est produite'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 40, // Pour éviter la barre de statut
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
