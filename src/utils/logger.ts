/**
 * Utilitaire de logging pour React Native
 * Conditionne les logs avec __DEV__ pour éviter les logs en production
 * SÉCURITÉ : Masque automatiquement les tokens dans les logs
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info' | 'success';

/**
 * Liste des mots-clés sensibles à masquer automatiquement dans les logs
 * SÉCURITÉ : Ces champs ne doivent JAMAIS apparaître dans les logs
 */
const SENSITIVE_KEYWORDS = [
  'token',
  'password',
  'secret',
  'key',
  'access_token',
  'refresh_token',
  'auth_token',
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'credential',
  'private_key',
  'public_key',
  'ssh_key',
  'session_id',
  'cookie',
  'otp',
  'pin',
  'ssn',
  'credit_card',
  'cvv',
];

/**
 * Liste des patterns regex pour masquer les tokens JWT et autres secrets
 */
const SENSITIVE_PATTERNS = [
  // JWT tokens (format: header.payload.signature)
  /Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi,
  // access_token et refresh_token dans les chaînes
  /(access_token|refresh_token)["':\s]*[=:]\s*["']?([A-Za-z0-9_-]{20,})/gi,
  // Tokens JWT nus (20+ caractères avec des points)
  /["']([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/g,
  // Emails avec mots de passe potentiels
  /password["':\s]*[=:]\s*["']?([^"'\s]+)/gi,
  // Numéros de carte bancaire (16 chiffres)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
];

/**
 * Vérifie si une clé d'objet contient un mot-clé sensible
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerKey.includes(keyword));
}

/**
 * Masque les données sensibles dans un message pour éviter les fuites dans les logs
 * SÉCURITÉ : Ne JAMAIS logger les tokens, mots de passe, secrets, même en mode développement
 * 
 * @param message - Message à sanitizer (peut être string, object, array, etc.)
 * @param depth - Profondeur de récursion (pour éviter les boucles infinies)
 * @returns Message sanitizé avec toutes les données sensibles masquées
 */
function sanitizeLogMessage(message: any, depth: number = 0): any {
  // Protection contre la récursion infinie
  if (depth > 10) {
    return '[Object too deep to sanitize]';
  }

  if (typeof message === 'string') {
    let sanitized = message;
    
    // Appliquer tous les patterns de masquage
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '***REDACTED***');
    }
    
    return sanitized;
  }
  
  if (typeof message === 'object' && message !== null) {
    if (Array.isArray(message)) {
      return message.map(item => sanitizeLogMessage(item, depth + 1));
    }
    
    // Récursivement masquer les données sensibles dans les objets
    const sanitized: any = {};
    for (const [key, value] of Object.entries(message)) {
      // Masquer les valeurs des clés sensibles
      if (isSensitiveKey(key)) {
        sanitized[key] = '***REDACTED***';
      } else {
        // Récursivement sanitizer les valeurs non sensibles
        sanitized[key] = sanitizeLogMessage(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return message;
}

/**
 * Options pour le logging structuré
 */
export interface LogOptions {
  /** Niveau de log */
  level?: LogLevel;
  /** Données supplémentaires à logger (seront automatiquement sanitizées) */
  data?: Record<string, any>;
  /** Tags pour catégoriser le log */
  tags?: string[];
  /** Message principal */
  message: string;
}

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  /**
   * Logger structuré avec sanitization automatique
   * @param options - Options de log avec message et données optionnelles
   */
  structured: (options: LogOptions) => void;
}

/**
 * Logger conditionnel qui n'affiche les logs qu'en développement
 * SÉCURITÉ : Masque automatiquement les tokens dans tous les logs
 */
const createLogger = (prefix?: string): Logger => {
  const formatMessage = (level: LogLevel, ...args: any[]): any[] => {
    // SÉCURITÉ : Masquer les tokens dans tous les arguments de log
    const sanitizedArgs = args.map(sanitizeLogMessage);
    
    if (prefix) {
      return [`[${prefix}]`, `[${level.toUpperCase()}]`, ...sanitizedArgs];
    }
    return [`[${level.toUpperCase()}]`, ...sanitizedArgs];
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
      // SÉCURITÉ : Masquer les tokens même dans les logs d'erreur
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
    success: (...args: any[]) => {
      if (__DEV__) {
        console.log(...formatMessage('success', ...args));
      }
    },
    /**
     * Logger structuré avec sanitization automatique
     * Utilise cette méthode pour logger des données structurées en toute sécurité
     * 
     * @example
     * logger.structured({
     *   level: 'info',
     *   message: 'Utilisateur connecté',
     *   data: { userId: '123', email: 'user@example.com' },
     *   tags: ['auth', 'login']
     * });
     */
    structured: (options: LogOptions) => {
      const level = options.level || 'info';
      const sanitizedData = options.data ? sanitizeLogMessage(options.data) : undefined;
      
      const logEntry: any = {
        message: options.message,
        timestamp: new Date().toISOString(),
      };
      
      if (sanitizedData) {
        logEntry.data = sanitizedData;
      }
      
      if (options.tags && options.tags.length > 0) {
        logEntry.tags = options.tags;
      }
      
      if (prefix) {
        logEntry.prefix = prefix;
      }
      
      // Logger selon le niveau
      const formattedMessage = JSON.stringify(logEntry, null, __DEV__ ? 2 : 0);
      
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          if (__DEV__) {
            console.warn(formattedMessage);
          }
          break;
        case 'debug':
          if (__DEV__) {
            console.log(`[DEBUG] ${formattedMessage}`);
          }
          break;
        case 'success':
          if (__DEV__) {
            console.log(`[SUCCESS] ${formattedMessage}`);
          }
          break;
        case 'info':
        case 'log':
        default:
          if (__DEV__) {
            console.log(`[INFO] ${formattedMessage}`);
          }
          break;
      }
    },
  };
};

/**
 * Logger global par défaut
 */
export const logger = createLogger();

/**
 * Logger spécifique pour la base de données
 */
export const dbLogger = createLogger('DB');

/**
 * Créer un logger avec un préfixe personnalisé
 * @param prefix - Préfixe à ajouter à tous les logs
 * @returns Logger avec préfixe
 */
export const createLoggerWithPrefix = (prefix: string): Logger => {
  return createLogger(prefix);
};

/**
 * Export de la fonction de sanitization pour usage externe si nécessaire
 * ⚠️ Utiliser le logger structuré de préférence
 */
export { sanitizeLogMessage };

/**
 * Export par défaut pour compatibilité
 */
export default logger;
