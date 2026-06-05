'use client';
import { cn, getGradeColor } from '@/lib/utils';
import { X, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

// ─── Loading Spinner ──────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} />;
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: any; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────
export function PageHeader({ title, description, subtitle, action, actions, icon }: {
  title: string; description?: string; subtitle?: string; action?: ReactNode; actions?: ReactNode; icon?: ReactNode;
}) {
  const sub = subtitle || description;
  const act = actions || action;
  return (
    <div className="flex flex-wrap items-start justify-between mb-6 gap-3">
      <div className="flex items-center gap-3">
        {icon && <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">{icon}</div>}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {act && <div className="shrink-0">{act}</div>}
    </div>
  );
}

// ─── Grade Badge ──────────────────────────────────────────────
export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={cn('grade-badge', getGradeColor(grade))}>
      {grade}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn-danger" disabled={loading}>
            {loading ? <Spinner className="w-4 h-4" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, trend, color = 'indigo' }: {
  icon: any; label: string; value: string | number; trend?: string; color?: string;
}) {
  const gradients: Record<string, string> = {
    green:   'from-emerald-500 to-teal-600',
    teal:    'from-teal-500 to-cyan-600',
    amber:   'from-amber-400 to-orange-500',
    purple:  'from-purple-500 to-violet-600',
    cyan:    'from-cyan-500 to-blue-500',
    red:     'from-red-500 to-rose-600',
    blue:    'from-blue-500 to-indigo-500',
    indigo:  'from-emerald-500 to-teal-600',
  };
  const grad = gradients[color] || gradients.green;
  return (
    <div className="stat-card">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br text-white', grad)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {trend && <p className="text-xs text-slate-400 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        className="form-input pl-9 w-64"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        className="btn-ghost btn-sm"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'w-8 h-8 text-xs rounded-lg font-medium transition-colors',
              p === page
                ? 'bg-brand-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {p}
          </button>
        );
      })}
      <button
        className="btn-ghost btn-sm"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────
export function Select({ label, value, onChange, options, placeholder, error, required, className }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
  error?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={cn('skeleton h-9 rounded-lg', j === 0 ? 'w-8 shrink-0' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse-soft">
      {/* Banner */}
      <div className="skeleton h-36 rounded-2xl" />
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Chart + list row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        <div className="skeleton h-12 mx-4 mt-4 rounded-xl" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    </div>
  );
}
