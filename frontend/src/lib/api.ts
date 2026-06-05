import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ─── Class Streams ─────────────────────────────────────────────
export const streamsApi = {
  getAll: () => api.get('/streams').then(r => r.data.data),
  getById: (id: string) => api.get(`/streams/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/streams', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/streams/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/streams/${id}`).then(r => r.data),
  getStudents: (id: string) => api.get(`/streams/${id}/students`).then(r => r.data.data),
  getSubjects: (id: string) => api.get(`/streams/${id}/subjects`).then(r => r.data.data),
  assignSubject: (id: string, subjectId: string) => api.post(`/streams/${id}/subjects`, { subject_id: subjectId }).then(r => r.data.data),
  removeSubject: (id: string, subjectId: string) => api.delete(`/streams/${id}/subjects/${subjectId}`).then(r => r.data),
};

// ─── Students ─────────────────────────────────────────────────
export const studentsApi = {
  getAll: (params?: any) => api.get('/students', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/students/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/students', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/students/${id}`).then(r => r.data),
  getScores: (id: string, params?: any) => api.get(`/students/${id}/scores`, { params }).then(r => r.data.data),
};

// ─── Subjects ─────────────────────────────────────────────────
export const subjectsApi = {
  getAll: () => api.get('/subjects').then(r => r.data.data),
  getById: (id: string) => api.get(`/subjects/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/subjects', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/subjects/${id}`).then(r => r.data),
};

// ─── Scores ───────────────────────────────────────────────────
export const scoresApi = {
  record: (data: any) => api.post('/scores', data).then(r => r.data.data),
  bulkRecord: (scores: any[]) => api.post('/scores/bulk', { scores }).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/scores/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/scores/${id}`).then(r => r.data),
  getClassSubject: (classId: string, subjectId: string, params?: any) =>
    api.get(`/scores/class/${classId}/subject/${subjectId}`, { params }).then(r => r.data.data),
  getExamTypes: (params?: any) => api.get('/exam-types', { params }).then(r => r.data.data),
  createExamType: (data: any) => api.post('/exam-types', data).then(r => r.data.data),
};

// ─── Results ──────────────────────────────────────────────────
export const resultsApi = {
  getStudentResults: (studentId: string, params?: any) =>
    api.get(`/results/student/${studentId}`, { params }),
  getClassResults: (classId: string, examTypeId?: string) =>
    api.get(`/results/class/${classId}`, { params: examTypeId ? { examTypeId } : {} }),
  getSubjectPerformance: (classId: string, subjectId: string) =>
    api.get(`/results/class/${classId}/subject/${subjectId}`).then(r => r.data.data),
  getExamTypes: () => api.get('/exam-types'),
};

// ─── Notifications ────────────────────────────────────────────
export const notificationsApi = {
  getMissingScores: () => api.get('/notifications/missing-scores').then(r => r.data.data as {
    stream_id: string; stream_name: string;
    exam_type_id: string; exam_type_name: string;
    term: string; year: number;
    total_students: number; scored_count: number; missing_count: number;
  }[]),
};

// ─── Reports ──────────────────────────────────────────────────
export const reportsApi = {
  downloadReportCard: (studentId: string, params?: any) => {
    const p = new URLSearchParams(params).toString();
    const url = `${api.defaults.baseURL}/reports/student/${studentId}/report-card?${p}`;
    window.open(url, '_blank');
  },
  downloadClassReport: (classId: string, params?: any) => {
    const p = new URLSearchParams(params).toString();
    const url = `${api.defaults.baseURL}/reports/class/${classId}?${p}`;
    window.open(url, '_blank');
  },
};

export default api;
