import { Request, Response } from 'express';
import { query } from '../db';
import { success, error, paginated, asyncHandler } from '../utils/response';
import { Student } from '../types';

export const getAllStudents = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string || '';
  const classStreamId = req.query.class_stream_id as string;
  const status = req.query.status as string || 'Active';
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIdx = 1;

  if (status) {
    whereClause += ` AND s.status = $${paramIdx++}`;
    params.push(status);
  }
  if (classStreamId) {
    whereClause += ` AND s.class_stream_id = $${paramIdx++}`;
    params.push(classStreamId);
  }
  if (search) {
    whereClause += ` AND (
      s.first_name ILIKE $${paramIdx} OR
      s.last_name ILIKE $${paramIdx} OR
      s.admission_number ILIKE $${paramIdx}
    )`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  const countQuery = `SELECT COUNT(*) FROM students s ${whereClause}`;
  const dataQuery = `
    SELECT s.*, cs.name AS class_name, cs.form_level, cs.stream_letter
    FROM students s
    JOIN class_streams cs ON s.class_stream_id = cs.id
    ${whereClause}
    ORDER BY s.last_name, s.first_name
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const [countResult, dataResult] = await Promise.all([
    query(countQuery, params),
    query<Student>(dataQuery, [...params, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  return paginated(res, dataResult.rows, total, page, limit);
});

export const getStudentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await query<Student>(`
    SELECT s.*, cs.name AS class_name, cs.form_level, cs.stream_letter, cs.academic_year
    FROM students s
    JOIN class_streams cs ON s.class_stream_id = cs.id
    WHERE s.id = $1
  `, [id]);

  if (!rows.length) return error(res, 'Student not found', 404);
  return success(res, rows[0]);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const {
    admission_number, first_name, last_name, date_of_birth, gender,
    class_stream_id, guardian_name, guardian_phone, guardian_email,
    address, photo_url, status, admission_date
  } = req.body;

  // Required field validation
  if (!admission_number || !first_name || !last_name || !date_of_birth || !gender ||
      !class_stream_id || !guardian_name || !guardian_phone) {
    return error(res, 'Missing required fields', 400);
  }

  // Check admission number uniqueness
  const { rows: existing } = await query(
    'SELECT id FROM students WHERE admission_number = $1', [admission_number]
  );
  if (existing.length) {
    return error(res, 'Admission number already exists', 409);
  }

  // Verify class stream exists
  const { rows: stream } = await query('SELECT id, capacity FROM class_streams WHERE id = $1', [class_stream_id]);
  if (!stream.length) return error(res, 'Class stream not found', 404);

  const { rows } = await query<Student>(`
    INSERT INTO students (
      admission_number, first_name, last_name, date_of_birth, gender,
      class_stream_id, guardian_name, guardian_phone, guardian_email,
      address, photo_url, status, admission_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [
    admission_number, first_name, last_name, date_of_birth, gender,
    class_stream_id, guardian_name, guardian_phone, guardian_email || null,
    address || null, photo_url || null, status || 'Active', admission_date || new Date()
  ]);

  return success(res, rows[0], 'Student registered successfully', 201);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    first_name, last_name, date_of_birth, gender,
    class_stream_id, guardian_name, guardian_phone, guardian_email,
    address, photo_url, status, admission_date
  } = req.body;

  const { rows } = await query<Student>(`
    UPDATE students SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      date_of_birth = COALESCE($3, date_of_birth),
      gender = COALESCE($4, gender),
      class_stream_id = COALESCE($5, class_stream_id),
      guardian_name = COALESCE($6, guardian_name),
      guardian_phone = COALESCE($7, guardian_phone),
      guardian_email = COALESCE($8, guardian_email),
      address = COALESCE($9, address),
      photo_url = COALESCE($10, photo_url),
      status = COALESCE($11, status),
      admission_date = COALESCE($12, admission_date)
    WHERE id = $13
    RETURNING *
  `, [
    first_name, last_name, date_of_birth, gender,
    class_stream_id, guardian_name, guardian_phone, guardian_email,
    address, photo_url, status, admission_date, id
  ]);

  if (!rows.length) return error(res, 'Student not found', 404);
  return success(res, rows[0], 'Student updated successfully');
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM students WHERE id = $1', [id]);
  if (!rowCount) return error(res, 'Student not found', 404);
  return success(res, null, 'Student deleted successfully');
});

export const getStudentScores = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { academic_year, term } = req.query;

  let whereExtra = '';
  const params: any[] = [id];
  let idx = 2;

  if (academic_year) {
    whereExtra += ` AND et.academic_year = $${idx++}`;
    params.push(academic_year);
  }
  if (term) {
    whereExtra += ` AND et.term = $${idx++}`;
    params.push(term);
  }

  const { rows } = await query(`
    SELECT sc.*, sub.name AS subject_name, sub.code AS subject_code,
           et.name AS exam_name, et.type AS exam_type, et.term, et.academic_year,
           ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
    FROM scores sc
    JOIN subjects sub ON sc.subject_id = sub.id
    JOIN exam_types et ON sc.exam_type_id = et.id
    WHERE sc.student_id = $1 ${whereExtra}
    ORDER BY et.term, sub.name, et.name
  `, params);

  return success(res, rows);
});
