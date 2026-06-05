// ============================================================
// IKONEX ACADEMY - SHARED TYPES
// ============================================================

export interface ClassStream {
  id: string;
  name: string;
  form_level: number;
  stream_letter: string;
  capacity: number;
  academic_year: string;
  class_teacher?: string;
  created_at: Date;
  updated_at: Date;
  student_count?: number;
}

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
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
  admission_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_compulsory: boolean;
  max_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface ExamType {
  id: string;
  name: string;
  type: 'Exam' | 'CAT' | 'Assignment' | 'Project';
  weight: number;
  academic_year: string;
  term: number;
  created_at: Date;
}

export interface Score {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type_id: string;
  score: number;
  max_score: number;
  remarks?: string;
  entered_by?: string;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  student_name?: string;
  admission_number?: string;
  subject_name?: string;
  subject_code?: string;
  exam_name?: string;
  exam_type?: string;
  term?: number;
  academic_year?: string;
  class_name?: string;
  percentage?: number;
}

export interface GradingScale {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  points: number;
  description: string;
}

export interface StudentPerformance {
  student_id: string;
  admission_number: string;
  student_name: string;
  class_name: string;
  subjects: SubjectScore[];
  total_score: number;
  total_max_score: number;
  average_percentage: number;
  grade: string;
  points: number;
  class_position?: number;
}

export interface SubjectScore {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  scores: Score[];
  total: number;
  max_total: number;
  percentage: number;
  grade: string;
  points: number;
  subject_position?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClassStreamSubject {
  id: string;
  class_stream_id: string;
  subject_id: string;
  teacher_name?: string;
  created_at: Date;
  subject_name?: string;
  subject_code?: string;
  class_name?: string;
}
