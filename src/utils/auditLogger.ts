/**
 * Audit logger for sensitive operations.
 * Persists the last MAX_ENTRIES events to AsyncStorage so they survive app restarts
 * and can be reviewed for forensic / compliance purposes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIT_LOG_KEY = '@fermier_pro:audit_log';
const MAX_ENTRIES = 100;

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'auth.token_revoked'
  | 'data.clear_all'
  | 'marketplace.listing_created'
  | 'marketplace.listing_removed'
  | 'marketplace.offer_created'
  | 'marketplace.offer_accepted'
  | 'marketplace.offer_rejected';

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  userId?: string;
  meta?: Record<string, string | number | boolean>;
}

async function readLog(): Promise<AuditEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

export async function auditLog(
  action: AuditAction,
  userId?: string,
  meta?: AuditEntry['meta']
): Promise<void> {
  try {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      ...(userId && { userId }),
      ...(meta && { meta }),
    };

    const existing = await readLog();
    const updated = [...existing, entry].slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
  } catch {
    // Never throw — audit logging must not break the caller
  }
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return readLog();
}

export async function clearAuditLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUDIT_LOG_KEY);
  } catch {
    // ignore
  }
}
