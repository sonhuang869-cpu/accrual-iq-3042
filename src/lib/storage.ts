import { SEED_CONTRACTS, SEED_AUDIT_LOG } from './data';
import type { Contract, AuditEntry } from './types';

const CONTRACTS_KEY = 'accrualiq_contracts_v1';
const AUDIT_KEY = 'accrualiq_audit_v1';

function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function loadContracts(): Contract[] {
  return safeGetJSON<Contract[]>(CONTRACTS_KEY, SEED_CONTRACTS);
}

export function saveContracts(contracts: Contract[]): void {
  safeSetJSON(CONTRACTS_KEY, contracts);
}

export function loadAuditLog(): AuditEntry[] {
  return safeGetJSON<AuditEntry[]>(AUDIT_KEY, SEED_AUDIT_LOG);
}

export function saveAuditLog(entries: AuditEntry[]): void {
  safeSetJSON(AUDIT_KEY, entries);
}

export function resetToSeedData(): void {
  safeSetJSON(CONTRACTS_KEY, SEED_CONTRACTS);
  safeSetJSON(AUDIT_KEY, SEED_AUDIT_LOG);
}
