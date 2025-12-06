/**
 * Configuration API
 */

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  TIMEOUT: 30000, // 30 secondes
  USE_API: process.env.EXPO_PUBLIC_USE_API === 'true', // Basculer entre SQLite et API
};

