import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  ClipboardList,
  ChevronRight,
  CircleDollarSign,
  LogOut,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Compliance Dashboard' },
  { to: '/contracts', icon: FileText, label: 'Contracts' },
  { to: '/recognition', icon: TrendingUp, label: 'Recognition Schedule' },
  { to: '/audit', icon: ClipboardList, label: 'Audit Trail' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <CircleDollarSign size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-semibold text-text-primary text-sm leading-tight">AccrualIQ</div>
            <div className="text-2xs text-text-muted leading-tight">ASC 606 Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider px-2 pb-2">
          Revenue Management
        </div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group',
                isActive
                  ? 'bg-sidebar text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              )}
            >
              <Icon
                size={16}
                className={clsx(
                  'flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {isActive && <ChevronRight size={12} className="text-primary/60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-2 cursor-pointer transition-colors group">
          <div className="w-7 h-7 rounded-full bg-sidebar flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">HM</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">Hitesh Mansukhani</div>
            <div className="text-2xs text-text-muted truncate">Sr. Mgr, Revenue Assurance</div>
          </div>
          <LogOut size={13} className="text-text-muted group-hover:text-text-secondary flex-shrink-0" />
        </div>
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-2 cursor-pointer transition-colors group mt-0.5">
          <Settings size={14} className="text-text-muted group-hover:text-text-secondary" />
          <span className="text-xs text-text-muted group-hover:text-text-secondary">Settings</span>
        </div>
      </div>
    </aside>
  );
}
