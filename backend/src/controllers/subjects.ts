import { Request, Response } from 'express';
import { query } from '../db';
import { success, error, asyncHandler } from '../utils/response';
import { Subject } from '../types';

export const getAllSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await query<Subject>(`
    SELECT * FROM subjects ORDER BY is_compulsory DESC, name
  `);
  return success(res, rows);
});

export const getSubjectById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await query<Subject>('SELECT * FROM subjects WHERE id = $1', [id]);
  if (!rows.length) return error(res, 'Subject not found', 404);
  return success(res, rows[0]);
});

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const { code, name, description, is_compulsory, max_score } = req.body;
  if (!code || !name) return error(res, 'code and name are required', 400);

  const { rows } = await query<Subject>(`
    INSERT INTO subjects (code, name, description, is_compulsory, max_score)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [code.toUpperCase(), name, description, is_compulsory ?? true, max_score || 100]);

  return success(res, rows[0], 'Subject created successfully', 201);
});

export const updateSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, description, is_compulsory, max_score } = req.body;

  const { rows } = await query<Subject>(`
    UPDATE subjects SET
      code = COALESCE($1, code),
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      is_compulsory = COALESCE($4, is_compulsory),
      max_score = COALESCE($5, max_score)
    WHERE id = $6 RETURNING *
  `, [code, name, description, is_compulsory, max_score, id]);

  if (!rows.length) return error(res, 'Subject not found', 404);
  return success(res, rows[0], 'Subject updated successfully');
});

export const deleteSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows: scores } = await query('SELECT id FROM scores WHERE subject_id = $1 LIMIT 1', [id]);
  if (scores.length) return error(res, 'Cannot delete subject with existing scores', 400);

  const { rowCount } = await query('DELETE FROM subjects WHERE id = $1', [id]);
  if (!rowCount) return error(res, 'Subject not found', 404);
  return success(res, null, 'Subject deleted successfully');
});
