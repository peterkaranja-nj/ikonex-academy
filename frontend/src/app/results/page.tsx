'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, GradeBadge, EmptyState, TableSkeleton } from '@/components/ui';
import { streamsApi, resultsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Trophy, TrendingUp, Users, Download, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { getGradeColor, ordinal } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Stream { id: string | number; name: string; form_level: string; }

export default function ResultsPage() {
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [sortField, setSortField] = useState<'position' | 'avg' | 'name'>('position');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: streams } = useQuery<Stream[]>({
    queryKey: ['streams'],
    queryFn: () => streamsApi.getAll(),
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: () => resultsApi.getExamTypes().then(r => r.data.data),
  });

  const { data: classResults, isLoading, error } = useQuery({
    queryKey: ['class-results', selectedStream, selectedExamType],
    queryFn: () =>
      resultsApi.getClassResults(selectedStream, selectedExamType || undefined).then(r => r.data.data),
    enabled: !!selectedStream,
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = classResults
    ? [...classResults].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'position') cmp = (a.position || 999) - (b.position || 999);
        else if (sortField === 'avg') cmp = (b.average_score ?? 0) - (a.average_score ?? 0);
        else cmp = a.student_name.localeCompare(b.student_name);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : [];

  const streamInfo = streams?.find(s => s.id === selectedStream);
  const topScore = sorted[0]?.average_score || 0;
  const avg = sorted.length ? sorted.reduce((s, r) => s + (r.average_score || 0), 0) / sorted.length : 0;
  const passing = sorted.filter(r => (r.average_score || 0) >= 50).length;

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <Minus className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const downloadReport = () => {
    if (!selectedStream) return;
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/reports/class/${selectedStream}${selectedExamType ? `?examTypeId=${selectedExamType}` : ''}`,
      '_blank'
    );
    toast.success('Generating PDF report…');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Results"
        subtitle="View ranked performance for any class stream"
        icon={<BarChart2 className="w-6 h-6 text-blue-600" />}
        actions={
          selectedStream && sorted.length > 0 ? (
            <button onClick={downloadReport} className="btn btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="card p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Class Stream *</label>
          <select
            className="form-input"
            value={selectedStream}
            onChange={e => setSelectedStream(e.target.value)}
          >
            <option value="">— Select a class stream —</option>
            {streams?.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.form_level})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type (optional)</label>
          <select
            className="form-input"
            value={selectedExamType}
            onChange={e => setSelectedExamType(e.target.value)}
          >
            <option value="">All Exams (Combined)</option>
            {examTypes?.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name} — {e.term} {e.year}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStream && (
        <EmptyState
          icon={BarChart2}
          title="Select a class stream"
          description="Choose a class stream above to view ranked student results and performance analytics."
        />
      )}

      {selectedStream && isLoading && <TableSkeleton rows={10} cols={7} />}
      {selectedStream && error && (
        <div className="card p-8 text-center text-red-500">Failed to load results. Please try again.</div>
      )}

      {sorted.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-icon bg-blue-50"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="stat-label">Total Students</p>
                <p className="stat-value">{sorted.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-amber-50"><Trophy className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="stat-label">Top Score</p>
                <p className="stat-value">{(topScore).toFixed(1)}%</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-emerald-50"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="stat-label">Class Average</p>
                <p className="stat-value">{avg.toFixed(1)}%</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-purple-50"><BarChart2 className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="stat-label">Pass Rate</p>
                <p className="stat-value">{sorted.length ? Math.round((passing / sorted.length) * 100) : 0}%</p>
              </div>
            </div>
          </div>

          {/* Podium — top 3 */}
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Top Performers — {streamInfo?.name}</h3>
            <div className="flex items-end justify-center gap-4 h-40">
              {[sorted[1], sorted[0], sorted[2]].map((r, idx) => {
                if (!r) return <div key={idx} className="w-28" />;
                const heights = ['h-28', 'h-40', 'h-20'];
                const medals = ['🥈', '🥇', '🥉'];
                const bg = ['bg-slate-100', 'bg-amber-50 border-2 border-amber-300', 'bg-orange-50'];
                return (
                  <div key={r.student_id} className={`w-28 ${heights[idx]} ${bg[idx]} rounded-t-lg flex flex-col items-center justify-end pb-3 transition-all`}>
                    <span className="text-2xl">{medals[idx]}</span>
                    <p className="text-xs font-semibold text-slate-700 text-center leading-tight px-2 mt-1">
                      {r.student_name.split(' ')[0]}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{(r.average_score ?? 0).toFixed(1)}%</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${getGradeColor(r.grade || '')}`}>
                      {r.grade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Rankings Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Full Rankings — {streamInfo?.name}</h3>
              <span className="text-sm text-slate-500">{sorted.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('position')}>
                      <span className="flex items-center gap-1">Rank <SortIcon field="position" /></span>
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">Student <SortIcon field="name" /></span>
                    </th>
                    <th>Adm No.</th>
                    <th>Subjects</th>
                    <th>Total Marks</th>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('avg')}>
                      <span className="flex items-center gap-1">Average <SortIcon field="avg" /></span>
                    </th>
                    <th>Grade</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((result, i) => (
                    <tr key={result.student_id} className={i < 3 ? 'bg-amber-50/30' : ''}>
                      <td>
                        <div className="flex items-center gap-1">
                          {i === 0 && <span className="text-lg">🥇</span>}
                          {i === 1 && <span className="text-lg">🥈</span>}
                          {i === 2 && <span className="text-lg">🥉</span>}
                          {i > 2 && (
                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                              {ordinal(result.position || i + 1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <a href={`/students/${result.student_id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {result.student_name}
                        </a>
                      </td>
                      <td className="text-slate-500 font-mono text-sm">{result.admission_number}</td>
                      <td className="text-center">{result.subjects_count}</td>
                      <td className="font-semibold">{result.total_marks ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(result.average_score || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 min-w-[40px]">
                            {(result.average_score ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td><GradeBadge grade={result.grade || '—'} /></td>
                      <td className="font-bold text-slate-800">{result.total_points ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedStream && !isLoading && sorted.length === 0 && !error && (
        <EmptyState
          icon={BarChart2}
          title="No results found"
          description="No scores have been recorded for this class stream yet. Add scores in the Assessments section."
        />
      )}
    </DashboardLayout>
  );
}
