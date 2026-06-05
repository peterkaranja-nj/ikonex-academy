'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, Modal, ConfirmDialog, EmptyState, Spinner } from '@/components/ui';
import { subjectsApi } from '@/lib/api';
import { Subject } from '@/types';
import { Plus, BookOpen, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const INIT = { code: '', name: '', description: '', is_compulsory: true, max_score: 100 };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INIT);

  const load = async () => {
    setLoading(true);
    try { setSubjects(await subjectsApi.getAll()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null); setForm(INIT); setModalOpen(true);
  }
  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ code: s.code, name: s.name, description: s.description || '', is_compulsory: s.is_compulsory, max_score: s.max_score });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code || !form.name) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      if (editing) { await subjectsApi.update(editing.id, form); toast.success('Subject updated'); }
      else { await subjectsApi.create(form); toast.success('Subject created'); }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try { await subjectsApi.delete(deleteId); toast.success('Subject deleted'); setDeleteId(null); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  }

  const compulsory = subjects.filter(s => s.is_compulsory);
  const optional = subjects.filter(s => !s.is_compulsory);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <PageHeader
          title="Subjects"
          description={`${subjects.length} subjects — ${compulsory.length} compulsory, ${optional.length} optional`}
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="w-7 h-7 text-brand-600" /></div>
        ) : subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects yet" description="Add subjects offered at Ikonex Academy" action={<button onClick={openCreate} className="btn-primary">Add Subject</button>} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Max Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>
                        <span className="font-mono text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold">
                          {subject.code}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-sm text-slate-900">{subject.name}</p>
                      </td>
                      <td>
                        <p className="text-sm text-slate-500 max-w-xs truncate">{subject.description || '—'}</p>
                      </td>
                      <td>
                        {subject.is_compulsory ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Compulsory
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                            <XCircle className="w-3 h-3" />
                            Optional
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-sm text-slate-700">{subject.max_score}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(subject)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(subject.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subject' : 'Add New Subject'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="w-4 h-4" /> : null}
              {editing ? 'Save Changes' : 'Add Subject'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Subject Code <span className="text-red-500">*</span></label>
              <input className="form-input font-mono uppercase" placeholder="e.g. MAT" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="form-label">Max Score</label>
              <input className="form-input" type="number" value={form.max_score}
                onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Subject Name <span className="text-red-500">*</span></label>
            <input className="form-input" placeholder="e.g. Mathematics" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input resize-none" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="compulsory" className="w-4 h-4 rounded" checked={form.is_compulsory}
              onChange={e => setForm(f => ({ ...f, is_compulsory: e.target.checked }))} />
            <label htmlFor="compulsory" className="text-sm text-slate-700 font-medium cursor-pointer">Compulsory subject</label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        message="This will permanently remove this subject. Existing scores will also be removed."
        loading={deleting}
      />
    </DashboardLayout>
  );
}
