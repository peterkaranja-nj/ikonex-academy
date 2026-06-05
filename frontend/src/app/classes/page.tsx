'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, Modal, ConfirmDialog, EmptyState, Spinner } from '@/components/ui';
import { streamsApi } from '@/lib/api';
import { ClassStream } from '@/types';
import { Plus, School, Users, Pencil, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const FORM_COLORS = [
  'from-emerald-500 to-emerald-600',
  'from-cyan-500 to-cyan-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
];

export default function ClassesPage() {
  const [streams, setStreams] = useState<ClassStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassStream | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', form_level: '', stream_letter: '', class_teacher: '', capacity: '45', academic_year: '2024/2025' });

  const load = async () => {
    setLoading(true);
    try { setStreams(await streamsApi.getAll()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', form_level: '', stream_letter: '', class_teacher: '', capacity: '45', academic_year: '2024/2025' });
    setModalOpen(true);
  }

  function openEdit(stream: ClassStream) {
    setEditing(stream);
    setForm({
      name: stream.name,
      form_level: String(stream.form_level),
      stream_letter: stream.stream_letter,
      class_teacher: stream.class_teacher || '',
      capacity: String(stream.capacity),
      academic_year: stream.academic_year,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.form_level || !form.stream_letter) {
      toast.error('Name, form level, and stream letter are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, form_level: parseInt(form.form_level), capacity: parseInt(form.capacity) };
      if (editing) { await streamsApi.update(editing.id, payload); toast.success('Updated'); }
      else { await streamsApi.create(payload); toast.success('Class stream created'); }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await streamsApi.delete(deleteId);
      toast.success('Deleted');
      setDeleteId(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  }

  // Group by form level
  const byForm = [1, 2, 3, 4].map(f => ({
    form: f,
    streams: streams.filter(s => s.form_level === f),
  }));

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <PageHeader
          title="Class Streams"
          description={`${streams.length} streams across Form 1–4`}
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Stream
            </button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-7 h-7 text-brand-600" /></div>
        ) : streams.length === 0 ? (
          <EmptyState icon={School} title="No class streams yet" description="Create your first class stream to get started" action={<button onClick={openCreate} className="btn-primary">Create Stream</button>} />
        ) : (
          <div className="space-y-6">
            {byForm.filter(f => f.streams.length > 0).map(({ form, streams: formStreams }) => (
              <div key={form}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm', FORM_COLORS[form - 1])}>
                    {form}
                  </div>
                  <h2 className="font-bold text-slate-900">Form {form}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
                    {formStreams.reduce((a, s) => a + (s.student_count || 0), 0)} students
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formStreams.map((stream) => (
                    <div key={stream.id} className="card hover:shadow-card-hover transition-all duration-200 group">
                      <div className={cn('h-2 rounded-t-xl bg-gradient-to-r', FORM_COLORS[stream.form_level - 1])} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{stream.name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {stream.academic_year}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/classes/${stream.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => openEdit(stream)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(stream.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{stream.student_count || 0}</span>
                            <span className="text-xs text-slate-400">students enrolled</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Capacity</span>
                            <span>{stream.student_count || 0} / {stream.capacity} seats</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-1.5">
                            <div
                              className={cn('h-1.5 rounded-full bg-gradient-to-r', FORM_COLORS[stream.form_level - 1])}
                              style={{ width: `${Math.min(100, ((stream.student_count || 0) / stream.capacity) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {stream.class_teacher && (
                          <p className="text-xs text-slate-400 mt-3">
                            Teacher: <span className="text-slate-600">{stream.class_teacher}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Class Stream' : 'Create Class Stream'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="w-4 h-4" /> : null}
              {editing ? 'Save Changes' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Stream Name <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="e.g. Form 1A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Academic Year</label>
              <input className="form-input" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Form Level <span className="text-red-500">*</span></label>
              <select className="form-input" value={form.form_level} onChange={e => setForm(f => ({ ...f, form_level: e.target.value }))}>
                <option value="">Select...</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>Form {n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Stream Letter <span className="text-red-500">*</span></label>
              <select className="form-input" value={form.stream_letter} onChange={e => setForm(f => ({ ...f, stream_letter: e.target.value }))}>
                <option value="">Select...</option>
                {['A', 'B', 'C'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Class Teacher</label>
              <input className="form-input" placeholder="Teacher name" value={form.class_teacher} onChange={e => setForm(f => ({ ...f, class_teacher: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Class Stream"
        message="This will permanently delete the class stream. Students must be reassigned first."
        loading={deleting}
      />
    </DashboardLayout>
  );
}
