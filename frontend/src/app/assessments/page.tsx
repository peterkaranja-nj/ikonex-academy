'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader, Select, Spinner, EmptyState } from '@/components/ui';
import { streamsApi, subjectsApi, scoresApi, studentsApi } from '@/lib/api';
import { ClassStream, Subject, ExamType, Student } from '@/types';
import { ClipboardList, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssessmentsPage() {
  const [streams, setStreams] = useState<ClassStream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [existingScores, setExistingScores] = useState<any[]>([]);

  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([streamsApi.getAll(), subjectsApi.getAll(), scoresApi.getExamTypes()])
      .then(([s, sub, et]) => { setStreams(s); setSubjects(sub); setExamTypes(et); })
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (!selectedStream) { setStudents([]); return; }
    setLoadingStudents(true);
    streamsApi.getStudents(selectedStream)
      .then(setStudents)
      .finally(() => setLoadingStudents(false));
  }, [selectedStream]);

  useEffect(() => {
    if (!selectedStream || !selectedSubject || !selectedExamType) {
      setExistingScores([]); setScores({}); return;
    }
    // Load existing scores for this combination
    scoresApi.getClassSubject(selectedStream, selectedSubject, { exam_type_id: selectedExamType })
      .then((s) => {
        setExistingScores(s);
        const scoreMap: Record<string, string> = {};
        const remarkMap: Record<string, string> = {};
        s.forEach((sc: any) => {
          scoreMap[sc.student_id] = String(sc.score);
          remarkMap[sc.student_id] = sc.remarks || '';
        });
        setScores(scoreMap);
        setRemarks(remarkMap);
      })
      .catch(() => { setScores({}); setRemarks({}); });
  }, [selectedStream, selectedSubject, selectedExamType]);

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const maxScore = selectedSubjectData?.max_score || 100;

  async function handleSave() {
    if (!selectedStream || !selectedSubject || !selectedExamType) {
      toast.error('Please select class, subject, and exam type');
      return;
    }
    const entries = students
      .filter(s => scores[s.id] !== undefined && scores[s.id] !== '')
      .map(s => ({
        student_id: s.id,
        subject_id: selectedSubject,
        exam_type_id: selectedExamType,
        score: parseFloat(scores[s.id]),
        max_score: maxScore,
        remarks: remarks[s.id] || '',
        entered_by: 'Admin',
      }));

    if (!entries.length) { toast.error('No scores entered'); return; }

    // Validate
    const invalid = entries.filter(e => e.score < 0 || e.score > maxScore);
    if (invalid.length) { toast.error(`Scores must be between 0 and ${maxScore}`); return; }

    setSaving(true);
    try {
      const res = await scoresApi.bulkRecord(entries);
      toast.success(`${res.saved?.length || entries.length} scores saved successfully`);
      if (res.errors?.length) toast.error(`${res.errors.length} errors`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const ready = selectedStream && selectedSubject && selectedExamType && students.length > 0;

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <PageHeader
          title="Score Entry"
          description="Record examination and assessment scores for students"
        />

        {/* Filters */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="font-bold text-slate-900 text-sm">Select Class & Assessment</h3>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Class Stream"
              value={selectedStream}
              onChange={setSelectedStream}
              options={streams.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Select class..."
              required
            />
            <Select
              label="Subject"
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjects.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
              placeholder="Select subject..."
              required
            />
            <Select
              label="Exam / Assessment"
              value={selectedExamType}
              onChange={setSelectedExamType}
              options={examTypes.map(e => ({ value: e.id, label: `${e.name} (Term ${e.term})` }))}
              placeholder="Select exam type..."
              required
            />
          </div>
        </div>

        {/* Score table */}
        {!selectedStream ? (
          <EmptyState icon={ClipboardList} title="Select a class to begin" description="Choose the class stream, subject, and assessment type above" />
        ) : loadingStudents ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7 text-brand-600" /></div>
        ) : students.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No students in this class" description="Register students to this class stream first" />
        ) : (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {streams.find(s => s.id === selectedStream)?.name} — Score Sheet
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {students.length} students | Max score: {maxScore}
                </p>
              </div>
              <button onClick={handleSave} className="btn-primary btn-sm" disabled={!ready || saving}>
                {saving ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                Save Scores
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Adm No.</th>
                    <th>Score (/{maxScore})</th>
                    <th>Remarks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const score = scores[student.id] || '';
                    const pct = score !== '' ? (parseFloat(score) / maxScore) * 100 : null;
                    const hasExisting = existingScores.some(s => s.student_id === student.id);
                    return (
                      <tr key={student.id}>
                        <td className="text-slate-400 text-sm w-10">{i + 1}</td>
                        <td>
                          <p className="font-medium text-sm text-slate-900">
                            {student.first_name} {student.last_name}
                          </p>
                        </td>
                        <td>
                          <span className="font-mono text-xs text-slate-500">{student.admission_number}</span>
                        </td>
                        <td className="w-40">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              step={0.5}
                              className={`form-input w-28 text-center font-mono ${
                                score !== '' && pct !== null
                                  ? pct >= 70 ? 'border-emerald-300 bg-emerald-50' :
                                    pct >= 50 ? 'border-amber-300 bg-amber-50' :
                                    'border-red-300 bg-red-50'
                                  : ''
                              }`}
                              value={score}
                              onChange={e => setScores(prev => ({ ...prev, [student.id]: e.target.value }))}
                              placeholder="—"
                              disabled={!selectedSubject || !selectedExamType}
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input w-36 text-xs"
                            value={remarks[student.id] || ''}
                            onChange={e => setRemarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                            placeholder="Optional remarks"
                            disabled={!selectedSubject || !selectedExamType}
                          />
                        </td>
                        <td>
                          {hasExisting ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Recorded
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-body border-t border-slate-100 flex justify-end">
              <button onClick={handleSave} className="btn-primary" disabled={!ready || saving}>
                {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save All Scores
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
