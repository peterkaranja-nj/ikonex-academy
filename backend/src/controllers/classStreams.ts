import { Request, Response } from 'express';
import { query } from '../db';
import { success, error, asyncHandler } from '../utils/response';
import { ClassStream } from '../types';

export const getAllStreams = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await query<ClassStream & { student_count: number }>(`
    SELECT cs.*, COUNT(s.id)::int AS student_count
    FROM class_streams cs
    LEFT JOIN students s ON s.class_stream_id = cs.id AND s.status = 'Active'
    GROUP BY cs.id
    ORDER BY cs.form_level, cs.stream_letter
  `);
  return success(res, rows);
});

export const getStreamById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await query<ClassStream>(`
    SELECT cs.*, COUNT(s.id)::int AS student_count
    FROM class_streams cs
    LEFT JOIN students s ON s.class_stream_id = cs.id AND s.status = 'Active'
    WHERE cs.id = $1
    GROUP BY cs.id
  `, [id]);

  if (!rows.length) return error(res, 'Class stream not found', 404);
  return success(res, rows[0]);
});

export const createStream = asyncHandler(async (req: Request, res: Response) => {
  const { name, form_level, stream_letter, capacity, academic_year, class_teacher } = req.body;

  if (!name || !form_level || !stream_letter) {
    return error(res, 'name, form_level, and stream_letter are required', 400);
  }

  const { rows } = await query<ClassStream>(`
    INSERT INTO class_streams (name, form_level, stream_letter, capacity, academic_year, class_teacher)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [name, form_level, stream_letter, capacity || 45, academic_year || '2024/2025', class_teacher]);

  return success(res, rows[0], 'Class stream created successfully', 201);
});

export const updateStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, form_level, stream_letter, capacity, academic_year, class_teacher } = req.body;

  const { rows } = await query<ClassStream>(`
    UPDATE class_streams SET
      name = COALESCE($1, name),
      form_level = COALESCE($2, form_level),
      stream_letter = COALESCE($3, stream_letter),
      capacity = COALESCE($4, capacity),
      academic_year = COALESCE($5, academic_year),
      class_teacher = COALESCE($6, class_teacher)
    WHERE id = $7
    RETURNING *
  `, [name, form_level, stream_letter, capacity, academic_year, class_teacher, id]);

  if (!rows.length) return error(res, 'Class stream not found', 404);
  return success(res, rows[0], 'Class stream updated successfully');
});

export const deleteStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check for students
  const { rows: students } = await query('SELECT id FROM students WHERE class_stream_id = $1 LIMIT 1', [id]);
  if (students.length) {
    return error(res, 'Cannot delete class stream with enrolled students. Re-assign students first.', 400);
  }

  const { rowCount } = await query('DELETE FROM class_streams WHERE id = $1', [id]);
  if (!rowCount) return error(res, 'Class stream not found', 404);
  return success(res, null, 'Class stream deleted successfully');
});

export const getStreamStudents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await query(`
    SELECT s.*, cs.name AS class_name
    FROM students s
    JOIN class_streams cs ON s.class_stream_id = cs.id
    WHERE s.class_stream_id = $1
    ORDER BY s.last_name, s.first_name
  `, [id]);
  return success(res, rows);
});

export const getStreamSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await query(`
    SELECT css.*, sub.name AS subject_name, sub.code AS subject_code,
           sub.max_score, sub.is_compulsory
    FROM class_stream_subjects css
    JOIN subjects sub ON css.subject_id = sub.id
    WHERE css.class_stream_id = $1
    ORDER BY sub.is_compulsory DESC, sub.name
  `, [id]);
  return success(res, rows);
});

export const assignSubjectToStream = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject_id, teacher_name } = req.body;

  if (!subject_id) return error(res, 'subject_id is required', 400);

  const { rows } = await query(`
    INSERT INTO class_stream_subjects (class_stream_id, subject_id, teacher_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (class_stream_id, subject_id) DO UPDATE SET teacher_name = EXCLUDED.teacher_name
    RETURNING *
  `, [id, subject_id, teacher_name]);

  return success(res, rows[0], 'Subject assigned to class stream', 201);
});

export const removeSubjectFromStream = asyncHandler(async (req: Request, res: Response) => {
  const { id, subjectId } = req.params;
  const { rowCount } = await query(
    'DELETE FROM class_stream_subjects WHERE class_stream_id = $1 AND subject_id = $2',
    [id, subjectId]
  );
  if (!rowCount) return error(res, 'Assignment not found', 404);
  return success(res, null, 'Subject removed from class stream');
});
