/**
 * Utilitaire de débogage pour capturer les erreurs "Text strings must be rendered within a <Text> component"
 * Ajoute un ErrorBoundary et des logs détaillés pour identifier la source exacte
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary spécialisé pour capturer les erreurs de rendu de texte
 */
export class TextRenderingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Vérifier si c'est une erreur de rendu de texte
    const isTextRenderingError =
      error.message.includes('Text strings must be rendered') ||
      error.message.includes('must be rendered within a <Text>');

    if (isTextRenderingError) {
      return { hasError: true, error };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isTextRenderingError =
      error.message.includes('Text strings must be rendered') ||
      error.message.includes('must be rendered within a <Text>');

    if (isTextRenderingError) {
      console.error('🔴 [TextRenderingDebugger] ERREUR CAPTURÉE:', {
        componentName: this.props.componentName || 'Unknown',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
      });

      // Extraire le composant problématique depuis le componentStack
      const componentStack = errorInfo.componentStack || '';
      const componentMatches = componentStack.match(/at\s+(\w+)\s*\(/g);
      if (componentMatches) {
        console.error('🔍 Composants dans la stack:', componentMatches);
      }

      // Extraire les lignes de code depuis le stack
      const stackLines = error.stack?.split('\n') || [];
      console.error('📋 Stack trace complet:', stackLines);

      this.setState({ error, errorInfo });
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const isTextRenderingError =
        this.state.error.message.includes('Text strings must be rendered') ||
        this.state.error.message.includes('must be rendered within a <Text>');

      if (isTextRenderingError) {
        return (
          <View style={{ padding: 20, backgroundColor: '#ffebee' }}>
            <Text style={{ color: '#c62828', fontWeight: 'bold', marginBottom: 10 }}>
              ⚠️ Erreur de rendu de texte détectée
            </Text>
            <Text style={{ color: '#424242', marginBottom: 5 }}>
              Composant: {this.props.componentName || 'Unknown'}
            </Text>
            <Text style={{ color: '#424242', marginBottom: 5 }}>
              Message: {this.state.error.message}
            </Text>
            {this.state.errorInfo?.componentStack && (
              <Text style={{ color: '#424242', fontSize: 10, marginTop: 10 }}>
                Stack: {this.state.errorInfo.componentStack.substring(0, 500)}
              </Text>
            )}
          </View>
        );
      }
    }

    return this.props.children;
  }
}

/**
 * Hook pour logger les valeurs avant de les rendre
 */
export function useTextRenderingLogger(value: unknown, label: string, componentName: string) {
  React.useEffect(() => {
    if (typeof value === 'string' && value.length > 0) {
      console.log(`[TextLogger] ${componentName}.${label}:`, {
        type: typeof value,
        value: value.substring(0, 50),
        length: value.length,
      });
    } else if (typeof value === 'number') {
      console.log(`[TextLogger] ${componentName}.${label}:`, {
        type: typeof value,
        value,
      });
    }
  }, [value, label, componentName]);
}

/**
 * Wrapper pour sécuriser le rendu d'une valeur
 */
export function safeRender(value: unknown, fallback: ReactNode = null): ReactNode {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    if (value === '') {
      return null; // Chaîne vide = ne rien rendre
    }
    return <Text>{value}</Text>;
  }

  if (typeof value === 'number') {
    return <Text>{value}</Text>;
  }

  if (typeof value === 'boolean') {
    return null; // Les booléens ne sont pas rendus
  }

  if (React.isValidElement(value)) {
    return value;
  }

  return <Text>{String(value)}</Text>;
}
