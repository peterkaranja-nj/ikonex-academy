'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, Select, Spinner } from '@/components/ui';
import { studentsApi, streamsApi } from '@/lib/api';
import { Student, ClassStream } from '@/types';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props { studentId?: string; }

interface FieldProps {
  label: string; name: string; type?: string; required?: boolean;
  form: Record<string, any>; errors: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

function Field({ label, name, type = 'text', required, form, errors, onChange }: FieldProps) {
  return (
    <div>
      <label className="form-label">{label} {required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        className="form-input"
        value={form[name] ?? ''}
        onChange={e => onChange(name, e.target.value)}
      />
      {errors[name] && <p className="form-error">{errors[name]}</p>}
    </div>
  );
}

export default function StudentForm({ studentId }: Props) {
  const router = useRouter();
  const isEdit = !!studentId;
  const [streams, setStreams] = useState<ClassStream[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    admission_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    class_stream_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    address: '',
    status: 'Active',
    admission_date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    streamsApi.getAll().then(setStreams).catch(() => {});
    if (isEdit) {
      studentsApi.getById(studentId!).then((s: Student) => {
        setForm({
          admission_number: s.admission_number,
          first_name: s.first_name,
          last_name: s.last_name,
          date_of_birth: s.date_of_birth?.split('T')[0] || '',
          gender: s.gender,
          class_stream_id: s.class_stream_id,
          guardian_name: s.guardian_name,
          guardian_phone: s.guardian_phone,
          guardian_email: s.guardian_email || '',
          address: s.address || '',
          status: s.status,
          admission_date: s.admission_date?.split('T')[0] || '',
        });
        setLoading(false);
      }).catch(() => { toast.error('Student not found'); router.push('/students'); });
    }
  }, [isEdit, studentId, router]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.admission_number) e.admission_number = 'Required';
    if (!form.first_name) e.first_name = 'Required';
    if (!form.last_name) e.last_name = 'Required';
    if (!form.date_of_birth) e.date_of_birth = 'Required';
    if (!form.gender) e.gender = 'Required';
    if (!form.class_stream_id) e.class_stream_id = 'Required';
    if (!form.guardian_name) e.guardian_name = 'Required';
    if (!form.guardian_phone) e.guardian_phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await studentsApi.update(studentId!, form);
        toast.success('Student updated successfully');
      } else {
        const s = await studentsApi.create(form);
        toast.success('Student registered successfully');
        router.push(`/students/${s.id}`);
        return;
      }
      router.push('/students');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-7 h-7 text-brand-600" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href="/students" className="btn-ghost btn-sm mb-3 inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
          <PageHeader
            title={isEdit ? 'Edit Student' : 'Register New Student'}
            description={isEdit ? 'Update student information' : 'Add a new student to the system'}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
            </div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Admission Number" name="admission_number" required form={form} errors={errors} onChange={set} />
              <Select
                label="Class Stream"
                value={form.class_stream_id}
                onChange={(v) => set('class_stream_id', v)}
                options={streams.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Select class"
                error={errors.class_stream_id}
                required
              />
              <Field label="First Name" name="first_name" required form={form} errors={errors} onChange={set} />
              <Field label="Last Name" name="last_name" required form={form} errors={errors} onChange={set} />
              <Field label="Date of Birth" name="date_of_birth" type="date" required form={form} errors={errors} onChange={set} />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(v) => set('gender', v)}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                placeholder="Select gender"
                error={errors.gender}
                required
              />
              <Field label="Admission Date" name="admission_date" type="date" form={form} errors={errors} onChange={set} />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => set('status', v)}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Transferred', label: 'Transferred' },
                  { value: 'Graduated', label: 'Graduated' },
                ]}
              />
            </div>
          </div>

          {/* Guardian Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-slate-900 text-sm">Guardian / Parent Information</h3>
            </div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Guardian Name" name="guardian_name" required form={form} errors={errors} onChange={set} />
              <Field label="Phone Number" name="guardian_phone" type="tel" required form={form} errors={errors} onChange={set} />
              <Field label="Email Address" name="guardian_email" type="email" form={form} errors={errors} onChange={set} />
              <div className="sm:col-span-2">
                <label className="form-label">Home Address</label>
                <textarea
                  className="form-input resize-none"
                  rows={2}
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/students" className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
