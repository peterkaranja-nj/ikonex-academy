'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardList, BarChart3, FileText, ChevronRight,
  School, Bell, Menu, X, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { notificationsApi } from '@/lib/api';

const NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/classes',     icon: School,          label: 'Class Streams' },
  { href: '/students',    icon: Users,           label: 'Students'      },
  { href: '/subjects',    icon: BookOpen,        label: 'Subjects'      },
  { href: '/assessments', icon: ClipboardList,   label: 'Assessments'   },
  { href: '/results',     icon: BarChart3,       label: 'Results'       },
  { href: '/reports',     icon: FileText,        label: 'Reports'       },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ['notifications-missing-scores'],
    queryFn: notificationsApi.getMissingScores,
    refetchInterval: 60_000,
    retry: false,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
        style={{ background: 'linear-gradient(160deg, #047857 0%, #059669 50%, #10b981 100%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-extrabold text-[14px] leading-none tracking-wide whitespace-nowrap">IKONEX ACADEMY</p>
              <p className="text-emerald-300 text-[10px] mt-1 font-medium tracking-wider whitespace-nowrap opacity-90">Management System</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-emerald-400 text-[10px] font-extrabold uppercase tracking-normal px-3 mb-3">
            Navigation
          </p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={cn('nav-item group', active ? 'nav-item-active' : 'nav-item-inactive')}>
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              AD
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">Admin User</p>
              <p className="text-emerald-300 text-[11px] truncate">admin@ikonex.ac.ke</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 px-4 lg:px-6 py-3.5 flex items-center gap-4 shadow-sm shrink-0 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.80)' }}>
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900 p-1">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-slate-400">Ikonex Academy</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold capitalize">
              {pathname.split('/')[1] || 'Dashboard'}
            </span>
          </div>

          <div className="flex-1" />

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-[min(20rem,calc(100vw-1rem))] rounded-2xl shadow-xl border border-slate-200/70 z-50 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)' }}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  </div>
                  {alerts.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                      {alerts.length} pending
                    </span>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">No missing scores for current exam types.</p>
                    </div>
                  ) : (
                    alerts.map((a, i) => {
                      const pct = Math.round((a.scored_count / a.total_students) * 100);
                      const urgent = a.missing_count >= a.total_students * 0.5;
                      return (
                        <Link
                          key={i}
                          href={`/assessments?streamId=${a.stream_id}&examTypeId=${a.exam_type_id}`}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            urgent ? 'bg-red-100' : 'bg-amber-100'
                          )}>
                            <AlertTriangle className={cn('w-4 h-4', urgent ? 'text-red-500' : 'text-amber-500')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {a.stream_name} — {a.exam_type_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {a.missing_count} of {a.total_students} students missing scores
                            </p>
                            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', urgent ? 'bg-red-400' : 'bg-amber-400')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-2" />
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {alerts.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                    <Link
                      href="/assessments"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Go to Assessments →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User pill */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              AD
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">Admin</p>
              <p className="text-xs text-slate-400 mt-0.5">Administrator</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
