import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, ArrowUpDown, Filter, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { SEED_CONTRACTS } from '../lib/data';
import { computeContractRecognizedToDate, formatCurrency, getMonthCount } from '../lib/calculations';
import type { Contract, ContractStatus } from '../lib/types';

type SortKey = 'contractNumber' | 'customer' | 'tcv' | 'startDate' | 'endDate' | 'status' | 'recognized';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { label: string; value: ContractStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Modified', value: 'Modified' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Terminated', value: 'Terminated' },
];

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={clsx(
        'text-xs px-2 py-0.5 rounded-full font-medium border',
        status === 'Active' && 'badge-active',
        status === 'Draft' && 'badge-draft',
        status === 'Modified' && 'badge-modified',
        status === 'Terminated' && 'badge-terminated'
      )}
    >
      {status}
    </span>
  );
}

function SortIcon({ field, sortKey, dir }: { field: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (field !== sortKey) return <ArrowUpDown size={12} className="text-text-muted" />;
  return dir === 'asc' ? (
    <ChevronUp size={12} className="text-primary" />
  ) : (
    <ChevronDown size={12} className="text-primary" />
  );
}

export function Contracts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const contracts = SEED_CONTRACTS;

  const enriched = useMemo(
    () =>
      contracts.map(c => ({
        ...c,
        recognizedToDate: computeContractRecognizedToDate(c),
        months: getMonthCount(c.startDate, c.endDate),
      })),
    [contracts]
  );

  const filtered = useMemo(() => {
    return enriched.filter(c => {
      const matchesSearch =
        !search ||
        c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.customer.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enriched, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortKey) {
        case 'tcv': aVal = a.tcv; bVal = b.tcv; break;
        case 'recognized': aVal = a.recognizedToDate; bVal = b.recognizedToDate; break;
        case 'startDate': aVal = a.startDate; bVal = b.startDate; break;
        case 'endDate': aVal = a.endDate; bVal = b.endDate; break;
        default: aVal = a[sortKey]; bVal = b[sortKey];
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  const totalTCV = useMemo(() => filtered.reduce((s, c) => s + c.tcv, 0), [filtered]);

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Contract Portfolio</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {filtered.length} contracts · Total TCV: <span className="num text-text-secondary">{formatCurrency(totalTCV)}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search contracts or customers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === f.value
                    ? 'bg-primary text-white'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                {([
                  ['contractNumber', 'Contract #'],
                  ['customer', 'Customer'],
                  ['tcv', 'TCV'],
                  ['startDate', 'Start Date'],
                  ['endDate', 'End Date'],
                  ['status', 'Status'],
                  ['recognized', 'Recognized to Date'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="text-left px-4 py-3 text-text-muted font-medium text-xs cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort(key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      <SortIcon field={key} sortKey={sortKey} dir={sortDir} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs text-text-muted font-medium text-right">Progress</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginated.map(c => {
                const pct = c.tcv > 0 ? (c.recognizedToDate / c.tcv) * 100 : 0;
                return (
                  <tr
                    key={c.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => navigate(`/contracts/${c.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <span className="num text-text-primary font-medium text-xs">{c.contractNumber}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-text-primary font-medium">{c.customer}</div>
                      <div className="text-xs text-text-muted">{c.months}mo term</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="num text-text-primary font-medium">{formatCurrency(c.tcv)}</span>
                    </td>
                    <td className="px-4 py-3.5 num text-text-secondary text-xs">
                      {format(parseISO(c.startDate), 'MM/dd/yyyy')}
                    </td>
                    <td className="px-4 py-3.5 num text-text-secondary text-xs">
                      {format(parseISO(c.endDate), 'MM/dd/yyyy')}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="num text-text-primary font-medium text-sm">
                        {formatCurrency(c.recognizedToDate)}
                      </div>
                      <div className="num text-xs text-text-muted">{pct.toFixed(1)}% of TCV</div>
                    </td>
                    <td className="px-4 py-3.5 min-w-[100px]">
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ExternalLink size={13} className="text-text-muted hover:text-primary transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length}
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
