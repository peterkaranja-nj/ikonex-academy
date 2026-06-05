'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, GradeBadge, EmptyState, Spinner } from '@/components/ui';
import { streamsApi, subjectsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Users, Plus, Trash2, ArrowLeft,
  BarChart2, GraduationCap, UserCheck, X
} from 'lucide-react';
import { formatScore, ordinal } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');

  const { data: stream, isLoading: streamLoading } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => streamsApi.getById(id),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['stream-students', id],
    queryFn: () => streamsApi.getStudents(id),
  });

  const { data: streamSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['stream-subjects', id],
    queryFn: () => streamsApi.getSubjects(id),
  });

  const { data: allSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });

  const assignMutation = useMutation({
    mutationFn: () => streamsApi.assignSubject(id, selectedSubject),
    onSuccess: () => {
      toast.success('Subject assigned successfully');
      qc.invalidateQueries({ queryKey: ['stream-subjects', id] });
      setShowAssign(false);
      setSelectedSubject('');
    },
    onError: () => toast.error('Failed to assign subject'),
  });

  const removeMutation = useMutation({
    mutationFn: (subjectId: string) => streamsApi.removeSubject(id, subjectId),
    onSuccess: () => {
      toast.success('Subject removed');
      qc.invalidateQueries({ queryKey: ['stream-subjects', id] });
    },
    onError: () => toast.error('Failed to remove subject'),
  });

  const unassigned = allSubjects?.filter(
    (s: any) => !streamSubjects?.some((ss: any) => ss.id === s.id)
  );

  if (streamLoading) {
    return <DashboardLayout><div className="flex justify-center py-24"><Spinner className="w-10 h-10 text-blue-500" /></div></DashboardLayout>;
  }

  if (!stream) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <p className="text-slate-500">Class stream not found.</p>
          <button onClick={() => router.back()} className="btn btn-secondary mt-4">Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const formColors: Record<string, string> = {
    'Form 1': 'from-blue-600 to-blue-800',
    'Form 2': 'from-emerald-600 to-emerald-800',
    'Form 3': 'from-violet-600 to-violet-800',
    'Form 4': 'from-rose-600 to-rose-800',
  };
  const gradient = formColors[stream.form_level] || 'from-slate-600 to-slate-800';

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/classes" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Classes
        </Link>
      </div>

      {/* Hero Banner */}
      <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-8 text-white mb-6 shadow-lg`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-1">{stream.form_level}</p>
            <h1 className="text-4xl font-bold">{stream.name}</h1>
            <p className="text-white/70 text-sm mt-2">
              {stream.academic_year && `Academic Year ${stream.academic_year}`}
              {stream.class_teacher && ` · Class Teacher: ${stream.class_teacher}`}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{students?.length ?? '—'}</p>
              <p className="text-white/60 text-sm">Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{streamSubjects?.length ?? '—'}</p>
              <p className="text-white/60 text-sm">Subjects</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stream.capacity ?? '—'}</p>
              <p className="text-white/60 text-sm">Capacity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects Panel */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Subjects
              </h3>
              <button
                onClick={() => setShowAssign(!showAssign)}
                className="text-xs btn btn-primary flex items-center gap-1 py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> Assign
              </button>
            </div>

            {showAssign && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex gap-2">
                  <select
                    className="form-input flex-1 text-sm py-1.5"
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                  >
                    <option value="">— Select subject —</option>
                    {unassigned?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={!selectedSubject || assignMutation.isPending}
                    className="btn btn-primary py-1.5 px-3 text-sm"
                  >
                    Add
                  </button>
                  <button onClick={() => setShowAssign(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-50">
              {subjectsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </div>
                  ))
                : streamSubjects?.length === 0
                ? (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">
                    No subjects assigned yet.
                  </div>
                )
                : streamSubjects?.map((subject: any) => (
                  <div key={subject.id} className="px-5 py-3 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{subject.name}</p>
                      {subject.code && <p className="text-xs text-slate-400">{subject.code}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {subject.is_compulsory ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Core</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Optional</span>
                      )}
                      <button
                        onClick={() => removeMutation.mutate(subject.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Students Panel */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> Students
                {students && <span className="text-xs text-slate-400 font-normal">({students.length})</span>}
              </h3>
              <Link href={`/students/new?streamId=${id}`} className="text-xs btn btn-primary flex items-center gap-1 py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Student
              </Link>
            </div>

            {studentsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3 items-center">
                    <div className="w-8 h-8 bg-slate-100 rounded-full" />
                    <div className="flex-1 h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : students?.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No students yet"
                description="Register students and assign them to this stream."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Admission No.</th>
                      <th>Gender</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any, i: number) => (
                      <tr key={student.id}>
                        <td className="text-slate-400 text-sm">{i + 1}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=e2e8f0&textColor=475569&size=32`}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{student.full_name}</p>
                              {student.date_of_birth && (
                                <p className="text-xs text-slate-400">
                                  {new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()} yrs
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-sm text-slate-500">{student.admission_number}</td>
                        <td className="capitalize text-sm">{student.gender || '—'}</td>
                        <td>
                          <span className={`status-badge ${student.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                            {student.status}
                          </span>
                        </td>
                        <td>
                          <Link href={`/students/${student.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
