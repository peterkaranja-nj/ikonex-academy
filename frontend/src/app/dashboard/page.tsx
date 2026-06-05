'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard, DashboardSkeleton } from '@/components/ui';
import { streamsApi, studentsApi, subjectsApi } from '@/lib/api';
import {
  Users, School, BookOpen, TrendingUp,
  ClipboardList, UserCheck, BarChart3, FileText, ArrowRight, GraduationCap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Link from 'next/link';

// Synced with classes/page.tsx FORM_COLORS: emerald-500, cyan-500, violet-500, amber-500
const FORM_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Fetch each independently so a single failure doesn't wipe everything
        const [streams, studentsRes, allStudentsRes, subjects] = await Promise.all([
          streamsApi.getAll().catch(() => [] as any[]),
          studentsApi.getAll({ limit: 1 }).catch(() => ({ pagination: { total: 0 } })),
          studentsApi.getAll({ limit: 6, status: 'Active' }).catch(() => ({ data: [] })),
          subjectsApi.getAll().catch(() => [] as any[]),
        ]);

        const safeStreams  = Array.isArray(streams)  ? streams  : [];
        const safeSubjects = Array.isArray(subjects) ? subjects : [];

        const formData = [1, 2, 3, 4].map((form) => ({
          name: `Form ${form}`,
          students: safeStreams
            .filter((s: any) => s.form_level === form)
            .reduce((a: number, s: any) => a + (s.student_count || 0), 0),
          capacity: safeStreams
            .filter((s: any) => s.form_level === form)
            .reduce((a: number, s: any) => a + (s.capacity || 45), 0),
        }));

        const totalCapacity = safeStreams.reduce((a: number, s: any) => a + (s.capacity || 45), 0);
        const totalStudents = (studentsRes as any).pagination?.total || 0;
        const fillRate      = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

        setStats({
          totalStreams:   safeStreams.length,
          totalStudents,
          totalSubjects:  safeSubjects.length,
          fillRate,
          streams:        [...safeStreams].sort((a: any, b: any) => (b.student_count||0) - (a.student_count||0)),
          formData,
          recentStudents: (allStudentsRes as any).data || [],
        });
      } catch (e) {
        console.error('Dashboard load error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <DashboardLayout>
      <DashboardSkeleton />
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="card p-10 text-center text-slate-500">
        <p className="text-lg font-semibold mb-2">Could not load dashboard</p>
        <p className="text-sm">Check that the backend is running, then refresh.</p>
      </div>
    </DashboardLayout>
  );

  const top5 = (stats?.streams || []).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">

        {/* ── Welcome Banner ─────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)' }}>
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, white, transparent 55%), radial-gradient(circle at 85% 15%, white, transparent 45%)' }} />
          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p className="text-emerald-300 text-sm font-medium">{greeting()} 👋</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
                Welcome to Ikonex Academy SMS
              </h2>
              <p className="text-emerald-200 text-sm mt-2">
                Academic Year 2025/2026 &nbsp;·&nbsp; {todayLabel()}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <Link href="/students/new"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                <Users className="w-4 h-4" /> Register Student
              </Link>
              <Link href="/assessments"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                <ClipboardList className="w-4 h-4" /> Enter Scores
              </Link>
            </div>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
            <GraduationCap className="w-32 h-32" />
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}     label="Total Students"   value={stats?.totalStudents  ?? 0} trend="All forms"   color="green"  />
          <StatCard icon={School}    label="Class Streams"    value={stats?.totalStreams    ?? 0} trend="Form 1–4"    color="teal"   />
          <StatCard icon={BookOpen}  label="Subjects Offered" value={stats?.totalSubjects  ?? 0} trend="Curriculum"  color="amber"  />
          <StatCard icon={UserCheck} label="Enrollment Rate"  value={`${stats?.fillRate    ?? 0}%`} trend="of capacity" color="purple" />
        </div>

        {/* ── Charts Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Students by form */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Students by Form Level</h3>
                <p className="text-xs text-slate-400 mt-0.5">Current enrollment distribution</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-5 pt-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.formData || []} barSize={44}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '12px' }}
                    cursor={{ fill: '#f0fdf4' }}
                  />
                  <Bar dataKey="students" name="Students" radius={[6, 6, 0, 0]}>
                    {(stats?.formData || []).map((_: any, i: number) => (
                      <Cell key={i} fill={FORM_COLORS[i % FORM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Capacity progress bars */}
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                {(stats?.formData || []).map((d: any, i: number) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{d.name}</span>
                      <span className="font-medium">{d.capacity > 0 ? Math.round((d.students / d.capacity) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.capacity > 0 ? Math.min(100, (d.students / d.capacity) * 100) : 0}%`, background: FORM_COLORS[i] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top streams */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-slate-900 text-sm">Top Classes by Enrollment</h3>
              <Link href="/classes" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {top5.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No streams loaded</div>
              )}
              {top5.map((s: any, i: number) => {
                const pct = Math.min(100, Math.round(((s.student_count || 0) / (s.capacity || 45)) * 100));
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition-colors">
                    <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ background: FORM_COLORS[(s.form_level - 1) % 4] }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FORM_COLORS[(s.form_level - 1) % 4] }} />
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{s.student_count || 0}/{s.capacity || 45}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent students */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-slate-900 text-sm">Recent Students</h3>
              <Link href="/students" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                All students <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(stats?.recentStudents || []).length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No students yet — register your first student</div>
              )}
              {(stats?.recentStudents || []).map((s: any) => (
                <Link key={s.id} href={`/students/${s.id}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-slate-400">{s.admission_number} · {s.class_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                    {s.gender}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-slate-900 text-sm">Quick Actions</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {[
                { href: '/students/new',  icon: Users,         label: 'Register Student',  desc: 'Add a new student',     color: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-100' },
                { href: '/classes',       icon: School,        label: 'Manage Classes',     desc: 'View class streams',    color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100' },
                { href: '/assessments',   icon: ClipboardList, label: 'Record Scores',      desc: 'Enter exam marks',      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100' },
                { href: '/results',       icon: BarChart3,     label: 'View Results',       desc: 'Class performance',     color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100' },
                { href: '/reports',       icon: FileText,      label: 'Generate Reports',   desc: 'Download report cards', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' },
                { href: '/subjects',      icon: BookOpen,      label: 'Subjects',           desc: 'Manage curriculum',     color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100' },
              ].map(({ href, icon: Icon, label, desc, color }) => (
                <Link key={href} href={href}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${color}`}>
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold leading-none">{label}</p>
                    <p className="text-xs opacity-70 mt-1">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
