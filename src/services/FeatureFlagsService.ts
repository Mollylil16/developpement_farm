/**
 * Service de gestion des Feature Flags et A/B Testing
 * Supporte les flags locaux et distants (préparé pour LaunchDarkly)
 *
 * @example
 * ```typescript
 * const featureFlags = getFeatureFlagsService();
 * const isEnabled = await featureFlags.isEnabled('new_dashboard', userId);
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type FeatureFlagKey = string;
export type UserId = string | null;
export type FlagValue = boolean | string | number | object;

export interface FeatureFlagConfig {
  key: FeatureFlagKey;
  defaultValue: FlagValue;
  description?: string;
  rolloutPercentage?: number; // Pourcentage d'utilisateurs (0-100)
  targetUsers?: string[]; // IDs d'utilisateurs ciblés
  targetRoles?: string[]; // Rôles ciblés (producer, buyer, veterinarian, etc.)
  environment?: 'development' | 'staging' | 'production';
  metadata?: Record<string, unknown>;
}

export interface ABTestVariant {
  name: string;
  percentage: number; // Pourcentage d'utilisateurs pour cette variante
  value: FlagValue;
}

export interface ABTestConfig {
  key: FeatureFlagKey;
  variants: ABTestVariant[];
  defaultVariant?: string; // Variante par défaut si pas d'assignation
  description?: string;
  targetUsers?: string[];
  targetRoles?: string[];
}

export interface UserContext {
  userId?: string | null;
  role?: string;
  email?: string;
  customAttributes?: Record<string, unknown>;
}

class FeatureFlagsService {
  private static instance: FeatureFlagsService | null = null;
  private flags: Map<FeatureFlagKey, FeatureFlagConfig> = new Map();
  private abTests: Map<FeatureFlagKey, ABTestConfig> = new Map();
  private remoteFlags: Map<FeatureFlagKey, FlagValue> = new Map();
  private userAssignments: Map<string, Map<FeatureFlagKey, FlagValue>> = new Map();
  private readonly STORAGE_KEY = '@feature_flags_cache';
  private readonly STORAGE_KEY_ASSIGNMENTS = '@feature_flags_assignments';

  private constructor() {
    this.loadCachedFlags();
  }

  /**
   * Singleton pattern
   */
  static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService();
    }
    return FeatureFlagsService.instance;
  }

  /**
   * Enregistre un feature flag local
   */
  registerFlag(config: FeatureFlagConfig): void {
    this.flags.set(config.key, config);
  }

  /**
   * Enregistre plusieurs flags à la fois
   */
  registerFlags(configs: FeatureFlagConfig[]): void {
    configs.forEach((config) => this.registerFlag(config));
  }

  /**
   * Enregistre un test A/B
   */
  registerABTest(config: ABTestConfig): void {
    this.abTests.set(config.key, config);
  }

  /**
   * Vérifie si un flag est activé pour un utilisateur
   */
  async isEnabled(flagKey: FeatureFlagKey, context?: UserContext): Promise<boolean> {
    const value = await this.getFlagValue(flagKey, context);
    return Boolean(value);
  }

  /**
   * Récupère la valeur d'un flag
   */
  async getFlagValue(flagKey: FeatureFlagKey, context?: UserContext): Promise<FlagValue> {
    // 1. Vérifier les flags distants (priorité)
    if (this.remoteFlags.has(flagKey)) {
      return this.remoteFlags.get(flagKey)!;
    }

    // 2. Vérifier les assignations utilisateur (cache)
    if (context?.userId) {
      const assignment = await this.getUserAssignment(context.userId, flagKey);
      if (assignment !== undefined) {
        return assignment;
      }
    }

    // 3. Vérifier les tests A/B
    const abTest = this.abTests.get(flagKey);
    if (abTest) {
      return await this.getABTestVariant(abTest, context);
    }

    // 4. Vérifier les flags locaux
    const flag = this.flags.get(flagKey);
    if (flag) {
      return this.evaluateFlag(flag, context);
    }

    // 5. Valeur par défaut: false
    return false;
  }

  /**
   * Évalue un flag local avec rollout et targeting
   */
  private evaluateFlag(flag: FeatureFlagConfig, context?: UserContext): FlagValue {
    // Vérifier le targeting par rôle
    if (flag.targetRoles && flag.targetRoles.length > 0) {
      if (!context?.role || !flag.targetRoles.includes(context.role)) {
        return flag.defaultValue;
      }
    }

    // Vérifier le targeting par utilisateur
    if (flag.targetUsers && flag.targetUsers.length > 0) {
      if (context?.userId && flag.targetUsers.includes(context.userId)) {
        return true; // Forcer l'activation pour les utilisateurs ciblés
      }
      // Si targetUsers est défini mais l'utilisateur n'est pas dans la liste
      if (context?.userId && !flag.targetUsers.includes(context.userId)) {
        return flag.defaultValue;
      }
    }

    // Rollout progressif
    if (flag.rolloutPercentage !== undefined && context?.userId) {
      const shouldEnable = this.shouldEnableForUser(
        context.userId,
        flag.key,
        flag.rolloutPercentage
      );
      return shouldEnable ? true : flag.defaultValue;
    }

    // Si pas de rollout et pas de targeting, retourner la valeur par défaut
    // Mais si targetRoles est défini et correspond, activer
    if (flag.targetRoles && flag.targetRoles.length > 0 && context?.role) {
      if (flag.targetRoles.includes(context.role)) {
        return true; // Activer pour les rôles ciblés
      }
    }

    return flag.defaultValue;
  }

  /**
   * Détermine si un utilisateur doit avoir accès au flag (rollout)
   */
  private shouldEnableForUser(userId: string, flagKey: string, percentage: number): boolean {
    // Utiliser un hash déterministe pour garantir la cohérence
    const hash = this.hashString(`${userId}:${flagKey}`);
    const normalized = (hash % 100) + 1; // 1-100
    return normalized <= percentage;
  }

  /**
   * Hash simple et déterministe
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Récupère la variante A/B pour un utilisateur
   */
  private async getABTestVariant(abTest: ABTestConfig, context?: UserContext): Promise<FlagValue> {
    // Vérifier le targeting
    if (abTest.targetRoles && abTest.targetRoles.length > 0) {
      if (!context?.role || !abTest.targetRoles.includes(context.role)) {
        return abTest.defaultVariant
          ? this.getVariantValue(abTest, abTest.defaultVariant)
          : abTest.variants[0]?.value || false;
      }
    }

    if (abTest.targetUsers && abTest.targetUsers.length > 0) {
      if (context?.userId && !abTest.targetUsers.includes(context.userId)) {
        return abTest.defaultVariant
          ? this.getVariantValue(abTest, abTest.defaultVariant)
          : abTest.variants[0]?.value || false;
      }
    }

    // Assigner une variante de manière déterministe
    if (context?.userId) {
      const assignment = await this.getUserABTestAssignment(context.userId, abTest);
      return assignment;
    }

    // Variante par défaut
    return abTest.defaultVariant
      ? this.getVariantValue(abTest, abTest.defaultVariant)
      : abTest.variants[0]?.value || false;
  }

  /**
   * Assigne une variante A/B de manière déterministe
   */
  private async getUserABTestAssignment(userId: string, abTest: ABTestConfig): Promise<FlagValue> {
    // Vérifier le cache
    const cached = await this.getUserAssignment(userId, abTest.key);
    if (cached !== undefined) {
      return cached;
    }

    // Calculer l'assignation basée sur le hash
    const hash = this.hashString(`${userId}:${abTest.key}`);
    const normalized = hash % 100;

    // Assigner selon les pourcentages
    let cumulative = 0;
    for (const variant of abTest.variants) {
      cumulative += variant.percentage;
      if (normalized < cumulative) {
        // Sauvegarder l'assignation
        await this.setUserAssignment(userId, abTest.key, variant.value);
        return variant.value;
      }
    }

    // Fallback: première variante
    const firstVariant = abTest.variants[0];
    if (firstVariant) {
      await this.setUserAssignment(userId, abTest.key, firstVariant.value);
      return firstVariant.value;
    }

    return false;
  }

  /**
   * Récupère la valeur d'une variante par nom
   */
  private getVariantValue(abTest: ABTestConfig, variantName: string): FlagValue {
    const variant = abTest.variants.find((v) => v.name === variantName);
    return variant?.value || false;
  }

  /**
   * Récupère l'assignation d'un utilisateur pour un flag
   */
  private async getUserAssignment(userId: string, flagKey: string): Promise<FlagValue | undefined> {
    const userAssignments = this.userAssignments.get(userId);
    if (userAssignments) {
      return userAssignments.get(flagKey);
    }

    // Charger depuis le cache
    try {
      const cached = await AsyncStorage.getItem(`${this.STORAGE_KEY_ASSIGNMENTS}:${userId}`);
      if (cached) {
        const assignments = JSON.parse(cached) as Record<string, FlagValue>;
        const userMap = new Map<FeatureFlagKey, FlagValue>(Object.entries(assignments));
        this.userAssignments.set(userId, userMap);
        return userMap.get(flagKey);
      }
    } catch (error) {
      console.warn('[FeatureFlags] Erreur lors du chargement du cache:', error);
    }

    return undefined;
  }

  /**
   * Sauvegarde l'assignation d'un utilisateur
   */
  private async setUserAssignment(
    userId: string,
    flagKey: string,
    value: FlagValue
  ): Promise<void> {
    let userAssignments = this.userAssignments.get(userId);
    if (!userAssignments) {
      userAssignments = new Map();
      this.userAssignments.set(userId, userAssignments);
    }
    userAssignments.set(flagKey, value);

    // Sauvegarder dans AsyncStorage
    try {
      const assignments = Object.fromEntries(userAssignments);
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY_ASSIGNMENTS}:${userId}`,
        JSON.stringify(assignments)
      );
    } catch (error) {
      console.warn('[FeatureFlags] Erreur lors de la sauvegarde:', error);
    }
  }

  /**
   * Met à jour les flags depuis un serveur distant (préparé pour LaunchDarkly)
   */
  async syncRemoteFlags(flags: Record<FeatureFlagKey, FlagValue>): Promise<void> {
    Object.entries(flags).forEach(([key, value]) => {
      this.remoteFlags.set(key, value);
    });
    await this.saveCachedFlags();
  }

  /**
   * Charge les flags depuis le cache local
   */
  private async loadCachedFlags(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const flags = JSON.parse(cached);
        Object.entries(flags).forEach(([key, value]) => {
          this.remoteFlags.set(key, value as FlagValue);
        });
      }
    } catch (error) {
      console.warn('[FeatureFlags] Erreur lors du chargement du cache:', error);
    }
  }

  /**
   * Sauvegarde les flags dans le cache local
   */
  private async saveCachedFlags(): Promise<void> {
    try {
      const flags = Object.fromEntries(this.remoteFlags);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(flags));
    } catch (error) {
      console.warn('[FeatureFlags] Erreur lors de la sauvegarde:', error);
    }
  }

  /**
   * Réinitialise tous les flags (utile pour les tests)
   */
  reset(): void {
    this.flags.clear();
    this.abTests.clear();
    this.remoteFlags.clear();
    this.userAssignments.clear();
  }

  /**
   * Liste tous les flags enregistrés
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Array.from(this.flags.values());
  }

  /**
   * Liste tous les tests A/B enregistrés
   */
  getAllABTests(): ABTestConfig[] {
    return Array.from(this.abTests.values());
  }
}

/**
 * Instance singleton exportée
 */
export const getFeatureFlagsService = (): FeatureFlagsService => {
  return FeatureFlagsService.getInstance();
};

export default FeatureFlagsService;
