import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import clsx from 'clsx';
import { SEED_CONTRACTS } from '../lib/data';
import {
  computePortfolioWaterfall,
  computePOTypeBreakdown,
  computeCurrentPeriodRecognitions,
  computeDeferredRollforward,
  formatCurrency,
  formatCurrencyFull,
  CURRENT_MONTH,
  getMonthsBetween,
} from '../lib/calculations';

const PO_COLORS: Record<string, string> = {
  License: '#4F8EF7',
  Service: '#34D399',
  Support: '#F59E0B',
  Training: '#A78BFA',
};

type ViewTab = 'waterfall' | 'rollforward' | 'currentPeriod';

export function Recognition() {
  const [activeTab, setActiveTab] = useState<ViewTab>('waterfall');

  const contracts = SEED_CONTRACTS;

  const waterfall = useMemo(() => computePortfolioWaterfall(contracts, 24), [contracts]);
  const breakdown = useMemo(() => computePOTypeBreakdown(contracts), [contracts]);
  const currentPeriod = useMemo(() => computeCurrentPeriodRecognitions(contracts), [contracts]);

  const rollforwardMonths = useMemo(
    () => getMonthsBetween('2026-06-01', CURRENT_MONTH + '-01').slice(-6),
    []
  );
  const rollforward = useMemo(
    () => computeDeferredRollforward(contracts, rollforwardMonths),
    [contracts, rollforwardMonths]
  );

  const currentPeriodTotal = currentPeriod.reduce((s, r) => s + r.amount, 0);

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'waterfall', label: '24-Month Waterfall' },
    { key: 'rollforward', label: 'Deferred Rollforward' },
    { key: 'currentPeriod', label: `Current Period (${CURRENT_MONTH})` },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Recognition Schedule</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Portfolio-wide revenue recognition timeline · 24-month view · Current period: {CURRENT_MONTH}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold num text-primary">{formatCurrency(currentPeriodTotal)}</div>
          <div className="text-xs text-text-muted">Recognizing this month</div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {breakdown.map(b => (
          <div key={b.type} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{b.type} Revenue</span>
              <span
                className="text-2xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: (PO_COLORS[b.type] ?? '#6B7280') + '20',
                  color: PO_COLORS[b.type] ?? '#6B7280',
                  border: `1px solid ${(PO_COLORS[b.type] ?? '#6B7280')}30`,
                }}
              >
                {b.percentage}%
              </span>
            </div>
            <div className="num text-lg font-semibold text-text-primary">{formatCurrency(b.allocated)}</div>
            <div className="text-xs text-text-muted mt-0.5">
              <span className="text-success num">{formatCurrency(b.recognized)}</span> recognized
            </div>
            <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.allocated > 0 ? (b.recognized / b.allocated) * 100 : 0}%`,
                  background: PO_COLORS[b.type] ?? '#6B7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div>
        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Waterfall Tab */}
        {activeTab === 'waterfall' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Monthly Recognized Revenue — 24-Month Portfolio View</div>
                  <div className="text-xs text-text-muted">Bar = monthly recognized; Line = cumulative deferred balance</div>
                </div>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={waterfall} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Inter' }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                      width={56}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`}
                      width={56}
                    />
                    <RechartTooltip
                      contentStyle={{ background: '#1A2332', border: '1px solid #2D3748', borderRadius: 6, fontSize: 11 }}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                        name === 'recognized' ? 'Recognized' : name === 'deferred' ? 'Deferred Balance' : 'Cumulative Recognized'
                      ]}
                      labelStyle={{ color: '#9CA3AF', marginBottom: 4 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#9CA3AF', paddingTop: 10 }}
                      formatter={(v) => v === 'recognized' ? 'Recognized' : v === 'cumRecognized' ? 'Cumulative Recognized' : 'Deferred Balance'}
                    />
                    <Bar yAxisId="left" dataKey="recognized" fill="#4F8EF7" radius={[2, 2, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumRecognized" stroke="#34D399" dot={false} strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deferred vs Recognized table */}
            <div className="card">
              <div className="card-header">
                <div className="text-sm font-semibold text-text-primary">Monthly Detail — Last 12 Months</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/40">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Period</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">Recognized</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">Cumulative Recognized</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">Deferred Balance</th>
                      <th className="px-4 py-3 text-text-muted font-medium">Recognition Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {waterfall.slice(-12).map(row => {
                      const totalTCV = contracts.reduce((s, c) => s + c.tcv, 0);
                      const pct = totalTCV > 0 ? (row.recognized / (totalTCV / 24)) * 100 : 0;
                      const isCurrent = row.month === CURRENT_MONTH;
                      return (
                        <tr key={row.month} className={clsx('table-row-hover', isCurrent && 'bg-primary/5')}>
                          <td className={clsx('px-4 py-3 num font-medium', isCurrent ? 'text-primary' : 'text-text-secondary')}>
                            {row.monthLabel}
                            {isCurrent && <span className="ml-2 text-2xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Current</span>}
                          </td>
                          <td className="px-4 py-3 text-right num text-text-primary font-medium">{formatCurrency(row.recognized)}</td>
                          <td className="px-4 py-3 text-right num text-success">{formatCurrency(row.cumRecognized)}</td>
                          <td className="px-4 py-3 text-right num text-warning">{formatCurrency(row.deferred)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="num text-text-muted w-10 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deferred Rollforward Tab */}
        {activeTab === 'rollforward' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="text-sm font-semibold text-text-primary">Deferred Revenue Rollforward — Portfolio</div>
                <div className="text-xs text-text-muted">
                  Opening Balance + Additions − Recognized = Ending Balance · Last 6 months
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40">
                    <th className="text-left px-5 py-3 text-text-muted font-medium text-xs">Period</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium text-xs">Opening Balance</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium text-xs">+ Additions</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium text-xs">− Recognized</th>
                    <th className="text-right px-5 py-3 text-text-muted font-medium text-xs">Ending Balance</th>
                    <th className="px-5 py-3 text-text-muted font-medium text-xs">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rollforward.map((row, idx) => {
                    const isCurrent = row.month === CURRENT_MONTH;
                    const change = row.endingBalance - row.openingBalance;
                    return (
                      <tr key={row.month} className={clsx('table-row-hover', isCurrent && 'bg-primary/5')}>
                        <td className={clsx('px-5 py-4 num font-medium text-sm', isCurrent ? 'text-primary' : 'text-text-secondary')}>
                          {row.month}
                          {isCurrent && <span className="ml-2 text-2xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Current</span>}
                        </td>
                        <td className="px-5 py-4 text-right num text-text-primary">{formatCurrencyFull(row.openingBalance)}</td>
                        <td className="px-5 py-4 text-right num text-primary">{row.additions > 0 ? formatCurrencyFull(row.additions) : '—'}</td>
                        <td className="px-5 py-4 text-right num text-success">({formatCurrencyFull(row.recognized)})</td>
                        <td className="px-5 py-4 text-right num text-text-primary font-semibold">{formatCurrencyFull(row.endingBalance)}</td>
                        <td className="px-5 py-4">
                          <span className={clsx('num text-xs', change < 0 ? 'text-success' : 'text-warning')}>
                            {change < 0 ? '▼ ' : '▲ '}
                            {formatCurrency(Math.abs(change))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-2/40">
                    <td className="px-5 py-3 text-xs font-semibold text-text-primary">Total YTD</td>
                    <td className="px-5 py-3 text-right num text-text-primary text-xs font-semibold">
                      {rollforward.length > 0 ? formatCurrencyFull(rollforward[0].openingBalance) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right num text-primary text-xs font-semibold">
                      {formatCurrencyFull(rollforward.reduce((s, r) => s + r.additions, 0))}
                    </td>
                    <td className="px-5 py-3 text-right num text-success text-xs font-semibold">
                      ({formatCurrencyFull(rollforward.reduce((s, r) => s + r.recognized, 0))})
                    </td>
                    <td className="px-5 py-3 text-right num text-text-primary text-xs font-semibold">
                      {rollforward.length > 0 ? formatCurrencyFull(rollforward[rollforward.length - 1].endingBalance) : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Current Period Tab */}
        {activeTab === 'currentPeriod' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Current Period Revenue Recognition — {CURRENT_MONTH}
                  </div>
                  <div className="text-xs text-text-muted">
                    All amounts recognizing in {CURRENT_MONTH} with journal entry preview
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-lg font-semibold text-primary">{formatCurrencyFull(currentPeriodTotal)}</div>
                  <div className="text-xs text-text-muted">Total this period</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/40">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Contract / PO</th>
                      <th className="text-left px-3 py-3 text-text-muted font-medium">Type</th>
                      <th className="text-left px-3 py-3 text-text-muted font-medium">Method</th>
                      <th className="text-right px-3 py-3 text-text-muted font-medium">Amount</th>
                      <th className="text-left px-3 py-3 text-text-muted font-medium">Debit</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {currentPeriod.map((r, i) => (
                      <tr key={i} className="table-row-hover">
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-text-primary">{r.poName}</div>
                          <div className="text-text-muted mt-0.5">{r.contractNumber} · {r.customer}</div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className="text-2xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: (PO_COLORS[r.poType] ?? '#6B7280') + '20',
                              color: PO_COLORS[r.poType] ?? '#6B7280',
                              border: `1px solid ${(PO_COLORS[r.poType] ?? '#6B7280')}30`,
                            }}
                          >
                            {r.poType}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={clsx(
                            'text-2xs px-2 py-0.5 rounded font-medium',
                            r.recognitionMethod === 'OverTime' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                          )}>
                            {r.recognitionMethod === 'OverTime' ? 'Over Time' : 'Point in Time'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right num text-text-primary font-semibold">
                          {formatCurrencyFull(r.amount)}
                        </td>
                        <td className="px-3 py-3.5 text-text-secondary font-mono">{r.debitAccount}</td>
                        <td className="px-4 py-3.5 text-success font-mono">{r.creditAccount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-surface-2/40">
                      <td className="px-4 py-3 text-xs font-semibold text-text-primary" colSpan={3}>
                        {currentPeriod.length} recognition events this period
                      </td>
                      <td className="px-3 py-3 text-right num text-primary font-bold text-sm">
                        {formatCurrencyFull(currentPeriodTotal)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Summary Journal Entry */}
            <div className="card">
              <div className="card-header">
                <div className="text-sm font-semibold text-text-primary">Summary Journal Entry — {CURRENT_MONTH}</div>
              </div>
              <div className="p-5">
                <div className="font-mono text-sm space-y-2 max-w-lg">
                  <div className="text-text-muted text-xs mb-3">Date: {format(new Date('2026-11-30'), 'MM/dd/yyyy')} · Batch: REV-{CURRENT_MONTH.replace('-', '')}</div>
                  <div className="flex justify-between gap-8">
                    <span className="text-text-secondary">Dr  Deferred Revenue (2100)</span>
                    <span className="num text-text-primary font-medium">{formatCurrencyFull(currentPeriodTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-8 pl-6">
                    <span className="text-text-secondary">Cr  Revenue — Software License (4110)</span>
                    <span className="num text-success font-medium">
                      {formatCurrencyFull(
                        currentPeriod.filter(r => r.poType === 'License').reduce((s, r) => s + r.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 pl-6">
                    <span className="text-text-secondary">Cr  Revenue — Professional Services (4120)</span>
                    <span className="num text-success font-medium">
                      {formatCurrencyFull(
                        currentPeriod.filter(r => r.poType === 'Service').reduce((s, r) => s + r.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 pl-6">
                    <span className="text-text-secondary">Cr  Revenue — Support & Maintenance (4130)</span>
                    <span className="num text-success font-medium">
                      {formatCurrencyFull(
                        currentPeriod.filter(r => r.poType === 'Support').reduce((s, r) => s + r.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 pl-6">
                    <span className="text-text-secondary">Cr  Revenue — Training (4140)</span>
                    <span className="num text-success font-medium">
                      {formatCurrencyFull(
                        currentPeriod.filter(r => r.poType === 'Training').reduce((s, r) => s + r.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 text-text-muted text-xs">
                    Narration: To recognize revenue for {currentPeriod.length} performance obligations in period {CURRENT_MONTH} per ASC 606-10-25
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
