/**
 * Configuration de la base de données PostgreSQL
 * 
 * IMPORTANT: React Native ne peut pas se connecter directement à PostgreSQL.
 * Cette configuration sera utilisée par le backend API (Node.js/NestJS)
 * qui fera le pont entre l'app et PostgreSQL.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number; // Nombre maximum de connexions dans le pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Configuration de production (PostgreSQL)
 */
export const postgresConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'farmtrack_db',
  user: process.env.DB_USER || 'farmtrack_user',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' || false,
  max: 20, // Maximum 20 connexions simultanées
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 2000, // Timeout de connexion: 2s
};

/**
 * URL de connexion PostgreSQL (format standard)
 */
export const getPostgresConnectionString = (): string => {
  const { host, port, database, user, password, ssl } = postgresConfig;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${user}:${password}@${host}:${port}/${database}${sslParam}`;
};

/**
 * Vérifier si on est en mode développement (SQLite local) ou production (PostgreSQL)
 */
export const isProductionMode = (): boolean => {
  return process.env.NODE_ENV === 'production' || process.env.USE_POSTGRES === 'true';
};

/**
 * Configuration pour l'API backend
 * L'app React Native utilisera cette URL pour communiquer avec le backend
 */
export const apiConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 secondes
};

