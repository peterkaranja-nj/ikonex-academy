import { Request, Response } from 'express';
import { query } from '../db';
import { success, error, asyncHandler } from '../utils/response';
import { getGrade, calcPosition } from '../utils/grading';

export const getStudentResults = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { academic_year, term } = req.query;

  // Get student info
  const { rows: studentRows } = await query(`
    SELECT s.*, cs.name AS class_name, cs.form_level, cs.stream_letter
    FROM students s JOIN class_streams cs ON s.class_stream_id = cs.id
    WHERE s.id = $1
  `, [studentId]);

  if (!studentRows.length) return error(res, 'Student not found', 404);
  const student = studentRows[0];

  // Build filter
  let etFilter = 'WHERE sc.student_id = $1';
  const params: any[] = [studentId];
  let idx = 2;
  if (academic_year) { etFilter += ` AND et.academic_year = $${idx++}`; params.push(academic_year); }
  if (term) { etFilter += ` AND et.term = $${idx++}`; params.push(term); }

  // Get all scores
  const { rows: scores } = await query(`
    SELECT sc.score, sc.max_score, sub.id AS subject_id, sub.name AS subject_name,
           sub.code AS subject_code, et.name AS exam_name, et.type AS exam_type,
           et.term, et.weight, ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
    FROM scores sc
    JOIN subjects sub ON sc.subject_id = sub.id
    JOIN exam_types et ON sc.exam_type_id = et.id
    ${etFilter}
    ORDER BY sub.name, et.term, et.name
  `, params);

  // Group by subject
  const subjectMap = new Map<string, any>();
  for (const s of scores) {
    if (!subjectMap.has(s.subject_id)) {
      subjectMap.set(s.subject_id, {
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        subject_code: s.subject_code,
        assessments: [],
        total: 0,
        max_total: 0,
      });
    }
    const subj = subjectMap.get(s.subject_id);
    subj.assessments.push(s);
    subj.total += parseFloat(s.score);
    subj.max_total += parseFloat(s.max_score);
  }

  // Compute grades per subject
  const subjectResults = [];
  let grandTotal = 0;
  let grandMax = 0;

  for (const [, subj] of subjectMap) {
    const pct = subj.max_total > 0 ? (subj.total / subj.max_total) * 100 : 0;
    const gradeInfo = await getGrade(pct);
    subjectResults.push({
      ...subj,
      percentage: Math.round(pct * 100) / 100,
      grade: gradeInfo.grade,
      points: gradeInfo.points,
    });
    grandTotal += subj.total;
    grandMax += subj.max_total;
  }

  const avgPct = grandMax > 0 ? (grandTotal / grandMax) * 100 : 0;
  const overallGrade = await getGrade(avgPct);

  return success(res, {
    student,
    subjects: subjectResults,
    summary: {
      total_score: Math.round(grandTotal * 100) / 100,
      total_max: Math.round(grandMax * 100) / 100,
      average_percentage: Math.round(avgPct * 100) / 100,
      grade: overallGrade.grade,
      points: overallGrade.points,
    },
  });
});

export const getClassResults = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { academic_year, term } = req.query;

  // Get all students in class
  const { rows: students } = await query(`
    SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name AS student_name
    FROM students s
    WHERE s.class_stream_id = $1 AND s.status = 'Active'
    ORDER BY s.last_name, s.first_name
  `, [classId]);

  if (!students.length) return success(res, []);

  let etFilter = '';
  const params: any[] = [classId];
  let idx = 2;
  if (academic_year) { etFilter += ` AND et.academic_year = $${idx++}`; params.push(academic_year); }
  if (term) { etFilter += ` AND et.term = $${idx++}`; params.push(term); }

  // Get all scores for class
  const { rows: allScores } = await query(`
    SELECT sc.student_id, sc.score, sc.max_score, sub.id AS subject_id, sub.name AS subject_name,
           ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
    FROM scores sc
    JOIN students s ON sc.student_id = s.id
    JOIN subjects sub ON sc.subject_id = sub.id
    JOIN exam_types et ON sc.exam_type_id = et.id
    WHERE s.class_stream_id = $1 ${etFilter}
  `, params);

  // Build per-student summaries
  const studentSummaries: Array<any> = [];

  for (const st of students) {
    const studentScores = allScores.filter((s) => s.student_id === st.id);
    const subjectIds = new Set(studentScores.map((s) => s.subject_id));
    const total = studentScores.reduce((sum, s) => sum + parseFloat(s.score), 0);
    const max = studentScores.reduce((sum, s) => sum + parseFloat(s.max_score), 0);
    const avgPct = max > 0 ? (total / max) * 100 : 0;
    const gradeInfo = await getGrade(avgPct);

    // Sum points per subject (one grade per subject)
    let totalPoints = 0;
    for (const subjId of subjectIds) {
      const subjScores = studentScores.filter((s) => s.subject_id === subjId);
      const subjTotal = subjScores.reduce((sum, s) => sum + parseFloat(s.score), 0);
      const subjMax = subjScores.reduce((sum, s) => sum + parseFloat(s.max_score), 0);
      const subjPct = subjMax > 0 ? (subjTotal / subjMax) * 100 : 0;
      const subjGrade = await getGrade(subjPct);
      totalPoints += parseFloat(String(subjGrade.points));
    }

    studentSummaries.push({
      student_id: st.id,
      student_name: st.student_name,
      admission_number: st.admission_number,
      subjects_count: subjectIds.size,
      total_marks: Math.round(total * 100) / 100,
      average_score: Math.round(avgPct * 100) / 100,
      total_points: Math.round(totalPoints * 10) / 10,
      grade: gradeInfo.grade,
      points: gradeInfo.points,
    });
  }

  // Rank by average percentage
  studentSummaries.sort((a, b) => b.average_score - a.average_score);
  const ranked = studentSummaries.map((s, idx) => ({ ...s, position: idx + 1 }));

  return success(res, ranked);
});

export const getSubjectClassPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { classId, subjectId } = req.params;
  const { exam_type_id } = req.query;

  let filter = 'AND s.class_stream_id = $2 AND sc.subject_id = $3';
  const params: any[] = [subjectId, classId, subjectId];
  if (exam_type_id) { filter += ` AND sc.exam_type_id = $4`; params.push(exam_type_id); }

  const { rows } = await query(`
    SELECT s.id AS student_id, s.admission_number,
           s.first_name || ' ' || s.last_name AS student_name,
           ROUND(AVG(sc.score), 2) AS avg_score,
           ROUND(AVG((sc.score / sc.max_score) * 100), 2) AS avg_percentage,
           SUM(sc.score) AS total_score,
           MAX(sc.max_score) AS max_score
    FROM scores sc
    JOIN students s ON sc.student_id = s.id
    WHERE sc.subject_id = $1 ${filter.replace('AND s.class_stream_id = $2 AND sc.subject_id = $3', 'AND s.class_stream_id = $2')}
    GROUP BY s.id, s.admission_number, s.first_name, s.last_name
    ORDER BY avg_percentage DESC
  `, [subjectId, classId]);

  const withPositions = rows.map((r, i) => ({ ...r, position: i + 1 }));
  return success(res, withPositions);
});
