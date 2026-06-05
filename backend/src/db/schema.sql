-- ============================================================
-- IKONEX ACADEMY - COMPLETE DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLASS STREAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS class_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(20) NOT NULL UNIQUE,  -- e.g. "Form 1A"
  form_level INTEGER NOT NULL CHECK (form_level BETWEEN 1 AND 4),
  stream_letter CHAR(1) NOT NULL CHECK (stream_letter IN ('A','B','C')),
  capacity INTEGER NOT NULL DEFAULT 45,
  academic_year VARCHAR(9) NOT NULL DEFAULT '2024/2025',
  class_teacher VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male','Female','Other')),
  class_stream_id UUID NOT NULL REFERENCES class_streams(id) ON DELETE RESTRICT,
  guardian_name VARCHAR(100) NOT NULL,
  guardian_phone VARCHAR(20) NOT NULL,
  guardian_email VARCHAR(100),
  address TEXT,
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Graduated','Transferred')),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_compulsory BOOLEAN NOT NULL DEFAULT true,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLASS STREAM SUBJECTS (Many-to-Many)
-- ============================================================
CREATE TABLE IF NOT EXISTS class_stream_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_stream_id UUID NOT NULL REFERENCES class_streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_stream_id, subject_id)
);

-- ============================================================
-- EXAM TYPES / TERMS
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,        -- e.g. "Term 1 Exam", "CAT 1"
  type VARCHAR(20) NOT NULL CHECK (type IN ('Exam','CAT','Assignment','Project')),
  weight NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (weight BETWEEN 0 AND 100),
  academic_year VARCHAR(9) NOT NULL DEFAULT '2024/2025',
  term INTEGER NOT NULL DEFAULT 1 CHECK (term BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCORES / ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type_id UUID NOT NULL REFERENCES exam_types(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  remarks TEXT,
  entered_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, subject_id, exam_type_id)
);

-- ============================================================
-- GRADING SCALES
-- ============================================================
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade VARCHAR(5) NOT NULL,
  min_percentage NUMERIC(5,2) NOT NULL,
  max_percentage NUMERIC(5,2) NOT NULL,
  points NUMERIC(3,1) NOT NULL,
  description VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_class_stream ON students(class_stream_id);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_subject ON scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_scores_exam_type ON scores(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_class_stream_subjects_stream ON class_stream_subjects(class_stream_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_class_streams_updated
  BEFORE UPDATE ON class_streams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_students_updated
  BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_subjects_updated
  BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_scores_updated
  BEFORE UPDATE ON scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS
-- ============================================================

-- Student with class info
CREATE OR REPLACE VIEW v_students AS
SELECT
  s.*,
  cs.name AS class_name,
  cs.form_level,
  cs.stream_letter,
  cs.academic_year
FROM students s
JOIN class_streams cs ON s.class_stream_id = cs.id;

-- Score details view
CREATE OR REPLACE VIEW v_scores AS
SELECT
  sc.id,
  sc.score,
  sc.max_score,
  sc.remarks,
  sc.created_at,
  sc.updated_at,
  s.id AS student_id,
  s.admission_number,
  s.first_name,
  s.last_name,
  s.first_name || ' ' || s.last_name AS student_name,
  sub.id AS subject_id,
  sub.code AS subject_code,
  sub.name AS subject_name,
  et.id AS exam_type_id,
  et.name AS exam_name,
  et.type AS exam_type,
  et.term,
  et.academic_year,
  cs.id AS class_stream_id,
  cs.name AS class_name,
  ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
FROM scores sc
JOIN students s ON sc.student_id = s.id
JOIN subjects sub ON sc.subject_id = sub.id
JOIN exam_types et ON sc.exam_type_id = et.id
JOIN class_streams cs ON s.class_stream_id = cs.id;

-- ============================================================
-- SEED DATA: Grading Scale (Kenya 8-4-4 style adapted)
-- ============================================================
INSERT INTO grading_scales (grade, min_percentage, max_percentage, points, description) VALUES
  ('A',   80, 100, 12.0, 'Excellent'),
  ('A-',  75,  79.99, 11.0, 'Very Good'),
  ('B+',  70,  74.99, 10.0, 'Good'),
  ('B',   65,  69.99,  9.0, 'Good'),
  ('B-',  60,  64.99,  8.0, 'Above Average'),
  ('C+',  55,  59.99,  7.0, 'Average'),
  ('C',   50,  54.99,  6.0, 'Average'),
  ('C-',  45,  49.99,  5.0, 'Below Average'),
  ('D+',  40,  44.99,  4.0, 'Below Average'),
  ('D',   35,  39.99,  3.0, 'Poor'),
  ('D-',  30,  34.99,  2.0, 'Poor'),
  ('E',    0,  29.99,  1.0, 'Fail')
ON CONFLICT DO NOTHING;

-- Seed Class Streams: Form 1A to Form 4C
INSERT INTO class_streams (name, form_level, stream_letter, capacity, academic_year) VALUES
  ('Form 1A', 1, 'A', 45, '2024/2025'),
  ('Form 1B', 1, 'B', 45, '2024/2025'),
  ('Form 1C', 1, 'C', 45, '2024/2025'),
  ('Form 2A', 2, 'A', 45, '2024/2025'),
  ('Form 2B', 2, 'B', 45, '2024/2025'),
  ('Form 2C', 2, 'C', 45, '2024/2025'),
  ('Form 3A', 3, 'A', 45, '2024/2025'),
  ('Form 3B', 3, 'B', 45, '2024/2025'),
  ('Form 3C', 3, 'C', 45, '2024/2025'),
  ('Form 4A', 4, 'A', 45, '2024/2025'),
  ('Form 4B', 4, 'B', 45, '2024/2025'),
  ('Form 4C', 4, 'C', 45, '2024/2025')
ON CONFLICT (name) DO NOTHING;

-- Seed default subjects
INSERT INTO subjects (code, name, is_compulsory, max_score) VALUES
  ('ENG', 'English Language', true, 100),
  ('KIS', 'Kiswahili', true, 100),
  ('MAT', 'Mathematics', true, 100),
  ('BIO', 'Biology', true, 100),
  ('PHY', 'Physics', false, 100),
  ('CHE', 'Chemistry', false, 100),
  ('HIS', 'History & Government', false, 100),
  ('GEO', 'Geography', false, 100),
  ('CRE', 'Christian Religious Education', false, 100),
  ('BUS', 'Business Studies', false, 100),
  ('ICT', 'Computer Studies', false, 100),
  ('ART', 'Art & Design', false, 100)
ON CONFLICT (code) DO NOTHING;

-- Seed exam types
INSERT INTO exam_types (name, type, weight, academic_year, term) VALUES
  ('CAT 1', 'CAT', 30, '2024/2025', 1),
  ('CAT 2', 'CAT', 30, '2024/2025', 1),
  ('End Term 1 Exam', 'Exam', 70, '2024/2025', 1),
  ('CAT 3', 'CAT', 30, '2024/2025', 2),
  ('CAT 4', 'CAT', 30, '2024/2025', 2),
  ('End Term 2 Exam', 'Exam', 70, '2024/2025', 2),
  ('CAT 5', 'CAT', 30, '2024/2025', 3),
  ('CAT 6', 'CAT', 30, '2024/2025', 3),
  ('End Term 3 Exam', 'Exam', 70, '2024/2025', 3)
ON CONFLICT DO NOTHING;
