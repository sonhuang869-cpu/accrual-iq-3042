import { useMemo } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Circle, Clock,
  DollarSign, FileText, AlertCircle, Activity
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  computePortfolioKPIs,
  computePOTypeBreakdown,
  computePortfolioWaterfall,
  computeASC606Checklist,
  computeContractRecognizedToDate,
  computeContractDeferredBalance,
  formatCurrency,
  CURRENT_MONTH,
} from '../lib/calculations';
import { SEED_CONTRACTS, SEED_AUDIT_LOG } from '../lib/data';
import clsx from 'clsx';

const PIE_COLORS: Record<string, string> = {
  License: '#4F8EF7',
  Service: '#34D399',
  Support: '#F59E0B',
  Training: '#A78BFA',
};

const ASC606_STEPS = [
  { key: 'IdentifyContract', label: 'Step 1: Identify the Contract', shortLabel: 'Identify Contract' },
  { key: 'IdentifyPOs', label: 'Step 2: Identify Performance Obligations', shortLabel: 'Identify POs' },
  { key: 'DeterminePrice', label: 'Step 3: Determine Transaction Price', shortLabel: 'Transaction Price' },
  { key: 'AllocatePrice', label: 'Step 4: Allocate Transaction Price', shortLabel: 'Allocate Price' },
  { key: 'RecognizeRevenue', label: 'Step 5: Recognize Revenue', shortLabel: 'Recognize Revenue' },
];

function KPICard({
  label, value, sub, icon: Icon, color = 'primary', trend
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'muted';
  trend?: string;
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    muted: 'text-text-secondary bg-surface-2 border-border',
  };

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center', colorMap[color])}>
          <Icon size={16} />
        </div>
        {trend && (
          <span className="text-xs text-success flex items-center gap-0.5">
            <TrendingUp size={11} />
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-semibold num text-text-primary">{value}</div>
        <div className="text-xs text-text-muted mt-0.5">{label}</div>
        {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const contracts = SEED_CONTRACTS;

  const kpis = useMemo(() => computePortfolioKPIs(contracts), [contracts]);
  const breakdown = useMemo(() => computePOTypeBreakdown(contracts), [contracts]);
  const waterfall = useMemo(() => computePortfolioWaterfall(contracts, 12), [contracts]);

  // Contracts requiring attention
  const attentionContracts = useMemo(() => {
    return contracts.filter(c => {
      const checklist = computeASC606Checklist(c);
      return Object.values(checklist).some(v => v !== 'complete') || c.status === 'Draft';
    });
  }, [contracts]);

  // Active + modified contracts with their checklist
  const checklistContracts = useMemo(() => {
    return contracts
      .filter(c => c.status !== 'Terminated')
      .slice(0, 6)
      .map(c => ({
        contract: c,
        checklist: computeASC606Checklist(c),
        recognized: computeContractRecognizedToDate(c),
        deferred: computeContractDeferredBalance(c),
      }));
  }, [contracts]);

  const recentAudit = useMemo(() => {
    return [...SEED_AUDIT_LOG]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, []);

  const statusColor = (s: 'complete' | 'partial' | 'missing') =>
    s === 'complete' ? 'text-success' : s === 'partial' ? 'text-warning' : 'text-danger';
  const StatusIcon = ({ s }: { s: 'complete' | 'partial' | 'missing' }) =>
    s === 'complete' ? (
      <CheckCircle2 size={13} className="text-success" />
    ) : s === 'partial' ? (
      <Clock size={13} className="text-warning" />
    ) : (
      <Circle size={13} className="text-danger" />
    );

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Compliance Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Revenue recognition overview · ASC 606 compliance status · As of {format(new Date('2026-11-06'), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-success flex items-center gap-1.5 bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
            <Activity size={11} />
            Live portfolio data
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total ARR"
          value={formatCurrency(kpis.totalARR)}
          sub="Active + modified contracts"
          icon={DollarSign}
          color="primary"
        />
        <KPICard
          label="Recognized YTD (2026)"
          value={formatCurrency(kpis.recognizedYTD)}
          sub="Jan – Nov 2026"
          icon={TrendingUp}
          color="success"
          trend="+8.2% vs prior year"
        />
        <KPICard
          label="Deferred Revenue Balance"
          value={formatCurrency(kpis.deferredBalance)}
          sub="Remaining obligations"
          icon={Clock}
          color="warning"
        />
        <div className="grid grid-rows-2 gap-4">
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText size={14} className="text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold num text-text-primary">{kpis.activeContracts}</div>
              <div className="text-xs text-text-muted">Active Contracts</div>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
              <AlertCircle size={14} className="text-warning" />
            </div>
            <div>
              <div className="text-lg font-semibold num text-text-primary">{kpis.modifiedContracts}</div>
              <div className="text-xs text-text-muted">Modified Contracts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <div className="text-sm font-semibold text-text-primary">Monthly Revenue Recognition</div>
              <div className="text-xs text-text-muted">Last 12 months — recognized vs. deferred balance</div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfall} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                  width={52}
                />
                <RechartTooltip
                  contentStyle={{ background: '#1A2332', border: '1px solid #2D3748', borderRadius: 6, fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                    name === 'recognized' ? 'Recognized' : 'Deferred Balance'
                  ]}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#9CA3AF', paddingTop: 8 }}
                  formatter={(value) => value === 'recognized' ? 'Recognized' : 'Deferred Balance'}
                />
                <Bar dataKey="recognized" fill="#4F8EF7" radius={[2, 2, 0, 0]} />
                <Bar dataKey="deferred" fill="#1E3A5F" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PO Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="text-sm font-semibold text-text-primary">Revenue by PO Type</div>
              <div className="text-xs text-text-muted">Allocated TCV distribution</div>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="allocated"
                  nameKey="type"
                >
                  {breakdown.map(entry => (
                    <Cell key={entry.type} fill={PIE_COLORS[entry.type] ?? '#6B7280'} />
                  ))}
                </Pie>
                <RechartTooltip
                  contentStyle={{ background: '#1A2332', border: '1px solid #2D3748', borderRadius: 6, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 'Allocated']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {breakdown.map(b => (
                <div key={b.type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PIE_COLORS[b.type] ?? '#6B7280' }}
                    />
                    <span className="text-text-secondary">{b.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-text-muted">{b.percentage}%</span>
                    <span className="num text-text-primary font-medium">{formatCurrency(b.allocated)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ASC 606 Checklist */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-sm font-semibold text-text-primary">ASC 606 Five-Step Checklist — Contract Portfolio</div>
            <div className="text-xs text-text-muted">Compliance status per contract across all recognition steps</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-success" /> Complete</span>
            <span className="flex items-center gap-1.5"><Clock size={11} className="text-warning" /> Partial</span>
            <span className="flex items-center gap-1.5"><Circle size={11} className="text-danger" /> Missing</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted font-medium w-52">Contract</th>
                {ASC606_STEPS.map(s => (
                  <th key={s.key} className="text-center px-3 py-3 text-text-muted font-medium whitespace-nowrap">
                    {s.shortLabel}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-text-muted font-medium">Recognized</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium">Deferred</th>
              </tr>
            </thead>
            <tbody>
              {checklistContracts.map(({ contract, checklist, recognized, deferred }) => (
                <tr key={contract.id} className="border-b border-border/50 table-row-hover">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{contract.contractNumber}</div>
                    <div className="text-text-muted mt-0.5 truncate max-w-[180px]">{contract.customer}</div>
                  </td>
                  {ASC606_STEPS.map(s => {
                    const status = checklist[s.key as keyof typeof checklist];
                    return (
                      <td key={s.key} className="text-center px-3 py-3">
                        <div className="flex justify-center">
                          <StatusIcon s={status} />
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right px-4 py-3 num text-text-primary font-medium">
                    {formatCurrency(recognized)}
                  </td>
                  <td className="text-right px-4 py-3 num text-text-secondary">
                    {formatCurrency(deferred)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle size={14} className="text-warning" />
              Contracts Requiring Attention
            </div>
            <span className="text-xs text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
              {attentionContracts.length} items
            </span>
          </div>
          <div className="p-4 space-y-2">
            {attentionContracts.map(c => {
              const checklist = computeASC606Checklist(c);
              const issues = ASC606_STEPS.filter(s => checklist[s.key as keyof typeof checklist] !== 'complete');
              return (
                <div key={c.id} className="flex items-start justify-between p-3 bg-surface-2 rounded-md">
                  <div>
                    <div className="text-xs font-medium text-text-primary">{c.contractNumber}</div>
                    <div className="text-xs text-text-muted">{c.customer}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.status === 'Draft' && (
                        <span className="text-2xs bg-text-muted/10 text-text-secondary px-1.5 py-0.5 rounded">Draft status</span>
                      )}
                      {issues.map(s => (
                        <span key={s.key} className="text-2xs bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                          {s.shortLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="num text-xs text-text-secondary ml-4">{formatCurrency(c.tcv)}</span>
                </div>
              );
            })}
            {attentionContracts.length === 0 && (
              <div className="text-center py-6 text-text-muted text-xs">
                <CheckCircle2 size={24} className="text-success mx-auto mb-2 opacity-60" />
                All contracts are compliant
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="card">
          <div className="card-header">
            <div className="text-sm font-semibold text-text-primary">Recent Audit Activity</div>
            <span className="text-xs text-text-muted">Last 5 events</span>
          </div>
          <div className="divide-y divide-border/50">
            {recentAudit.map(entry => {
              const catColor: Record<string, string> = {
                Allocation: 'text-primary bg-primary/10',
                Recognition: 'text-success bg-success/10',
                Modification: 'text-warning bg-warning/10',
                Creation: 'text-text-secondary bg-surface-2',
                StatusChange: 'text-text-muted bg-surface-2',
              };
              return (
                <div key={entry.id} className="px-4 py-3 hover:bg-surface-2 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-2xs px-1.5 py-0.5 rounded font-medium', catColor[entry.category])}>
                          {entry.category}
                        </span>
                        <span className="text-xs text-text-primary font-medium truncate">{entry.event}</span>
                      </div>
                      <div className="text-xs text-text-muted mt-1 truncate">{entry.contractNumber} · {entry.user}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {entry.amount && (
                        <div className="num text-xs text-text-primary">{formatCurrency(entry.amount)}</div>
                      )}
                      <div className="text-2xs text-text-muted mt-0.5">
                        {format(parseISO(entry.timestamp), 'MM/dd/yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
