/**
 * Utilitaire de logging pour React Native
 * Conditionne les logs avec __DEV__ pour éviter les logs en production
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

/**
 * Logger conditionnel qui n'affiche les logs qu'en développement
 */
const createLogger = (prefix?: string): Logger => {
  const formatMessage = (level: LogLevel, ...args: any[]): any[] => {
    if (prefix) {
      return [`[${prefix}]`, `[${level.toUpperCase()}]`, ...args];
    }
    return [`[${level.toUpperCase()}]`, ...args];
  };

  return {
    log: (...args: any[]) => {
      if (__DEV__) {
        console.log(...formatMessage('log', ...args));
      }
    },
    warn: (...args: any[]) => {
      if (__DEV__) {
        console.warn(...formatMessage('warn', ...args));
      }
    },
    error: (...args: any[]) => {
      // Les erreurs sont toujours loggées, même en production
      console.error(...formatMessage('error', ...args));
    },
    debug: (...args: any[]) => {
      if (__DEV__) {
        console.log(...formatMessage('debug', ...args));
      }
    },
    info: (...args: any[]) => {
      if (__DEV__) {
        console.log(...formatMessage('info', ...args));
      }
    },
  };
};

/**
 * Logger global par défaut
 */
export const logger = createLogger();

/**
 * Créer un logger avec un préfixe personnalisé
 * @param prefix - Préfixe à ajouter à tous les logs
 * @returns Logger avec préfixe
 */
export const createLoggerWithPrefix = (prefix: string): Logger => {
  return createLogger(prefix);
};

/**
 * Export par défaut pour compatibilité
 */
export default logger;
