'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GradeBadge, Spinner } from '@/components/ui';
import { studentsApi, resultsApi, reportsApi } from '@/lib/api';
import { Student, StudentResults } from '@/types';
import { formatDate, getStatusClass, getAvatarUrl, calcAge, ordinal } from '@/lib/utils';
import { ArrowLeft, Pencil, FileDown, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<StudentResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          studentsApi.getById(id),
          resultsApi.getStudentResults(id, { academic_year: '2024/2025' }).then(r => r.data.data).catch(() => null),
        ]);
        setStudent(s);
        setResults(r);
      } catch (e: any) {
        toast.error('Student not found');
        router.push('/students');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-7 h-7 text-brand-600" />
      </div>
    </DashboardLayout>
  );

  if (!student) return null;

  const chartData = results?.subjects.map(s => ({
    name: s.subject_code,
    percentage: s.percentage,
    grade: s.grade,
  })) || [];

  const gradeColors: Record<string, string> = {
    A: '#16a34a', 'A-': '#22c55e',
    'B+': '#2563eb', B: '#3b82f6', 'B-': '#60a5fa',
    'C+': '#d97706', C: '#f59e0b', 'C-': '#fbbf24',
    'D+': '#ea580c', D: '#f97316', 'D-': '#fb923c',
    E: '#dc2626',
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/students" className="btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4" />
            Students
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-600">{student.first_name} {student.last_name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="card">
            <div className="card-body text-center pt-8">
              <img
                src={student.photo_url || getAvatarUrl(`${student.first_name} ${student.last_name}`)}
                alt={student.first_name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-md"
              />
              <h2 className="text-lg font-bold text-slate-900">
                {student.first_name} {student.last_name}
              </h2>
              <p className="text-sm text-slate-500 mb-3">{student.class_name}</p>
              <span className={getStatusClass(student.status)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {student.status}
              </span>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 text-sm text-left">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 w-5 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Guardian</p>
                    <p className="text-slate-700">{student.guardian_name}</p>
                    <p className="text-slate-500">{student.guardian_phone}</p>
                  </div>
                </div>
                {student.guardian_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-slate-600 text-xs">{student.guardian_email}</p>
                  </div>
                )}
                {student.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-600 text-xs">{student.address}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Age</p>
                  <p className="text-lg font-bold text-slate-900">{calcAge(student.date_of_birth)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Gender</p>
                  <p className="text-sm font-bold text-slate-900">{student.gender}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Link href={`/students/${id}/edit`} className="btn-secondary w-full justify-center">
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </Link>
                <button
                  onClick={() => reportsApi.downloadReportCard(id, { academic_year: '2024/2025' })}
                  className="btn-primary w-full justify-center"
                >
                  <FileDown className="w-4 h-4" />
                  Download Report Card
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-5">
            {/* Summary */}
            {results && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Average', value: `${results.summary.average_percentage.toFixed(1)}%` },
                  { label: 'Grade', value: results.summary.grade },
                  { label: 'Points', value: results.summary.points.toFixed(1) },
                  { label: 'Subjects', value: results.subjects.length },
                ].map(({ label, value }) => (
                  <div key={label} className="card p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-bold text-slate-900 text-sm">Subject Performance</h3>
                </div>
                <div className="card-body pt-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: any, name: any, props: any) => [`${val}% (${props.payload.grade})`, 'Score']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={gradeColors[entry.grade] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Subjects table */}
            {results && results.subjects.length > 0 && (
              <div className="card overflow-hidden">
                <div className="card-header">
                  <h3 className="font-bold text-slate-900 text-sm">Detailed Results</h3>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Total Score</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.subjects.map((sub) => (
                      <tr key={sub.subject_id}>
                        <td>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{sub.subject_name}</p>
                            <p className="text-xs text-slate-400">{sub.subject_code}</p>
                          </div>
                        </td>
                        <td className="font-mono text-sm">{sub.total.toFixed(1)}/{sub.max_total.toFixed(0)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, sub.percentage)}%`, backgroundColor: gradeColors[sub.grade] || '#94a3b8' }}
                              />
                            </div>
                            <span className="text-sm text-slate-700">{sub.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td><GradeBadge grade={sub.grade} /></td>
                        <td className="font-semibold text-sm text-slate-700">{sub.points}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td className="font-bold">OVERALL</td>
                      <td className="font-mono">{results.summary.total_score.toFixed(1)}/{results.summary.total_max.toFixed(0)}</td>
                      <td><span className="font-bold text-slate-900">{results.summary.average_percentage.toFixed(1)}%</span></td>
                      <td><GradeBadge grade={results.summary.grade} /></td>
                      <td className="font-bold">{results.summary.points}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {!results && (
              <div className="card">
                <div className="flex flex-col items-center py-12 text-center">
                  <p className="text-slate-400 text-sm">No results recorded yet for this student.</p>
                  <Link href="/assessments" className="btn-primary btn-sm mt-3">Record Scores</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
