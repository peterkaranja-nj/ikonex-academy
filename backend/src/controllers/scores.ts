import { Request, Response } from 'express';
import { query } from '../db';
import { success, error, asyncHandler } from '../utils/response';

export const recordScore = asyncHandler(async (req: Request, res: Response) => {
  const { student_id, subject_id, exam_type_id, score, max_score, remarks, entered_by } = req.body;

  if (!student_id || !subject_id || !exam_type_id || score === undefined) {
    return error(res, 'student_id, subject_id, exam_type_id, and score are required', 400);
  }
  if (score < 0) return error(res, 'Score cannot be negative', 400);

  // Validate subject max_score
  const { rows: subjectRows } = await query('SELECT max_score FROM subjects WHERE id = $1', [subject_id]);
  if (!subjectRows.length) return error(res, 'Subject not found', 404);
  const effectiveMax = max_score || subjectRows[0].max_score;
  if (score > effectiveMax) return error(res, `Score cannot exceed maximum of ${effectiveMax}`, 400);

  // Check for duplicate
  const { rows: existing } = await query(
    'SELECT id FROM scores WHERE student_id = $1 AND subject_id = $2 AND exam_type_id = $3',
    [student_id, subject_id, exam_type_id]
  );
  if (existing.length) {
    return error(res, 'Score already recorded. Use PUT to update.', 409);
  }

  const { rows } = await query(`
    INSERT INTO scores (student_id, subject_id, exam_type_id, score, max_score, remarks, entered_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [student_id, subject_id, exam_type_id, score, effectiveMax, remarks, entered_by]);

  return success(res, rows[0], 'Score recorded successfully', 201);
});

export const bulkRecordScores = asyncHandler(async (req: Request, res: Response) => {
  const { scores } = req.body; // array of score objects
  if (!Array.isArray(scores) || !scores.length) {
    return error(res, 'scores array is required', 400);
  }

  const results = [];
  const errors = [];

  for (const s of scores) {
    try {
      const { student_id, subject_id, exam_type_id, score, max_score, remarks, entered_by } = s;
      const { rows } = await query(`
        INSERT INTO scores (student_id, subject_id, exam_type_id, score, max_score, remarks, entered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (student_id, subject_id, exam_type_id)
        DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score,
                      remarks = EXCLUDED.remarks, updated_at = NOW()
        RETURNING *
      `, [student_id, subject_id, exam_type_id, score, max_score || 100, remarks, entered_by]);
      results.push(rows[0]);
    } catch (err: any) {
      errors.push({ entry: s, error: err.message });
    }
  }

  return success(res, { saved: results, errors }, `${results.length} scores saved, ${errors.length} errors`);
});

export const updateScore = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { score, max_score, remarks, entered_by } = req.body;

  const { rows } = await query(`
    UPDATE scores SET
      score = COALESCE($1, score),
      max_score = COALESCE($2, max_score),
      remarks = COALESCE($3, remarks),
      entered_by = COALESCE($4, entered_by),
      updated_at = NOW()
    WHERE id = $5 RETURNING *
  `, [score, max_score, remarks, entered_by, id]);

  if (!rows.length) return error(res, 'Score not found', 404);
  return success(res, rows[0], 'Score updated successfully');
});

export const deleteScore = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rowCount } = await query('DELETE FROM scores WHERE id = $1', [id]);
  if (!rowCount) return error(res, 'Score not found', 404);
  return success(res, null, 'Score deleted');
});

export const getExamTypes = asyncHandler(async (req: Request, res: Response) => {
  const { term, academic_year } = req.query;
  let where = 'WHERE 1=1';
  const params: any[] = [];
  let idx = 1;
  if (term) { where += ` AND term = $${idx++}`; params.push(term); }
  if (academic_year) { where += ` AND academic_year = $${idx++}`; params.push(academic_year); }

  const { rows } = await query(`SELECT * FROM exam_types ${where} ORDER BY term, name`, params);
  return success(res, rows);
});

export const createExamType = asyncHandler(async (req: Request, res: Response) => {
  const { name, type, weight, academic_year, term } = req.body;
  if (!name || !type) return error(res, 'name and type are required', 400);

  const { rows } = await query(`
    INSERT INTO exam_types (name, type, weight, academic_year, term)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [name, type, weight || 100, academic_year || '2024/2025', term || 1]);

  return success(res, rows[0], 'Exam type created', 201);
});

export const getClassSubjectScores = asyncHandler(async (req: Request, res: Response) => {
  const { classId, subjectId } = req.params;
  const { exam_type_id } = req.query;

  let where = 'WHERE s.class_stream_id = $1 AND sc.subject_id = $2';
  const params: any[] = [classId, subjectId];
  if (exam_type_id) {
    where += ` AND sc.exam_type_id = $3`;
    params.push(exam_type_id);
  }

  const { rows } = await query(`
    SELECT sc.*, s.first_name, s.last_name, s.admission_number,
           s.first_name || ' ' || s.last_name AS student_name,
           et.name AS exam_name, et.type AS exam_type, et.term,
           ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
    FROM scores sc
    JOIN students s ON sc.student_id = s.id
    JOIN exam_types et ON sc.exam_type_id = et.id
    ${where}
    ORDER BY sc.score DESC
  `, params);

  return success(res, rows);
});
