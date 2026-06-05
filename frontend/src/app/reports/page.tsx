'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, EmptyState, GradeBadge } from '@/components/ui';
import { streamsApi, studentsApi, resultsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Download, Users, User, Filter,
  BookOpen, Award, ChevronRight, Loader2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'individual' | 'class'>('individual');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: streams } = useQuery({
    queryKey: ['streams'],
    queryFn: () => streamsApi.getAll(),
  });

  const { data: streamStudents } = useQuery({
    queryKey: ['stream-students', selectedStream],
    queryFn: () => streamsApi.getStudents(selectedStream),
    enabled: !!selectedStream,
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: () => resultsApi.getExamTypes().then(r => r.data.data),
  });

  const { data: studentPreview, isLoading: previewLoading } = useQuery({
    queryKey: ['student-preview', selectedStudent],
    queryFn: () => resultsApi.getStudentResults(selectedStudent).then(r => r.data.data),
    enabled: !!selectedStudent,
  });

  const triggerDownload = async (url: string, filename: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const downloadStudentReport = async (studentId: string, name: string) => {
    setGeneratingId(studentId);
    try {
      const url = `${API}/api/v1/reports/student/${studentId}/report-card${selectedExamType ? `?examTypeId=${selectedExamType}` : ''}`;
      await triggerDownload(url, `${name.replace(/\s+/g, '_')}_report_card.pdf`);
      toast.success(`Report card for ${name} downloaded`);
    } catch {
      toast.error('Failed to download report. Try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  const downloadClassReport = async () => {
    if (!selectedStream) return;
    setGeneratingId('class');
    try {
      const streamName = streams?.find((s: any) => s.id === selectedStream)?.name || 'class';
      const url = `${API}/api/v1/reports/class/${selectedStream}${selectedExamType ? `?examTypeId=${selectedExamType}` : ''}`;
      await triggerDownload(url, `${streamName.replace(/\s+/g, '_')}_class_report.pdf`);
      toast.success('Class report downloaded');
    } catch {
      toast.error('Failed to download report. Try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  const bulkDownloadAll = async () => {
    if (!streamStudents?.length) return;
    toast.success(`Downloading ${streamStudents.length} report cards…`);
    for (let i = 0; i < streamStudents.length; i++) {
      const student = streamStudents[i] as any;
      const url = `${API}/api/v1/reports/student/${student.id}/report-card${selectedExamType ? `?examTypeId=${selectedExamType}` : ''}`;
      await triggerDownload(url, `${student.first_name}_${student.last_name}_report_card.pdf`).catch(() => {});
      if (i < streamStudents.length - 1) await new Promise(r => setTimeout(r, 600));
    }
  };

  const selectedStudentInfo = streamStudents?.find((s: any) => s.id === selectedStudent);

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        subtitle="Generate PDF report cards and class performance reports"
        icon={<FileText className="w-6 h-6 text-blue-600" />}
      />

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit mb-6">
        {[
          { key: 'individual', label: 'Individual Report Cards', shortLabel: 'Individual', icon: User },
          { key: 'class', label: 'Class Reports', shortLabel: 'Class', icon: Users },
        ].map(({ key, label, shortLabel, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white shadow-sm text-emerald-700 border border-emerald-100'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── INDIVIDUAL REPORT CARDS ── */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Filters */}
          <div className="space-y-5">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" /> Select Student
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Stream</label>
                <select className="form-input" value={selectedStream} onChange={e => { setSelectedStream(e.target.value); setSelectedStudent(''); }}>
                  <option value="">— Choose stream —</option>
                  {streams?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {selectedStream && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                  <select className="form-input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                    <option value="">— Choose student —</option>
                    {streamStudents?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exam / Term (optional)</label>
                <select className="form-input" value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                  <option value="">All Exams</option>
                  {examTypes?.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} — {e.term} {e.year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk download */}
            {selectedStream && streamStudents?.length > 0 && (
              <div className="card p-5 border-2 border-dashed border-blue-200 bg-blue-50/50">
                <p className="text-sm font-medium text-slate-700 mb-1">Bulk Download</p>
                <p className="text-xs text-slate-500 mb-3">Generate report cards for all {streamStudents.length} students in this stream.</p>
                <button onClick={bulkDownloadAll} className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Download All ({streamStudents.length})
                </button>
              </div>
            )}
          </div>

          {/* Right: Preview & Download */}
          <div className="lg:col-span-2">
            {!selectedStudent && (
              <EmptyState
                icon={User}
                title="No student selected"
                description="Select a class stream and student to preview their results and generate a report card."
              />
            )}

            {selectedStudent && previewLoading && (
              <div className="card p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            )}

            {selectedStudent && !previewLoading && studentPreview && (
              <div className="card overflow-hidden">
                {/* Report Preview Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Ikonex Academy</p>
                      <h2 className="text-lg sm:text-xl font-bold">
                        {selectedStudentInfo ? `${selectedStudentInfo.first_name} ${selectedStudentInfo.last_name}` : ''}
                      </h2>
                      <p className="text-slate-300 text-sm mt-1">
                        {selectedStudentInfo?.admission_number} · {selectedStudentInfo?.class_name}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadStudentReport(selectedStudent, selectedStudentInfo ? `${selectedStudentInfo.first_name} ${selectedStudentInfo.last_name}` : '')}
                      disabled={generatingId === selectedStudent}
                      className="self-start flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {generatingId === selectedStudent
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      Download PDF
                    </button>
                  </div>
                </div>

                {/* Subject Results */}
                <div className="p-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Subject Performance
                  </h4>
                  {studentPreview.subjects?.length > 0 ? (
                    <div className="space-y-2">
                      {studentPreview.subjects.map((subject: any) => (
                        <div key={subject.subject_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{subject.subject_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{(subject.percentage ?? 0).toFixed(1)}%</p>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(subject.percentage || 0, 100)}%` }}
                            />
                          </div>
                          <GradeBadge grade={subject.grade || '—'} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No scores recorded yet.</p>
                  )}
                </div>

                {/* Summary Footer */}
                {studentPreview.summary && (
                  <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex flex-wrap gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Average</p>
                      <p className="text-lg font-bold text-slate-800">{(studentPreview.summary.average_percentage ?? 0).toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Grade</p>
                      <GradeBadge grade={studentPreview.summary.grade || '—'} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Position</p>
                      <p className="text-lg font-bold text-slate-800">
                        {studentPreview.summary.position ? ordinal(studentPreview.summary.position) : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Points</p>
                      <p className="text-lg font-bold text-slate-800">{studentPreview.summary.points ?? '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLASS REPORTS ── */}
      {activeTab === 'class' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 space-y-4 h-fit">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" /> Report Options
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class Stream *</label>
              <select className="form-input" value={selectedStream} onChange={e => setSelectedStream(e.target.value)}>
                <option value="">— Choose stream —</option>
                {streams?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type (optional)</label>
              <select className="form-input" value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                <option value="">All Exams</option>
                {examTypes?.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name} — {e.term} {e.year}</option>
                ))}
              </select>
            </div>
            <button
              onClick={downloadClassReport}
              disabled={!selectedStream || generatingId === 'class'}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {generatingId === 'class'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Generate Class PDF
            </button>
          </div>

          <div className="lg:col-span-2">
            {!selectedStream ? (
              <EmptyState
                icon={Users}
                title="Select a class stream"
                description="Choose a class stream and optionally an exam type, then generate the full class PDF report."
              />
            ) : (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-400/20 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Class Performance Report</p>
                      <h2 className="text-xl font-bold">{streams?.find((s: any) => s.id === selectedStream)?.name}</h2>
                      <p className="text-slate-400 text-sm">Ikonex Academy · {new Date().getFullYear()}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">The class PDF report will include:</p>
                  {[
                    'Complete ranked list of all students',
                    'Individual subject scores per student',
                    'Average score and overall grade',
                    'Class position and total points',
                    'Subject-level statistics (highest, lowest, mean)',
                    'Grading scale reference',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-700">
                      <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                  <div className="pt-4">
                    <button
                      onClick={downloadClassReport}
                      disabled={generatingId === 'class'}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {generatingId === 'class'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      Download PDF Report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
