import { loadContracts, saveContracts, loadAuditLog, saveAuditLog } from './storage';
import type { Contract, AuditEntry, PerformanceObligation } from './types';

function delay(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchContracts(): Promise<Contract[]> {
  await delay(200);
  return loadContracts();
}

export async function fetchContract(id: string): Promise<Contract | undefined> {
  await delay(150);
  return loadContracts().find(c => c.id === id);
}

export async function updateContractStatus(
  id: string,
  status: Contract['status'],
  user: string
): Promise<Contract> {
  await delay(300);
  const contracts = loadContracts();
  const idx = contracts.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Contract not found');

  const prev = contracts[idx];
  contracts[idx] = { ...prev, status, updatedAt: new Date().toISOString() };
  saveContracts(contracts);

  appendAuditEntry({
    id: `a-${Date.now()}`,
    contractId: id,
    contractNumber: prev.contractNumber,
    timestamp: new Date().toISOString(),
    event: 'Status changed',
    user,
    details: `Status updated from ${prev.status} to ${status}.`,
    category: 'StatusChange',
  });

  return contracts[idx];
}

export async function updatePO(
  contractId: string,
  po: PerformanceObligation,
  user: string
): Promise<Contract> {
  await delay(300);
  const contracts = loadContracts();
  const idx = contracts.findIndex(c => c.id === contractId);
  if (idx === -1) throw new Error('Contract not found');

  const contract = contracts[idx];
  const poIdx = contract.performanceObligations.findIndex(p => p.id === po.id);
  if (poIdx === -1) throw new Error('PO not found');

  contracts[idx].performanceObligations[poIdx] = po;
  contracts[idx].updatedAt = new Date().toISOString();
  saveContracts(contracts);

  appendAuditEntry({
    id: `a-${Date.now()}`,
    contractId,
    contractNumber: contract.contractNumber,
    timestamp: new Date().toISOString(),
    event: 'PO updated',
    user,
    details: `Performance obligation "${po.name}" updated. SSP: $${po.sspAmount.toLocaleString()}, Allocated: $${po.allocatedAmount.toLocaleString()}.`,
    category: 'Allocation',
    amount: po.allocatedAmount,
  });

  return contracts[idx];
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  await delay(150);
  return loadAuditLog().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function appendAuditEntry(entry: AuditEntry): void {
  const log = loadAuditLog();
  log.push(entry);
  saveAuditLog(log);
}
