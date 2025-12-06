/**
 * ErrorBoundary pour capturer les erreurs React et éviter les crashes
 * Version améliorée avec gestion sécurisée du thème et logging amélioré
 */

import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  Platform,
} from 'react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, LIGHT_COLORS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly MAX_RETRIES = this.props.maxRetries ?? 3;
  private readonly RETRY_DELAY = 1000; // 1 seconde entre les tentatives

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    const { errorCount, lastErrorTime } = this.state;

    // Détecter les erreurs récurrentes (même erreur dans les 5 secondes)
    const isRecurringError =
      lastErrorTime && now - lastErrorTime < 5000 && error.message === this.state.error?.message;

    const newErrorCount = isRecurringError ? errorCount + 1 : 1;

    // Détecter spécifiquement l'erreur "Text strings must be rendered"
    const isTextRenderingError = error.message.includes('Text strings must be rendered') ||
                                 error.message.includes('must be rendered within a <Text>');

    if (isTextRenderingError) {
      console.error('🔴 [ErrorBoundary] ERREUR DE RENDU DE TEXTE DÉTECTÉE:', {
        error: error.toString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorCount: newErrorCount,
        isRecurring: isRecurringError,
        suggestion: 'Vérifiez les composants dans componentStack ci-dessus. Cherchez les valeurs primitives (string/number) rendues directement dans des <View> ou autres composants non-Text.',
      });

      // Extraire le nom du composant problématique depuis le componentStack
      if (errorInfo.componentStack) {
        const componentMatch = errorInfo.componentStack.match(/at\s+(\w+)\s*\(/);
        if (componentMatch) {
          console.error(`🔍 Composant suspect: ${componentMatch[1]}`);
        }
      }
    }

    // Logger l'erreur avec plus de détails
    console.error('Error caught by boundary:', {
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: newErrorCount,
      isRecurring: isRecurringError,
      isTextRenderingError,
    });

    // Appeler le callback personnalisé si fourni
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }

    // En production, envoyer à un service de logging (ex: Sentry)
    if (!__DEV__) {
      // Exemple: Sentry.captureException(error, { extra: errorInfo });
      // TODO: Intégrer un service de logging en production
    }

    this.setState({
      error,
      errorInfo,
      errorCount: newErrorCount,
      lastErrorTime: now,
    });
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleReset = () => {
    const { errorCount } = this.state;

    // Si trop d'erreurs, suggérer un redémarrage
    if (errorCount >= this.MAX_RETRIES) {
      console.warn(`Maximum retries (${this.MAX_RETRIES}) reached. Consider restarting the app.`);
      // Optionnel: Forcer un redémarrage de l'application
      // RNRestart.Restart();
    }

    // Réinitialiser l'état avec un délai pour éviter les boucles
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        // Ne pas réinitialiser errorCount pour garder une trace
      });
    }, this.RETRY_DELAY);
  };

  handleForceRestart = () => {
    // Optionnel: Implémenter un redémarrage forcé
    // RNRestart.Restart();
    console.warn('Force restart requested but not implemented');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorCount={this.state.errorCount}
          maxRetries={this.MAX_RETRIES}
          onReset={this.handleReset}
          onForceRestart={this.handleForceRestart}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  maxRetries: number;
  onReset: () => void;
  onForceRestart: () => void;
}

/**
 * Hook sécurisé pour utiliser le thème
 * Retourne des couleurs par défaut si le ThemeProvider a échoué
 */
function useThemeSafe() {
  try {
    const theme = useTheme();
    return theme.colors;
  } catch {
    // Si useTheme échoue (par exemple si ThemeProvider a crashé),
    // utiliser les couleurs par défaut
    return LIGHT_COLORS;
  }
}

/**
 * Interface pour représenter une ligne de stack trace parsée
 */
interface StackFrame {
  functionName: string;
  file: string;
  line: string;
  column: string;
  raw: string;
}

/**
 * Parse une stack trace JavaScript en frames individuels
 */
function parseStackTrace(stack: string): StackFrame[] {
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];

  // Pattern pour les stack traces JavaScript standard
  // Format: "    at functionName (file:///path/to/file:line:column)"
  // ou: "    at file:///path/to/file:line:column"
  const stackPattern = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

  for (const line of lines) {
    if (line.trim() === '' || line.includes('Error:')) continue;

    const match = line.match(stackPattern);
    if (match) {
      frames.push({
        functionName: match[1] || '<anonymous>',
        file: match[2],
        line: match[3],
        column: match[4],
        raw: line,
      });
    } else {
      // Si le pattern ne correspond pas, garder la ligne brute
      frames.push({
        functionName: '<unknown>',
        file: line,
        line: '',
        column: '',
        raw: line,
      });
    }
  }

  return frames;
}

/**
 * Extrait le nom du fichier depuis un chemin complet
 */
function getFileName(filePath: string): string {
  // Enlever les préfixes comme file:///, http://, etc.
  const cleanPath = filePath.replace(/^(file:\/\/\/|https?:\/\/)/, '');
  const parts = cleanPath.split('/');
  return parts[parts.length - 1] || cleanPath;
}

/**
 * Parse le component stack React pour extraire les composants
 */
function parseComponentStack(
  componentStack: string
): Array<{ component: string; location: string }> {
  const components: Array<{ component: string; location: string }> = [];
  const lines = componentStack.split('\n');

  // Pattern pour les component stacks React
  // Format: "    in ComponentName (at FileName:line:column)"
  const componentPattern = /^\s*in\s+(.+?)\s*\(at\s+(.+?)\)$/;

  for (const line of lines) {
    if (line.trim() === '') continue;

    const match = line.match(componentPattern);
    if (match) {
      components.push({
        component: match[1].trim(),
        location: match[2].trim(),
      });
    } else {
      // Si le pattern ne correspond pas, garder la ligne brute
      components.push({
        component: line.trim(),
        location: '',
      });
    }
  }

  return components;
}

/**
 * Identifie le composant problématique depuis le component stack
 */
function identifyProblematicComponent(componentStack: string): string | null {
  const components = parseComponentStack(componentStack);
  // Le premier composant (hors ErrorBoundary) est généralement celui qui a causé l'erreur
  for (const comp of components) {
    if (!comp.component.includes('ErrorBoundary')) {
      return comp.component;
    }
  }
  return components[0]?.component || null;
}

function ErrorFallback({
  error,
  errorInfo,
  errorCount,
  maxRetries,
  onReset,
  onForceRestart,
}: ErrorFallbackProps) {
  // Utiliser le hook sécurisé pour éviter les erreurs si ThemeProvider a crashé
  const colors = useThemeSafe();
  const hasExceededMaxRetries = errorCount >= maxRetries;
  const [expandedSections, setExpandedSections] = useState<{
    stackTrace: boolean;
    componentStack: boolean;
  }>({
    stackTrace: false,
    componentStack: false,
  });

  // Analyser les stack traces
  const stackFrames = error?.stack ? parseStackTrace(error.stack) : [];
  const componentList = errorInfo?.componentStack
    ? parseComponentStack(errorInfo.componentStack)
    : [];
  const problematicComponent = errorInfo?.componentStack
    ? identifyProblematicComponent(errorInfo.componentStack)
    : null;

  // Fonction pour copier le texte dans le presse-papier
  const copyToClipboard = async (text: string) => {
    try {
      if (Platform.OS === 'web' && typeof (global as any).window !== 'undefined' && (global as any).window.navigator?.clipboard) {
        await (global as any).window.navigator.clipboard.writeText(text);
      } else {
        Clipboard.setString(text);
      }
      // TODO: Afficher un toast de confirmation
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleSection = (section: 'stackTrace' | 'componentStack') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emoji, { color: colors.error }]}>⚠️</Text>
        <Text style={[styles.title, { color: colors.text }]}>Une erreur s'est produite</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {hasExceededMaxRetries
            ? `L'application rencontre des erreurs récurrentes. Veuillez redémarrer l'application.`
            : `L'application a rencontré une erreur inattendue. Veuillez réessayer.`}
        </Text>

        {hasExceededMaxRetries && (
          <View
            style={[
              styles.warningBox,
              { backgroundColor: colors.warning + '20', borderColor: colors.warning },
            ]}
          >
            <Text style={[styles.warningText, { color: colors.warning }]}>
              ⚠️ Erreur répétée {errorCount} fois. Un redémarrage peut être nécessaire.
            </Text>
          </View>
        )}

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: colors.background }]}>
            <Text style={[styles.errorTitle, { color: colors.error }]}>Détails de l'erreur:</Text>
            <Text style={[styles.errorText, { color: colors.text }]}>{error.toString()}</Text>

            {/* Composant problématique identifié */}
            {problematicComponent && (
              <View
                style={[
                  styles.highlightBox,
                  { backgroundColor: colors.error + '15', borderColor: colors.error },
                ]}
              >
                <Text style={[styles.highlightTitle, { color: colors.error }]}>
                  🔍 Composant suspect:
                </Text>
                <Text style={[styles.highlightText, { color: colors.text }]}>
                  {problematicComponent}
                </Text>
              </View>
            )}

            {/* Stack trace analysée */}
            {error.stack && stackFrames.length > 0 && (
              <View style={styles.stackContainer}>
                <TouchableOpacity
                  onPress={() => toggleSection('stackTrace')}
                  style={styles.stackHeader}
                >
                  <Text style={[styles.stackTitle, { color: colors.text }]}>
                    📚 Stack Trace ({stackFrames.length} frames)
                  </Text>
                  <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                    {expandedSections.stackTrace ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {expandedSections.stackTrace && (
                  <>
                    <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                      {stackFrames.slice(0, 10).map((frame, index) => (
                        <View
                          key={index}
                          style={[styles.stackFrame, { borderLeftColor: colors.primary }]}
                        >
                          <Text style={[styles.stackFrameFunction, { color: colors.primary }]}>
                            {frame.functionName}
                          </Text>
                          <Text style={[styles.stackFrameFile, { color: colors.text }]}>
                            {getFileName(frame.file)}
                          </Text>
                          {frame.line && (
                            <Text
                              style={[styles.stackFrameLocation, { color: colors.textSecondary }]}
                            >
                              Ligne {frame.line}:{frame.column}
                            </Text>
                          )}
                        </View>
                      ))}
                      {stackFrames.length > 10 && (
                        <Text style={[styles.stackMore, { color: colors.textSecondary }]}>
                          ... et {stackFrames.length - 10} autres frames
                        </Text>
                      )}
                    </ScrollView>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(error.stack!)}
                      style={[
                        styles.copyButton,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                        📋 Copier la stack trace
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Component stack analysé */}
            {errorInfo?.componentStack && componentList.length > 0 && (
              <View style={styles.stackContainer}>
                <TouchableOpacity
                  onPress={() => toggleSection('componentStack')}
                  style={styles.stackHeader}
                >
                  <Text style={[styles.stackTitle, { color: colors.text }]}>
                    🧩 Component Stack ({componentList.length} composants)
                  </Text>
                  <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                    {expandedSections.componentStack ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
                {expandedSections.componentStack && (
                  <>
                    <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                      {componentList.map((comp, index) => (
                        <View
                          key={index}
                          style={[styles.componentItem, { borderLeftColor: colors.secondary }]}
                        >
                          <Text style={[styles.componentName, { color: colors.secondary }]}>
                            {comp.component}
                          </Text>
                          {comp.location && (
                            <Text
                              style={[styles.componentLocation, { color: colors.textSecondary }]}
                            >
                              {comp.location}
                            </Text>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(errorInfo.componentStack!)}
                      style={[
                        styles.copyButton,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                        📋 Copier le component stack
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Stack trace brute (fallback si parsing échoue) */}
            {error.stack && stackFrames.length === 0 && (
              <View style={styles.stackContainer}>
                <Text style={[styles.stackTitle, { color: colors.textSecondary }]}>
                  Stack trace (brute):
                </Text>
                <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                  <Text style={[styles.errorStack, { color: colors.textSecondary }]}>
                    {error.stack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {!hasExceededMaxRetries ? (
            <Button title="Réessayer" onPress={onReset} />
          ) : (
            <View style={styles.actionGroup}>
              <Button
                title="Réessayer quand même"
                onPress={onReset}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title="Redémarrer l'app"
                onPress={onForceRestart}
                variant="primary"
                style={styles.actionButton}
              />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  warningBox: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorDetails: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  errorTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontFamily: 'monospace',
  },
  stackContainer: {
    marginTop: SPACING.md,
  },
  stackTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  stackScroll: {
    maxHeight: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
  },
  errorStack: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
  },
  highlightBox: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  highlightTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  highlightText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
  },
  stackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  expandIcon: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
  stackFrame: {
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: BORDER_RADIUS.sm,
  },
  stackFrameFunction: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
    fontFamily: 'monospace',
  },
  stackFrameFile: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
    fontFamily: 'monospace',
  },
  stackFrameLocation: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
  },
  stackMore: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  componentItem: {
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: BORDER_RADIUS.sm,
  },
  componentName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  componentLocation: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
  },
  copyButton: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    maxWidth: 300,
  },
  actionGroup: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
    marginBottom: SPACING.md,
  },
});

export default ErrorBoundaryClass;
