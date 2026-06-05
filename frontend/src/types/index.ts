export interface ClassStream {
  id: string;
  name: string;
  form_level: number;
  stream_letter: string;
  capacity: number;
  academic_year: string;
  class_teacher?: string;
  student_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  class_stream_id: string;
  class_name?: string;
  form_level?: number;
  stream_letter?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  address?: string;
  photo_url?: string;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
  admission_date: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_compulsory: boolean;
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface ExamType {
  id: string;
  name: string;
  type: 'Exam' | 'CAT' | 'Assignment' | 'Project';
  weight: number;
  academic_year: string;
  term: number;
  created_at: string;
}

export interface Score {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type_id: string;
  score: number;
  max_score: number;
  remarks?: string;
  percentage?: number;
  subject_name?: string;
  subject_code?: string;
  exam_name?: string;
  exam_type?: string;
  term?: number;
  academic_year?: string;
}

export interface StudentResults {
  student: Student;
  subjects: SubjectResult[];
  summary: {
    total_score: number;
    total_max: number;
    average_percentage: number;
    grade: string;
    points: number;
  };
}

export interface SubjectResult {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  assessments: Score[];
  total: number;
  max_total: number;
  percentage: number;
  grade: string;
  points: number;
}

export interface ClassResult {
  student_id: string;
  student_name: string;
  admission_number: string;
  subjects_count: number;
  total_marks: number;
  average_score: number;
  total_points: number;
  grade: string;
  points: number;
  position: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
