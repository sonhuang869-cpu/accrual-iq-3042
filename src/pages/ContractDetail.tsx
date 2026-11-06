import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Edit2, CheckCircle2, Clock, Circle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { toast } from 'sonner';
import clsx from 'clsx';
import { SEED_CONTRACTS } from '../lib/data';
import {
  computePORecognitionSchedule,
  computeRecognizedToDate,
  computeDeferredBalance,
  computeASC606Checklist,
  computeContractRecognizedToDate,
  computeContractDeferredBalance,
  formatCurrency,
  formatCurrencyFull,
  formatPercent,
  CURRENT_MONTH,
  getMonthsBetween,
} from '../lib/calculations';
import type { PerformanceObligation } from '../lib/types';

const PO_TYPE_COLORS: Record<string, string> = {
  License: '#4F8EF7',
  Service: '#34D399',
  Support: '#F59E0B',
  Training: '#A78BFA',
};

const ASC606_STEPS = [
  {
    key: 'IdentifyContract',
    label: 'Step 1: Identify the Contract',
    description: 'Confirm enforceable rights and obligations exist between parties',
  },
  {
    key: 'IdentifyPOs',
    label: 'Step 2: Identify Performance Obligations',
    description: 'Identify distinct goods or services promised in the contract',
  },
  {
    key: 'DeterminePrice',
    label: 'Step 3: Determine Transaction Price',
    description: 'Estimate the amount of consideration expected to be received',
  },
  {
    key: 'AllocatePrice',
    label: 'Step 4: Allocate Transaction Price',
    description: 'Allocate price to each PO based on standalone selling prices',
  },
  {
    key: 'RecognizeRevenue',
    label: 'Step 5: Recognize Revenue',
    description: 'Recognize revenue when (or as) performance obligations are satisfied',
  },
];

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [editingSSP, setEditingSSP] = useState<string | null>(null);
  const [sspInput, setSSPInput] = useState('');

  const contract = useMemo(() => SEED_CONTRACTS.find(c => c.id === id), [id]);

  const checklist = useMemo(() => contract ? computeASC606Checklist(contract) : {}, [contract]);

  const poData = useMemo(() => {
    if (!contract) return [];
    const sumSSP = contract.performanceObligations.reduce((s, p) => s + p.sspAmount, 0);
    return contract.performanceObligations.map(po => ({
      po,
      sspPct: sumSSP > 0 ? (po.sspAmount / sumSSP) * 100 : 0,
      allocatedPct: contract.tcv > 0 ? (po.allocatedAmount / contract.tcv) * 100 : 0,
      recognizedToDate: computeRecognizedToDate(po),
      deferredBalance: computeDeferredBalance(po),
      monthlySchedule: computePORecognitionSchedule(po),
    }));
  }, [contract]);

  // Recognition schedule for chart (24 months from start)
  const scheduleChartData = useMemo(() => {
    if (!contract) return [];
    const months = getMonthsBetween(contract.startDate, contract.endDate).slice(0, 36);

    return months.map(month => {
      const [yr, mo] = month.split('-');
      const label = format(new Date(parseInt(yr), parseInt(mo) - 1, 1), 'MMM yy');
      const data: Record<string, string | number> = { month, label };
      let total = 0;
      for (const { po, monthlySchedule } of poData) {
        const amt = monthlySchedule.get(month) ?? 0;
        data[po.id] = Math.round(amt * 100) / 100;
        total += amt;
      }
      data.total = Math.round(total * 100) / 100;
      return data;
    });
  }, [contract, poData]);

  if (!contract) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/contracts')} className="btn-ghost mb-4">
          <ArrowLeft size={14} /> Back to Contracts
        </button>
        <div className="card p-8 text-center text-text-muted">Contract not found.</div>
      </div>
    );
  }

  const recognizedTotal = computeContractRecognizedToDate(contract);
  const deferredTotal = computeContractDeferredBalance(contract);
  const recognizedPct = contract.tcv > 0 ? (recognizedTotal / contract.tcv) * 100 : 0;

  const StatusIcon = ({ s }: { s: string }) =>
    s === 'complete' ? (
      <CheckCircle2 size={14} className="text-success" />
    ) : s === 'partial' ? (
      <Clock size={14} className="text-warning" />
    ) : (
      <Circle size={14} className="text-danger" />
    );

  const statusLabel = (s: string) =>
    s === 'complete' ? 'Complete' : s === 'partial' ? 'In Progress' : 'Missing';

  const statusColor = (s: string) =>
    s === 'complete' ? 'text-success' : s === 'partial' ? 'text-warning' : 'text-danger';

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to Contracts
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary num">{contract.contractNumber}</h1>
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full font-medium border',
                  contract.status === 'Active' && 'badge-active',
                  contract.status === 'Draft' && 'badge-draft',
                  contract.status === 'Modified' && 'badge-modified',
                  contract.status === 'Terminated' && 'badge-terminated'
                )}
              >
                {contract.status}
              </span>
            </div>
            <p className="text-text-secondary mt-1">{contract.customer}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {format(parseISO(contract.startDate), 'MM/dd/yyyy')} –{' '}
              {format(parseISO(contract.endDate), 'MM/dd/yyyy')} · {contract.billingSchedule} billing
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-2xl font-semibold num text-text-primary">{formatCurrency(contract.tcv)}</div>
              <div className="text-xs text-text-muted">Total Contract Value</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold num text-success">{formatCurrency(recognizedTotal)}</div>
              <div className="text-xs text-text-muted">Recognized ({recognizedPct.toFixed(1)}%)</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold num text-warning">{formatCurrency(deferredTotal)}</div>
              <div className="text-xs text-text-muted">Deferred Balance</div>
            </div>
          </div>
        </div>
        {/* Recognition progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
              style={{ width: `${Math.min(100, recognizedPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-2xs text-text-muted mt-1">
            <span>0%</span>
            <span>{recognizedPct.toFixed(1)}% recognized</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Modifications Banner */}
      {contract.modifications.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-warning font-medium text-sm">
            <Info size={14} />
            Contract Modification History
          </div>
          {contract.modifications.map(mod => (
            <div key={mod.id} className="pl-5 space-y-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-text-muted num">{format(parseISO(mod.date), 'MM/dd/yyyy')}</span>
                <span className={clsx(
                  'px-2 py-0.5 rounded text-2xs font-medium',
                  mod.type === 'CatchUp' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                )}>
                  {mod.type}
                </span>
                <span className="text-text-secondary">
                  TCV: <span className="num line-through text-text-muted">{formatCurrency(mod.priorTCV)}</span>
                  {' → '}
                  <span className="num text-text-primary">{formatCurrency(mod.newTCV)}</span>
                </span>
                <span className="text-success num">+{formatCurrency(mod.adjustmentAmount)}</span>
              </div>
              <p className="text-xs text-text-muted pl-0 leading-relaxed">{mod.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ASC 606 Checklist */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-text-primary">ASC 606 Compliance</div>
          </div>
          <div className="p-4 space-y-3">
            {ASC606_STEPS.map(step => {
              const status = checklist[step.key as keyof typeof checklist] ?? 'missing';
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon s={status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-primary">{step.label}</span>
                      <span className={clsx('text-2xs font-medium', statusColor(status))}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <p className="text-2xs text-text-muted mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recognition Schedule Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <div className="text-sm font-semibold text-text-primary">Recognition Schedule — Monthly Waterfall</div>
              <div className="text-xs text-text-muted">Revenue by performance obligation over contract term</div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scheduleChartData.slice(0, 24)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(scheduleChartData.length / 8)}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                  width={48}
                />
                <RechartTooltip
                  contentStyle={{ background: '#1A2332', border: '1px solid #2D3748', borderRadius: 6, fontSize: 11 }}
                  formatter={(value: number, name: string) => {
                    const po = contract.performanceObligations.find(p => p.id === name);
                    return [`$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, po?.name ?? name];
                  }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: 4 }}
                />
                {contract.performanceObligations.map(po => (
                  <Bar
                    key={po.id}
                    dataKey={po.id}
                    stackId="rev"
                    fill={PO_TYPE_COLORS[po.type] ?? '#6B7280'}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {contract.performanceObligations.map(po => (
                <div key={po.id} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: PO_TYPE_COLORS[po.type] ?? '#6B7280' }}
                  />
                  {po.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Obligations & Allocation Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-sm font-semibold text-text-primary">Performance Obligations & SSP Allocation</div>
            <div className="text-xs text-text-muted">
              Standalone Selling Price ratios determine transaction price allocation per ASC 606-10-32
            </div>
          </div>
          <div className="text-xs text-text-muted flex items-center gap-4">
            <span>Sum of SSPs: <span className="num text-text-primary">{formatCurrency(poData.reduce((s, p) => s + p.po.sspAmount, 0))}</span></span>
            <span>TCV: <span className="num text-text-primary">{formatCurrency(contract.tcv)}</span></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Performance Obligation</th>
                <th className="text-center px-3 py-3 text-text-muted font-medium">Type</th>
                <th className="text-center px-3 py-3 text-text-muted font-medium">Recognition</th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">SSP</th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">SSP %</th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">Allocated Amount</th>
                <th className="text-right px-3 py-3 text-text-muted font-medium">Recognized to Date</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Deferred Balance</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {poData.map(({ po, sspPct, recognizedToDate, deferredBalance }) => (
                <>
                  <tr
                    key={po.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PO_TYPE_COLORS[po.type] ?? '#6B7280' }}
                        />
                        <span className="font-medium text-text-primary">{po.name}</span>
                      </div>
                      <div className="text-text-muted mt-0.5 ml-4">
                        {format(parseISO(po.deliveryStartDate), 'MM/dd/yyyy')} –{' '}
                        {format(parseISO(po.deliveryEndDate), 'MM/dd/yyyy')}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className="text-2xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: (PO_TYPE_COLORS[po.type] ?? '#6B7280') + '18',
                          color: PO_TYPE_COLORS[po.type] ?? '#6B7280',
                          border: `1px solid ${(PO_TYPE_COLORS[po.type] ?? '#6B7280')}30`,
                        }}
                      >
                        {po.type}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={clsx(
                        'text-2xs px-2 py-0.5 rounded font-medium',
                        po.recognitionMethod === 'OverTime'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-success/10 text-success'
                      )}>
                        {po.recognitionMethod === 'OverTime' ? 'Over Time' : 'Point in Time'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right num text-text-secondary">
                      {formatCurrency(po.sspAmount)}
                    </td>
                    <td className="px-3 py-3.5 text-right num text-text-secondary">
                      {formatPercent(sspPct)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="num text-text-primary font-semibold">{formatCurrencyFull(po.allocatedAmount)}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right num text-success">
                      {formatCurrencyFull(recognizedToDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right num text-warning">
                      {formatCurrencyFull(deferredBalance)}
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      {expandedPO === po.id ? (
                        <ChevronUp size={13} className="text-text-muted" />
                      ) : (
                        <ChevronDown size={13} className="text-text-muted" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded PO detail */}
                  {expandedPO === po.id && (
                    <tr key={`${po.id}-detail`} className="bg-surface-2/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Journal Entry Preview */}
                          <div>
                            <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                              Current Period Journal Entry ({CURRENT_MONTH})
                            </div>
                            {(() => {
                              const schedule = computePORecognitionSchedule(po);
                              const currentAmt = schedule.get(CURRENT_MONTH) ?? 0;
                              return (
                                <div className="bg-surface border border-border rounded-md overflow-hidden text-xs font-mono">
                                  <div className="px-4 py-2 border-b border-border bg-surface-2/50 text-text-muted">
                                    Journal Entry — {CURRENT_MONTH}
                                  </div>
                                  {currentAmt > 0 ? (
                                    <div className="p-4 space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-text-secondary">Dr  Deferred Revenue (2100)</span>
                                        <span className="num text-text-primary">{formatCurrencyFull(currentAmt)}</span>
                                      </div>
                                      <div className="flex justify-between pl-6">
                                        <span className="text-text-secondary">Cr  Revenue (4100)</span>
                                        <span className="num text-success">{formatCurrencyFull(currentAmt)}</span>
                                      </div>
                                      <div className="border-t border-border/50 pt-2 text-text-muted text-2xs">
                                        Narration: To recognize {po.recognitionMethod === 'OverTime' ? 'monthly' : 'point-in-time'} revenue for {po.name} per ASC 606
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-4 text-text-muted text-xs">No recognition in current period</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Variable Consideration */}
                          {po.variableConsideration && (
                            <div>
                              <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                                Variable Consideration
                              </div>
                              <div className="bg-surface border border-warning/20 rounded-md p-4 space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Estimated Amount</span>
                                  <span className="num text-text-primary">{formatCurrencyFull(po.variableConsideration.estimatedAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Estimation Method</span>
                                  <span className="text-primary">
                                    {po.variableConsideration.method === 'MostLikely' ? 'Most-Likely Amount' : 'Expected Value'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Constrained Amount</span>
                                  <span className="num text-warning font-semibold">{formatCurrencyFull(po.variableConsideration.constrainedAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Unconstrained</span>
                                  <span className="num text-text-muted">
                                    {formatCurrencyFull(po.variableConsideration.estimatedAmount - po.variableConsideration.constrainedAmount)}
                                  </span>
                                </div>
                                <p className="text-text-muted text-2xs mt-2 leading-relaxed border-t border-border/50 pt-2">
                                  {po.variableConsideration.description}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Monthly schedule table (first 6 months) */}
                          <div className={!po.variableConsideration ? 'md:col-span-1' : ''}>
                            <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                              Recognition Schedule (sample)
                            </div>
                            <div className="bg-surface border border-border rounded-md overflow-hidden text-xs">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-border bg-surface-2/40">
                                    <th className="text-left px-3 py-2 text-text-muted font-medium">Period</th>
                                    <th className="text-right px-3 py-2 text-text-muted font-medium">Amount</th>
                                    <th className="text-right px-3 py-2 text-text-muted font-medium">Cumulative</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {(() => {
                                    const schedule = computePORecognitionSchedule(po);
                                    const entries = Array.from(schedule.entries()).slice(0, 8);
                                    let cumulative = 0;
                                    return entries.map(([month, amount]) => {
                                      cumulative += amount;
                                      const isCurrentMonth = month === CURRENT_MONTH;
                                      return (
                                        <tr key={month} className={clsx(isCurrentMonth && 'bg-primary/5')}>
                                          <td className={clsx('px-3 py-2 num', isCurrentMonth ? 'text-primary font-medium' : 'text-text-secondary')}>
                                            {month}
                                            {isCurrentMonth && <span className="ml-1 text-2xs text-primary">(current)</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right num text-text-primary">{formatCurrencyFull(amount)}</td>
                                          <td className="px-3 py-2 text-right num text-text-muted">{formatCurrencyFull(cumulative)}</td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-2/50">
                <td className="px-4 py-3 text-xs font-semibold text-text-primary">Totals</td>
                <td colSpan={2} />
                <td className="px-3 py-3 text-right num font-semibold text-text-primary text-xs">
                  {formatCurrency(poData.reduce((s, p) => s + p.po.sspAmount, 0))}
                </td>
                <td className="px-3 py-3 text-right num text-text-muted text-xs">100.0%</td>
                <td className="px-3 py-3 text-right num font-semibold text-text-primary text-xs">
                  {formatCurrencyFull(poData.reduce((s, p) => s + p.po.allocatedAmount, 0))}
                </td>
                <td className="px-3 py-3 text-right num font-semibold text-success text-xs">
                  {formatCurrencyFull(poData.reduce((s, p) => s + p.recognizedToDate, 0))}
                </td>
                <td className="px-4 py-3 text-right num font-semibold text-warning text-xs">
                  {formatCurrencyFull(poData.reduce((s, p) => s + p.deferredBalance, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-surface-2/20 flex items-center gap-2 text-xs text-text-muted">
          <Info size={12} className="text-primary" />
          Allocation formula: Allocated<sub>i</sub> = (SSP<sub>i</sub> / Σ SSP) × TCV. All amounts in USD. Rounding applied to final obligation.
        </div>
      </div>
    </div>
  );
}
