'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, SearchInput, Pagination, ConfirmDialog, Spinner, EmptyState, Select } from '@/components/ui';
import { studentsApi, streamsApi } from '@/lib/api';
import { Student, ClassStream } from '@/types';
import { formatDate, getStatusClass, getAvatarUrl } from '@/lib/utils';
import { Plus, Pencil, Trash2, Eye, Users } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [streams, setStreams] = useState<ClassStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getAll({
        page, limit: 15, search,
        class_stream_id: classFilter || undefined,
        status: statusFilter || undefined,
      });
      setStudents(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, statusFilter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { streamsApi.getAll().then(setStreams).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search, classFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await studentsApi.delete(deleteId);
      toast.success('Student deleted');
      setDeleteId(null);
      loadStudents();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <PageHeader
          title="Students"
          description={`${total} student${total !== 1 ? 's' : ''} found`}
          action={
            <Link href="/students/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Register Student
            </Link>
          }
        />

        {/* Filters */}
        <div className="card mb-5">
          <div className="card-body py-3">
            <div className="flex flex-wrap gap-3 items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by name or admission no..."
              />
              <Select
                value={classFilter}
                onChange={setClassFilter}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="All classes"
                className="w-40"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Graduated', label: 'Graduated' },
                  { value: 'Transferred', label: 'Transferred' },
                ]}
                placeholder="All statuses"
                className="w-36"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="w-7 h-7 text-brand-600" />
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students found"
                description="Try adjusting your filters or register a new student"
                action={<Link href="/students/new" className="btn-primary btn-sm">Register Student</Link>}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Adm No.</th>
                    <th>Class</th>
                    <th>Gender</th>
                    <th>Guardian</th>
                    <th>Status</th>
                    <th>Admitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photo_url || getAvatarUrl(`${student.first_name} ${student.last_name}`)}
                            alt={student.first_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-xs text-slate-400">{student.guardian_phone}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {student.admission_number}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{student.class_name}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{student.gender}</span>
                      </td>
                      <td>
                        <p className="text-sm text-slate-700">{student.guardian_name}</p>
                      </td>
                      <td>
                        <span className={getStatusClass(student.status)}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-500">{formatDate(student.admission_date)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/students/${student.id}`}
                            className="p-1.5 text-slate-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/students/${student.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(student.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure you want to permanently delete this student? This action cannot be undone."
        loading={deleting}
      />
    </DashboardLayout>
  );
}
