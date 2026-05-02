/**
 * Composant global pour détecter et corriger les erreurs "Text strings must be rendered"
 * Enveloppe l'application entière pour intercepter toutes les valeurs problématiques
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalTextRenderGuard extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Vérifie si c'est l'erreur "Text strings must be rendered"
    if (error.message && error.message.includes('Text strings must be rendered')) {
      console.error('🔴 [GlobalTextRenderGuard] Erreur de rendu de texte détectée:', error);
      console.error('Stack trace:', error.stack);
      return { hasError: true, error };
    }
    throw error; // Re-throw si ce n'est pas l'erreur qu'on cherche
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message && error.message.includes('Text strings must be rendered')) {
      console.error('🔴 [GlobalTextRenderGuard] ERREUR DE RENDU DE TEXTE DÉTECTÉE:', {
        error: error.toString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });

      // Extraire TOUS les composants depuis le componentStack
      const componentMatches = errorInfo.componentStack?.matchAll(/at\s+(\w+)\s*\(/g);
      if (componentMatches) {
        const components = Array.from(componentMatches, (m) => m[1]);
        console.error(
          `🔍 [GlobalTextRenderGuard] Composants dans la stack (ordre d'appel):`,
          components
        );
      }

      // Extraire les lignes de code depuis le stack trace
      const stackLines = error.stack?.split('\n') || [];
      console.error(
        '📋 [GlobalTextRenderGuard] Stack trace complet (premières 30 lignes):',
        stackLines.slice(0, 30)
      );

      // Extraire les fichiers depuis le componentStack
      const fileMatches = errorInfo.componentStack?.matchAll(/\(([^)]+\.tsx?):(\d+):(\d+)\)/g);
      if (fileMatches) {
        const files = Array.from(fileMatches, (m) => ({ file: m[1], line: m[2], col: m[3] }));
        console.error('📁 [GlobalTextRenderGuard] Fichiers dans la stack:', files);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Erreur de rendu détectée
          </Text>
          <Text style={{ color: 'gray', textAlign: 'center' }}>{this.state.error?.message}</Text>
          <Text style={{ color: 'gray', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
            Consultez la console pour plus de détails
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
