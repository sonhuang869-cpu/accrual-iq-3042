export type ContractStatus = 'Draft' | 'Active' | 'Modified' | 'Terminated';
export type BillingSchedule = 'Upfront' | 'Monthly' | 'Milestone';
export type POType = 'License' | 'Service' | 'Support' | 'Training';
export type RecognitionMethod = 'PointInTime' | 'OverTime';
export type ModificationType = 'CatchUp' | 'Prospective';
export type VCMethod = 'MostLikely' | 'ExpectedValue';
export type ASC606Step = 'IdentifyContract' | 'IdentifyPOs' | 'DeterminePrice' | 'AllocatePrice' | 'RecognizeRevenue';

export interface VariableConsideration {
  estimatedAmount: number;
  method: VCMethod;
  constrainedAmount: number;
  description: string;
}

export interface PerformanceObligation {
  id: string;
  contractId: string;
  name: string;
  type: POType;
  sspAmount: number;
  recognitionMethod: RecognitionMethod;
  deliveryStartDate: string;
  deliveryEndDate: string;
  allocatedAmount: number;
  variableConsideration?: VariableConsideration;
}

export interface ContractModification {
  id: string;
  date: string;
  description: string;
  type: ModificationType;
  priorTCV: number;
  newTCV: number;
  adjustmentAmount: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  customer: string;
  tcv: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  billingSchedule: BillingSchedule;
  performanceObligations: PerformanceObligation[];
  modifications: ContractModification[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface AuditEntry {
  id: string;
  contractId: string;
  contractNumber: string;
  timestamp: string;
  event: string;
  user: string;
  details: string;
  category: 'Allocation' | 'Recognition' | 'Modification' | 'Creation' | 'StatusChange';
  amount?: number;
}

export interface MonthlyRecognition {
  month: string; // YYYY-MM
  poId: string;
  contractId: string;
  recognizedAmount: number;
  deferredAtStart: number;
  deferredAtEnd: number;
  isPointInTime: boolean;
}

export interface DeferredRollforward {
  month: string;
  openingBalance: number;
  additions: number;
  recognized: number;
  endingBalance: number;
}
