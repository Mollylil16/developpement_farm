/**
 * Système de logging conditionnel
 * Les logs ne s'affichent qu'en mode développement pour améliorer les performances
 */

const isDev = __DEV__;

/**
 * Logger conditionnel - ne log que en développement
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Toujours logger les erreurs, même en production
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

/**
 * Logger pour la base de données - logs détaillés uniquement en dev
 */
export const dbLogger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('📋 [DB]', ...args);
    }
  },
  success: (...args: any[]) => {
    if (isDev) {
      console.log('✅ [DB]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('❌ [DB]', ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('⚠️ [DB]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.log('ℹ️  [DB]', ...args);
    }
  },
  step: (...args: any[]) => {
    if (isDev) {
      console.log('🔄 [DB]', ...args);
    }
  },
};

/**
 * Logger pour les schémas - logs détaillés uniquement en dev
 */
export const schemaLogger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('📋 [Schema]', ...args);
    }
  },
  success: (...args: any[]) => {
    if (isDev) {
      console.log('✅ [Schema]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('❌ [Schema]', ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('⚠️ [Schema]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.log('ℹ️  [Schema]', ...args);
    }
  },
  step: (...args: any[]) => {
    if (isDev) {
      console.log('🔄 [Schema]', ...args);
    }
  },
};

/**
 * Logger pour les migrations - logs détaillés uniquement en dev
 */
export const migrationLogger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('📋 [Migration]', ...args);
    }
  },
  success: (...args: any[]) => {
    if (isDev) {
      console.log('✅ [Migration]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('❌ [Migration]', ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('⚠️ [Migration]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.log('ℹ️  [Migration]', ...args);
    }
  },
  step: (...args: any[]) => {
    if (isDev) {
      console.log('🔄 [Migration]', ...args);
    }
  },
};

