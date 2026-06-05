import { Request, Response } from 'express';
import { query } from '../db';

export const getMissingScoresAlerts = async (_req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();

    type AlertRow = {
      stream_id: string; stream_name: string;
      exam_type_id: string; exam_type_name: string;
      term: string; year: number;
      total_students: string; scored_count: string; missing_count: string;
    };
    const { rows } = await query<AlertRow>(`
      SELECT
        cs.id            AS stream_id,
        cs.name          AS stream_name,
        et.id            AS exam_type_id,
        et.name          AS exam_type_name,
        et.term,
        et.year,
        COUNT(DISTINCT s.id)            AS total_students,
        COUNT(DISTINCT sc.student_id)   AS scored_count,
        COUNT(DISTINCT s.id)
          - COUNT(DISTINCT sc.student_id) AS missing_count
      FROM class_streams cs
      JOIN students s
        ON s.stream_id = cs.id AND s.status = 'Active'
      JOIN exam_types et
        ON et.year = $1
      LEFT JOIN scores sc
        ON sc.student_id = s.id AND sc.exam_type_id = et.id
      GROUP BY cs.id, cs.name, et.id, et.name, et.term, et.year
      HAVING
        COUNT(DISTINCT s.id) > COUNT(DISTINCT sc.student_id)
        AND COUNT(DISTINCT sc.student_id) > 0
      ORDER BY missing_count DESC, et.term
      LIMIT 20
    `, [currentYear]);

    res.json({
      success: true,
      data: rows.map(r => ({
        stream_id:      r.stream_id,
        stream_name:    r.stream_name,
        exam_type_id:   r.exam_type_id,
        exam_type_name: r.exam_type_name,
        term:           r.term,
        year:           r.year,
        total_students: parseInt(r.total_students),
        scored_count:   parseInt(r.scored_count),
        missing_count:  parseInt(r.missing_count),
      })),
    });
  } catch (err: any) {
    console.error('Notifications error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};
