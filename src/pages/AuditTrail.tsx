import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Filter, Download } from 'lucide-react';
import clsx from 'clsx';
import { SEED_AUDIT_LOG } from '../lib/data';
import { formatCurrency } from '../lib/calculations';
import type { AuditEntry } from '../lib/types';

type CategoryFilter = AuditEntry['category'] | 'All';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Allocation: { bg: 'bg-primary/10', text: 'text-primary' },
  Recognition: { bg: 'bg-success/10', text: 'text-success' },
  Modification: { bg: 'bg-warning/10', text: 'text-warning' },
  Creation: { bg: 'bg-surface-2', text: 'text-text-secondary' },
  StatusChange: { bg: 'bg-surface-2', text: 'text-text-muted' },
};

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'All', label: 'All Events' },
  { value: 'Creation', label: 'Creation' },
  { value: 'Modification', label: 'Modification' },
  { value: 'Allocation', label: 'Allocation' },
  { value: 'Recognition', label: 'Recognition' },
  { value: 'StatusChange', label: 'Status Change' },
];

export function AuditTrail() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const sorted = useMemo(() =>
    [...SEED_AUDIT_LOG].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    []
  );

  const filtered = useMemo(() => {
    return sorted.filter(entry => {
      const matchesCategory = categoryFilter === 'All' || entry.category === categoryFilter;
      const matchesSearch =
        !search ||
        entry.event.toLowerCase().includes(search.toLowerCase()) ||
        entry.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        entry.user.toLowerCase().includes(search.toLowerCase()) ||
        entry.details.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [sorted, search, categoryFilter]);

  const pageCount = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Category counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: sorted.length };
    for (const entry of sorted) {
      c[entry.category] = (c[entry.category] ?? 0) + 1;
    }
    return c;
  }, [sorted]);

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Audit Trail</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Timestamped log of all allocation changes, recognition events, and contract modifications
          </p>
        </div>
        <button className="btn-secondary">
          <Download size={13} />
          Export Log
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.slice(1).map(cat => {
          const colors = CATEGORY_COLORS[cat.value as string] ?? { bg: 'bg-surface-2', text: 'text-text-secondary' };
          return (
            <div key={cat.value} className="card px-4 py-3">
              <div className={clsx('text-xs font-medium mb-1', colors.text)}>{cat.label}</div>
              <div className="num text-xl font-semibold text-text-primary">{counts[cat.value as string] ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search events, contracts, users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  categoryFilter === cat.value
                    ? 'bg-primary text-white'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                )}
              >
                {cat.label}
                {cat.value !== 'All' && (
                  <span className="ml-1 opacity-60">{counts[cat.value as string] ?? 0}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                <th className="text-left px-4 py-3 text-text-muted font-medium w-40">Timestamp</th>
                <th className="text-left px-3 py-3 text-text-muted font-medium w-28">Contract</th>
                <th className="text-left px-3 py-3 text-text-muted font-medium w-28">Category</th>
                <th className="text-left px-3 py-3 text-text-muted font-medium">Event</th>
                <th className="text-left px-3 py-3 text-text-muted font-medium">Details</th>
                <th className="text-left px-3 py-3 text-text-muted font-medium w-32">User</th>
                <th className="text-right px-4 py-3 text-text-muted font-medium w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginated.map(entry => {
                const colors = CATEGORY_COLORS[entry.category] ?? { bg: 'bg-surface-2', text: 'text-text-secondary' };
                return (
                  <tr key={entry.id} className="table-row-hover">
                    <td className="px-4 py-3.5">
                      <div className="num text-text-secondary">{format(parseISO(entry.timestamp), 'MM/dd/yyyy')}</div>
                      <div className="num text-text-muted mt-0.5">{format(parseISO(entry.timestamp), 'HH:mm:ss')}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="num font-medium text-text-primary">{entry.contractNumber}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={clsx('text-2xs px-2 py-0.5 rounded-full font-medium', colors.bg, colors.text)}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-medium text-text-primary">{entry.event}</span>
                    </td>
                    <td className="px-3 py-3.5 max-w-xs">
                      <span className="text-text-muted leading-relaxed">{entry.details}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-sidebar flex items-center justify-center flex-shrink-0">
                          <span className="text-2xs font-medium text-primary">
                            {entry.user === 'System' ? 'SY' : entry.user.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-text-secondary truncate">{entry.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {entry.amount ? (
                        <span className="num font-medium text-text-primary">{formatCurrency(entry.amount)}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                    No audit entries match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'w-7 h-7 rounded text-xs font-medium transition-colors',
                    p === page ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-2'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
