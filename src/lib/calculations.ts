import { addMonths, format, parseISO, differenceInMonths, startOfMonth, isBefore, isAfter, isEqual } from 'date-fns';
import type { Contract, PerformanceObligation, MonthlyRecognition, DeferredRollforward } from './types';

export const CURRENT_DATE = new Date('2026-11-06');
export const CURRENT_MONTH = format(CURRENT_DATE, 'yyyy-MM');

export function getMonthsBetween(startDate: string, endDate: string): string[] {
  const start = startOfMonth(parseISO(startDate));
  const end = startOfMonth(parseISO(endDate));
  const months: string[] = [];
  let current = start;
  while (!isAfter(current, end)) {
    months.push(format(current, 'yyyy-MM'));
    current = addMonths(current, 1);
  }
  return months;
}

export function getMonthCount(startDate: string, endDate: string): number {
  const start = startOfMonth(parseISO(startDate));
  const end = startOfMonth(parseISO(endDate));
  return differenceInMonths(end, start) + 1;
}

export function computePORecognitionSchedule(po: PerformanceObligation): Map<string, number> {
  const schedule = new Map<string, number>();
  const months = getMonthsBetween(po.deliveryStartDate, po.deliveryEndDate);

  if (po.recognitionMethod === 'PointInTime') {
    const startMonth = format(startOfMonth(parseISO(po.deliveryStartDate)), 'yyyy-MM');
    schedule.set(startMonth, po.allocatedAmount);
  } else {
    // OverTime: even monthly amortization
    const monthlyAmount = po.allocatedAmount / months.length;
    // Distribute evenly, last month absorbs rounding
    let allocated = 0;
    months.forEach((m, idx) => {
      if (idx === months.length - 1) {
        schedule.set(m, Math.round((po.allocatedAmount - allocated) * 100) / 100);
      } else {
        const amt = Math.round(monthlyAmount * 100) / 100;
        schedule.set(m, amt);
        allocated += amt;
      }
    });
  }

  return schedule;
}

export function computeContractRecognitionSchedule(contract: Contract): Map<string, number> {
  const contractSchedule = new Map<string, number>();
  for (const po of contract.performanceObligations) {
    const poSchedule = computePORecognitionSchedule(po);
    poSchedule.forEach((amount, month) => {
      contractSchedule.set(month, (contractSchedule.get(month) ?? 0) + amount);
    });
  }
  return contractSchedule;
}

export function computeRecognizedToDate(po: PerformanceObligation, asOfMonth?: string): number {
  const cutoff = asOfMonth ?? CURRENT_MONTH;
  const schedule = computePORecognitionSchedule(po);
  let total = 0;
  schedule.forEach((amount, month) => {
    if (month <= cutoff) total += amount;
  });
  return Math.round(total * 100) / 100;
}

export function computeContractRecognizedToDate(contract: Contract, asOfMonth?: string): number {
  return contract.performanceObligations.reduce(
    (sum, po) => sum + computeRecognizedToDate(po, asOfMonth),
    0
  );
}

export function computeDeferredBalance(po: PerformanceObligation, asOfMonth?: string): number {
  return Math.round((po.allocatedAmount - computeRecognizedToDate(po, asOfMonth)) * 100) / 100;
}

export function computeContractDeferredBalance(contract: Contract, asOfMonth?: string): number {
  return Math.round((contract.tcv - computeContractRecognizedToDate(contract, asOfMonth)) * 100) / 100;
}

export interface PortfolioKPIs {
  totalARR: number;
  recognizedYTD: number;
  deferredBalance: number;
  activeContracts: number;
  modifiedContracts: number;
  totalTCV: number;
  recognizedTotal: number;
}

export function computePortfolioKPIs(contracts: Contract[]): PortfolioKPIs {
  const ytdStart = `${CURRENT_DATE.getFullYear()}-01`;

  let totalARR = 0;
  let recognizedYTD = 0;
  let deferredBalance = 0;
  let activeContracts = 0;
  let modifiedContracts = 0;
  let totalTCV = 0;
  let recognizedTotal = 0;

  for (const contract of contracts) {
    totalTCV += contract.tcv;

    if (contract.status === 'Active' || contract.status === 'Modified') {
      // ARR = TCV / contract length in years for SaaS; simplified as sum of active monthly obligations
      const months = getMonthCount(contract.startDate, contract.endDate);
      const annualRevenue = (contract.tcv / months) * 12;
      totalARR += annualRevenue;
    }

    if (contract.status === 'Active') activeContracts++;
    if (contract.status === 'Modified') modifiedContracts++;

    // YTD recognition
    for (const po of contract.performanceObligations) {
      const schedule = computePORecognitionSchedule(po);
      schedule.forEach((amount, month) => {
        if (month >= ytdStart && month <= CURRENT_MONTH) {
          recognizedYTD += amount;
        }
        if (month <= CURRENT_MONTH) {
          recognizedTotal += amount;
        }
      });
    }

    deferredBalance += computeContractDeferredBalance(contract);
  }

  return {
    totalARR: Math.round(totalARR),
    recognizedYTD: Math.round(recognizedYTD * 100) / 100,
    deferredBalance: Math.round(deferredBalance * 100) / 100,
    activeContracts,
    modifiedContracts,
    totalTCV,
    recognizedTotal: Math.round(recognizedTotal * 100) / 100,
  };
}

export interface WaterfallDataPoint {
  month: string;
  monthLabel: string;
  recognized: number;
  deferred: number;
  cumRecognized: number;
}

export function computePortfolioWaterfall(contracts: Contract[], monthCount = 24): WaterfallDataPoint[] {
  // Build a 24-month window ending at current month
  const endMonth = CURRENT_MONTH;
  const startDate = addMonths(parseISO(endMonth + '-01'), -(monthCount - 1));
  const startMonth = format(startDate, 'yyyy-MM');
  const months = getMonthsBetween(startMonth + '-01', endMonth + '-01');

  // Aggregate per month across all contracts
  const monthlyRecognized = new Map<string, number>();
  months.forEach(m => monthlyRecognized.set(m, 0));

  for (const contract of contracts) {
    for (const po of contract.performanceObligations) {
      const schedule = computePORecognitionSchedule(po);
      schedule.forEach((amount, month) => {
        if (monthlyRecognized.has(month)) {
          monthlyRecognized.set(month, (monthlyRecognized.get(month) ?? 0) + amount);
        }
      });
    }
  }

  // Total deferred across portfolio
  const totalAllocated = contracts.reduce((sum, c) => sum + c.tcv, 0);
  let cumulativeRecognized = 0;

  // Recognized before the window
  for (const contract of contracts) {
    for (const po of contract.performanceObligations) {
      const schedule = computePORecognitionSchedule(po);
      schedule.forEach((amount, month) => {
        if (month < startMonth) cumulativeRecognized += amount;
      });
    }
  }

  return months.map(month => {
    const recognized = Math.round((monthlyRecognized.get(month) ?? 0) * 100) / 100;
    cumulativeRecognized += recognized;
    const deferred = Math.round((totalAllocated - cumulativeRecognized) * 100) / 100;
    const [year, mo] = month.split('-');
    const date = new Date(parseInt(year), parseInt(mo) - 1, 1);
    const monthLabel = format(date, 'MMM yy');

    return {
      month,
      monthLabel,
      recognized,
      deferred: Math.max(0, deferred),
      cumRecognized: Math.round(cumulativeRecognized * 100) / 100,
    };
  });
}

export interface POTypeBreakdown {
  type: string;
  allocated: number;
  recognized: number;
  percentage: number;
}

export function computePOTypeBreakdown(contracts: Contract[]): POTypeBreakdown[] {
  const typeMap = new Map<string, { allocated: number; recognized: number }>();

  for (const contract of contracts) {
    for (const po of contract.performanceObligations) {
      const existing = typeMap.get(po.type) ?? { allocated: 0, recognized: 0 };
      typeMap.set(po.type, {
        allocated: existing.allocated + po.allocatedAmount,
        recognized: existing.recognized + computeRecognizedToDate(po),
      });
    }
  }

  const total = Array.from(typeMap.values()).reduce((s, v) => s + v.allocated, 0);

  return Array.from(typeMap.entries())
    .map(([type, { allocated, recognized }]) => ({
      type,
      allocated: Math.round(allocated * 100) / 100,
      recognized: Math.round(recognized * 100) / 100,
      percentage: Math.round((allocated / total) * 1000) / 10,
    }))
    .sort((a, b) => b.allocated - a.allocated);
}

export interface CurrentPeriodRecognition {
  contractId: string;
  contractNumber: string;
  customer: string;
  poName: string;
  poType: string;
  recognitionMethod: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
}

export function computeCurrentPeriodRecognitions(contracts: Contract[]): CurrentPeriodRecognition[] {
  const results: CurrentPeriodRecognition[] = [];

  for (const contract of contracts) {
    for (const po of contract.performanceObligations) {
      const schedule = computePORecognitionSchedule(po);
      const amount = schedule.get(CURRENT_MONTH) ?? 0;
      if (amount > 0) {
        results.push({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          customer: contract.customer,
          poName: po.name,
          poType: po.type,
          recognitionMethod: po.recognitionMethod,
          amount: Math.round(amount * 100) / 100,
          debitAccount: 'Deferred Revenue (2100)',
          creditAccount: 'Revenue (4100)',
        });
      }
    }
  }

  return results.sort((a, b) => b.amount - a.amount);
}

export function computeDeferredRollforward(contracts: Contract[], months: string[]): DeferredRollforward[] {
  const result: DeferredRollforward[] = [];
  let openingBalance = 0;

  // Calculate balance before first month
  const firstMonth = months[0];
  for (const contract of contracts) {
    for (const po of contract.performanceObligations) {
      const schedule = computePORecognitionSchedule(po);
      let recBefore = 0;
      schedule.forEach((amount, month) => {
        if (month < firstMonth) recBefore += amount;
      });
      openingBalance += po.allocatedAmount - recBefore;
    }
  }

  for (const month of months) {
    let recognized = 0;
    let additions = 0;

    for (const contract of contracts) {
      for (const po of contract.performanceObligations) {
        const schedule = computePORecognitionSchedule(po);
        const monthRec = schedule.get(month) ?? 0;
        recognized += monthRec;
        // Additions = new billings in month (simplified: for PointInTime POs that start this month, the full amount was billed)
        if (po.recognitionMethod === 'PointInTime') {
          const startMonth = format(startOfMonth(parseISO(po.deliveryStartDate)), 'yyyy-MM');
          if (startMonth === month) {
            additions += po.allocatedAmount;
          }
        }
      }
    }

    const endingBalance = openingBalance + additions - recognized;

    result.push({
      month,
      openingBalance: Math.round(openingBalance * 100) / 100,
      additions: Math.round(additions * 100) / 100,
      recognized: Math.round(recognized * 100) / 100,
      endingBalance: Math.round(endingBalance * 100) / 100,
    });

    openingBalance = endingBalance;
  }

  return result;
}

export function computeASC606Checklist(contract: Contract): Record<string, 'complete' | 'partial' | 'missing'> {
  const hasPOs = contract.performanceObligations.length > 0;
  const hasSSPs = contract.performanceObligations.every(po => po.sspAmount > 0);
  const allAllocated = contract.performanceObligations.every(po => po.allocatedAmount > 0);
  const allocationSum = contract.performanceObligations.reduce((s, po) => s + po.allocatedAmount, 0);
  const allocationCorrect = Math.abs(allocationSum - contract.tcv) < 1;

  return {
    IdentifyContract: contract.contractNumber && contract.customer ? 'complete' : 'missing',
    IdentifyPOs: hasPOs ? 'complete' : 'missing',
    DeterminePrice: contract.tcv > 0 ? 'complete' : 'missing',
    AllocatePrice: hasSSPs && allAllocated && allocationCorrect ? 'complete' : (hasSSPs ? 'partial' : 'missing'),
    RecognizeRevenue: (contract.status === 'Active' || contract.status === 'Modified') && hasPOs ? 'complete' : 'partial',
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
