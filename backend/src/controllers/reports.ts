import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db';
import { asyncHandler, error } from '../utils/response';
import { getGradingScales } from '../utils/grading';
import type { GradingScale } from '../types';

function gradeSync(scales: GradingScale[], pct: number) {
  const s = scales.find(sc => pct >= sc.min_percentage && pct <= sc.max_percentage);
  return s
    ? { grade: s.grade, points: parseFloat(String(s.points)), description: s.description }
    : { grade: 'E', points: 1, description: 'Fail' };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Colors & Fonts ──────────────────────────────────────────
const BRAND_DARK = '#0f172a';
const BRAND_BLUE = '#1d4ed8';
const BRAND_ACCENT = '#f59e0b';
const BRAND_LIGHT = '#f8fafc';
const GRAY = '#64748b';
const LIGHT_GRAY = '#e2e8f0';
const SUCCESS = '#16a34a';
const DANGER = '#dc2626';

function gradeColor(grade: string): string {
  if (['A', 'A-'].includes(grade)) return SUCCESS;
  if (['B+', 'B', 'B-'].includes(grade)) return BRAND_BLUE;
  if (['C+', 'C', 'C-'].includes(grade)) return BRAND_ACCENT;
  return DANGER;
}

// ─── Shared Header ───────────────────────────────────────────
function drawHeader(doc: PDFKit.PDFDocument, subtitle: string) {
  // Banner
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND_DARK);

  // School name
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
    .text('IKONEX ACADEMY', 50, 18, { align: 'left' });
  doc.fillColor(BRAND_ACCENT).font('Helvetica').fontSize(10)
    .text('Excellence in Education', 50, 44);

  // Subtitle right side
  doc.fillColor('#ffffff').font('Helvetica').fontSize(11)
    .text(subtitle, 0, 30, { align: 'right', width: doc.page.width - 50 });

  // Gold accent bar
  doc.rect(0, 90, doc.page.width, 4).fill(BRAND_ACCENT);

  doc.y = 110;
}

function drawFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const y = doc.page.height - 40;
  doc.rect(0, y - 5, doc.page.width, 1).fill(LIGHT_GRAY);
  doc.fillColor(GRAY).font('Helvetica').fontSize(8)
    .text(`Ikonex Academy | Confidential | Generated ${new Date().toLocaleDateString()}`, 50, y, { align: 'left' })
    .text(`Page ${pageNum}`, 0, y, { align: 'right', width: doc.page.width - 50 });
}

// ─── Individual Report Card ──────────────────────────────────
export const generateStudentReportCard = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { academic_year = '2024/2025', term } = req.query;

  // Round 1: student + grading scales in parallel
  const [{ rows: studentRows }, scales] = await Promise.all([
    query(`
      SELECT s.*, cs.name AS class_name, cs.form_level
      FROM students s JOIN class_streams cs ON s.class_stream_id = cs.id
      WHERE s.id = $1
    `, [studentId]),
    getGradingScales(),
  ]);
  if (!studentRows.length) return error(res, 'Student not found', 404);
  const student = studentRows[0];

  let etFilter = 'AND et.academic_year = $2';
  const params: any[] = [studentId, academic_year];
  if (term) { etFilter += ' AND et.term = $3'; params.push(term); }

  // Round 2: scores + class rank in parallel
  const [{ rows: scores }, { rows: classRank }] = await Promise.all([
    query(`
      SELECT sc.score, sc.max_score, sub.name AS subject_name, sub.code AS subject_code,
             et.name AS exam_name, et.type AS exam_type,
             ROUND((sc.score / sc.max_score) * 100, 2) AS percentage
      FROM scores sc
      JOIN subjects sub ON sc.subject_id = sub.id
      JOIN exam_types et ON sc.exam_type_id = et.id
      WHERE sc.student_id = $1 ${etFilter}
      ORDER BY sub.name
    `, params),
    query(`
      SELECT COUNT(DISTINCT s2.id) + 1 AS position
      FROM students s2
      JOIN scores sc2 ON sc2.student_id = s2.id
      JOIN exam_types et2 ON sc2.exam_type_id = et2.id
      WHERE s2.class_stream_id = (SELECT class_stream_id FROM students WHERE id = $1)
        AND s2.id != $1 AND s2.status = 'Active'
        AND et2.academic_year = $2
      GROUP BY s2.id
      HAVING AVG(sc2.score / sc2.max_score) > (
        SELECT AVG(sc3.score / sc3.max_score) FROM scores sc3
        JOIN exam_types et3 ON sc3.exam_type_id = et3.id
        WHERE sc3.student_id = $1 AND et3.academic_year = $2
      )
    `, [studentId, academic_year]),
  ]);
  const position = classRank.length > 0 ? parseInt(classRank[0].position) : 1;

  // Aggregate by subject — sync grade lookup, no more await in loop
  const subjectMap = new Map<string, any>();
  for (const s of scores) {
    if (!subjectMap.has(s.subject_code)) {
      subjectMap.set(s.subject_code, { name: s.subject_name, code: s.subject_code, total: 0, max: 0 });
    }
    const sub = subjectMap.get(s.subject_code);
    sub.total += parseFloat(s.score);
    sub.max += parseFloat(s.max_score);
  }

  const subjects = [];
  let grandTotal = 0, grandMax = 0;
  for (const [, sub] of subjectMap) {
    const pct = sub.max > 0 ? (sub.total / sub.max) * 100 : 0;
    const grade = gradeSync(scales, pct);
    subjects.push({ ...sub, pct: Math.round(pct * 100) / 100, ...grade });
    grandTotal += sub.total;
    grandMax += sub.max;
  }

  const avgPct = grandMax > 0 ? (grandTotal / grandMax) * 100 : 0;
  const overallGrade = gradeSync(scales, avgPct);

  // Build PDF — single page A4
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  doc.on('error', (err) => { console.error('PDF stream error:', err.message); });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${student.admission_number}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;   // 595
  const L = 40;               // left margin
  const TW = W - L * 2;      // table width = 515

  // ── HEADER BANNER ────────────────────────────────────────────
  doc.rect(0, 0, W, 85).fill('#059669');

  // Circle logo area
  doc.circle(L + 24, 42, 24).fill('#10b981');
  doc.fillColor('#f59e0b').font('Helvetica-Bold').fontSize(11).text('IA', L + 15, 36);

  // School name
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
    .text('IKONEX ACADEMY', L + 58, 16, { lineBreak: false });
  doc.fillColor('#6ee7b7').font('Helvetica').fontSize(9)
    .text('P.O. Box 1234 · Nairobi, Kenya · info@ikonex.ac.ke', L + 58, 41);
  doc.fillColor('#a7f3d0').font('Helvetica').fontSize(8)
    .text('Tel: +254 700 000 000', L + 58, 54);

  // Right — document title
  doc.fillColor('#f59e0b').font('Helvetica-Bold').fontSize(11)
    .text('STUDENT REPORT CARD', 0, 18, { align: 'right', width: W - L });
  doc.fillColor('#d1fae5').font('Helvetica').fontSize(9)
    .text(`Academic Year: ${academic_year}${term ? `  |  Term ${term}` : ''}`, 0, 34, { align: 'right', width: W - L });
  doc.fillColor('#d1fae5').font('Helvetica').fontSize(9)
    .text(`Issued: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`, 0, 47, { align: 'right', width: W - L });

  // Gold accent bar
  doc.rect(0, 85, W, 4).fill('#f59e0b');

  // ── STUDENT INFO STRIP ───────────────────────────────────────
  doc.rect(0, 89, W, 62).fill('#f0fdf4');
  doc.rect(0, 89, 4, 62).fill('#059669');

  const si = 97; // info y start
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14)
    .text(`${student.first_name} ${student.last_name}`, L, si);

  // info grid
  const col2 = L + 180, col3 = L + 340;
  doc.fillColor('#475569').font('Helvetica').fontSize(9);
  doc.text(`Adm No:`, L, si + 20, { continued: true }).fillColor('#0f172a').font('Helvetica-Bold')
    .text(` ${student.admission_number}`);
  doc.fillColor('#475569').font('Helvetica')
    .text(`Class:`, L, si + 33, { continued: true }).fillColor('#0f172a').font('Helvetica-Bold')
    .text(` ${student.class_name}`);

  doc.fillColor('#475569').font('Helvetica').fontSize(9)
    .text(`Gender:`, col2, si + 20, { continued: true }).fillColor('#0f172a').font('Helvetica-Bold')
    .text(` ${student.gender}`);
  doc.fillColor('#475569').font('Helvetica')
    .text(`Date of Birth:`, col2, si + 33, { continued: true }).fillColor('#0f172a').font('Helvetica-Bold')
    .text(` ${new Date(student.date_of_birth).toLocaleDateString('en-KE')}`);

  doc.fillColor('#475569').font('Helvetica').fontSize(9)
    .text(`Class Position:`, col3, si + 20, { continued: true }).fillColor('#059669').font('Helvetica-Bold')
    .text(` ${ordinal(position)}`);
  doc.fillColor('#475569').font('Helvetica')
    .text(`Overall Grade:`, col3, si + 33, { continued: true })
    .fillColor(gradeColor(overallGrade.grade)).font('Helvetica-Bold')
    .text(` ${overallGrade.grade} — ${overallGrade.description}`);

  // ── SECTION TITLE ─────────────────────────────────────────────
  let y = 162;
  doc.fillColor('#059669').font('Helvetica-Bold').fontSize(9)
    .text('ACADEMIC PERFORMANCE SUMMARY', L, y);
  doc.rect(L, y + 13, TW, 1).fill('#e2e8f0');
  y += 18;

  // ── TABLE ─────────────────────────────────────────────────────
  const cols = [195, 60, 55, 75, 70, 60];
  const heads = ['Subject', 'Total', 'Max Marks', 'Percentage', 'Grade', 'Points'];
  const ROW_H = 19;

  // Table header
  doc.rect(L, y, TW, 22).fill('#0f172a');
  let cx = L + 6;
  heads.forEach((h, i) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
      .text(h, cx, y + 7, { width: cols[i] - 4, lineBreak: false });
    cx += cols[i];
  });
  y += 22;

  // Subject rows
  subjects.forEach((sub, idx) => {
    doc.rect(L, y, TW, ROW_H).fill(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
    // subtle left grade indicator
    doc.rect(L, y, 3, ROW_H).fill(gradeColor(sub.grade));

    cx = L + 6;
    const vals = [
      sub.name,
      sub.total.toFixed(1),
      sub.max.toFixed(0),
      `${sub.pct.toFixed(1)}%`,
      sub.grade,
      sub.points.toFixed(1),
    ];
    vals.forEach((v, i) => {
      const isGrade = i === 4;
      doc.fillColor(isGrade ? gradeColor(sub.grade) : '#1e293b')
        .font(isGrade ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .text(v, cx, y + 5, { width: cols[i] - 4, lineBreak: false });
      cx += cols[i];
    });
    y += ROW_H;
  });

  // Totals row
  doc.rect(L, y, TW, 22).fill('#059669');
  cx = L + 6;
  const totals = [
    'OVERALL PERFORMANCE',
    grandTotal.toFixed(1),
    grandMax.toFixed(0),
    `${avgPct.toFixed(1)}%`,
    overallGrade.grade,
    overallGrade.points.toFixed(1),
  ];
  totals.forEach((v, i) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text(v, cx, y + 7, { width: cols[i] - 4, lineBreak: false });
    cx += cols[i];
  });
  y += 22;

  // ── SUMMARY BOXES ─────────────────────────────────────────────
  y += 12;
  const boxW = (TW - 8) / 3;

  // Box helper
  const drawBox = (bx: number, label: string, value: string, valueColor: string, sub2?: string) => {
    doc.rect(bx, y, boxW, 58).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(bx, y, boxW, 3).fill('#059669');
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(label, bx + 8, y + 9);
    doc.fillColor(valueColor).font('Helvetica-Bold').fontSize(22).text(value, bx + 8, y + 20);
    if (sub2) doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(sub2, bx + 8, y + 44);
  };

  drawBox(L, 'CLASS POSITION', ordinal(position), '#059669', `out of ${student.total_students || '—'} students`);
  drawBox(L + boxW + 4, 'AVERAGE SCORE', `${avgPct.toFixed(1)}%`, '#0891b2', 'across all subjects');
  drawBox(L + (boxW + 4) * 2, 'OVERALL GRADE', overallGrade.grade, gradeColor(overallGrade.grade), overallGrade.description);
  y += 68;

  // ── REMARKS + SIGNATURE ───────────────────────────────────────
  y += 8;
  doc.rect(L, y, TW, 52).fill('#fffbeb').stroke('#fde68a');
  doc.rect(L, y, 3, 52).fill('#f59e0b');
  doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(8).text("CLASS TEACHER'S REMARKS", L + 10, y + 8);
  const remark = avgPct >= 70
    ? 'Excellent performance! Keep up the outstanding work and maintain this high standard.'
    : avgPct >= 55
    ? 'Good performance. There is room for improvement — focus on weaker subjects.'
    : 'Needs to work harder. Please seek extra assistance in areas of weakness.';
  doc.fillColor('#78350f').font('Helvetica').fontSize(9).text(remark, L + 10, y + 20, { width: TW - 20 });
  y += 62;

  // Signature line
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8);
  doc.text('Class Teacher: ______________________________', L, y + 8);
  doc.text('Principal: ______________________________', L + 260, y + 8);
  doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, L, y + 22);
  y += 32;

  // ── FOOTER ────────────────────────────────────────────────────
  const footerY = doc.page.height - 28;
  doc.rect(0, footerY - 4, W, 1).fill('#e2e8f0');
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
    .text('Ikonex Academy — Confidential Student Record', L, footerY, { lineBreak: false })
    .text(`Generated: ${new Date().toLocaleString('en-KE')}`, 0, footerY, { align: 'right', width: W - L });

  doc.end();
});

// ─── Class Performance PDF — single landscape A4 page ────────
export const generateClassReport = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { academic_year = '2024/2025', term } = req.query;

  let etFilter = 'AND et.academic_year = $2';
  const etParams: any[] = [classId, academic_year];
  if (term) { etFilter += ' AND et.term = $3'; etParams.push(term); }

  // Single parallel round — all 5 queries at once
  const [
    { rows: classRows },
    { rows: studentRows },
    { rows: subjects },
    { rows: scoreRows },
    scales,
  ] = await Promise.all([
    query('SELECT * FROM class_streams WHERE id = $1', [classId]),
    query(`
      SELECT s.id, s.admission_number, s.first_name || ' ' || s.last_name AS student_name
      FROM students s WHERE s.class_stream_id = $1 AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
    `, [classId]),
    query(`
      SELECT DISTINCT sub.id, sub.name, sub.code
      FROM subjects sub
      JOIN scores sc ON sc.subject_id = sub.id
      JOIN students s ON sc.student_id = s.id
      JOIN exam_types et ON sc.exam_type_id = et.id
      WHERE s.class_stream_id = $1 ${etFilter}
      ORDER BY sub.name
    `, etParams),
    query(`
      SELECT sc.student_id, sc.subject_id,
             SUM(sc.score::float) AS total_score,
             SUM(sc.max_score::float) AS total_max
      FROM scores sc
      JOIN students s ON sc.student_id = s.id
      JOIN exam_types et ON sc.exam_type_id = et.id
      WHERE s.class_stream_id = $1 ${etFilter}
      GROUP BY sc.student_id, sc.subject_id
    `, etParams),
    getGradingScales(),
  ]);

  if (!classRows.length) return error(res, 'Class not found', 404);
  const cls = classRows[0];

  // Build per-student summaries — sync grade lookup, no await in loop
  const scoreIndex = new Map<string, { total_score: string; total_max: string }>();
  for (const r of scoreRows) scoreIndex.set(`${r.student_id}:${r.subject_id}`, r);

  const summaries: any[] = [];
  for (const st of studentRows) {
    const subjectScores: Record<string, { score: number; max: number; pct: number }> = {};
    let grandTotal = 0, grandMax = 0;
    for (const sub of subjects) {
      const sr = scoreIndex.get(`${st.id}:${sub.id}`);
      if (sr && parseFloat(sr.total_max) > 0) {
        const score = parseFloat(sr.total_score);
        const max   = parseFloat(sr.total_max);
        subjectScores[sub.id] = { score, max, pct: (score / max) * 100 };
        grandTotal += score; grandMax += max;
      } else {
        subjectScores[sub.id] = { score: 0, max: 0, pct: 0 };
      }
    }
    const avgPct = grandMax > 0 ? (grandTotal / grandMax) * 100 : 0;
    const grade  = gradeSync(scales, avgPct);
    summaries.push({ ...st, subjectScores, grandTotal, grandMax, avgPct, ...grade });
  }
  summaries.sort((a, b) => b.avgPct - a.avgPct);
  summaries.forEach((s, i) => { s.position = i + 1; });

  // Subject-level statistics
  const subStats: Record<string, { highest: number; lowest: number; mean: number; pass: number; count: number }> = {};
  for (const sub of subjects) {
    const pcts = summaries.map(s => s.subjectScores[sub.id]?.pct ?? 0).filter(p => p > 0);
    subStats[sub.id] = {
      highest: pcts.length ? Math.max(...pcts) : 0,
      lowest:  pcts.length ? Math.min(...pcts) : 0,
      mean:    pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0,
      pass:    pcts.filter(p => p >= 50).length,
      count:   pcts.length,
    };
  }

  // ── PDF SETUP ────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: true });
  doc.on('error', (err) => { console.error('PDF stream error:', err.message); });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="class-report-${cls.name.replace(/ /g, '')}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;   // 841.89 (landscape)
  const H = doc.page.height;  // 595.28
  const L = 25;
  const TW = W - L * 2;      // ~792

  // Fixed-height budget for everything except student rows
  const BANNER_H  = 52;
  const GOLD_H    = 3;
  const INFO_H    = 22;
  const TH_H      = 17;  // table header
  const STAT_ROW_H= 12;  // each stat row (Highest / Lowest / Mean)
  const STAT_LBL_H= 12;  // "Subject Statistics" label strip
  const SCALE_LBL_H = 11; // "Grading Scale" label strip
  const SCALE_H   = 20;  // horizontal grading scale row
  const FOOTER_H  = 20;

  const FIXED_H = BANNER_H + GOLD_H + INFO_H + TH_H
                + STAT_LBL_H + 3 * STAT_ROW_H
                + SCALE_LBL_H + SCALE_H
                + FOOTER_H;            // ≈ 200pt

  const availForRows = H - FIXED_H;   // ≈ 395pt
  const ROW_H = summaries.length > 0
    ? Math.max(9, Math.min(14, availForRows / summaries.length))
    : 14;
  const rowFont = ROW_H <= 10 ? 6.5 : 7.5;

  // Dynamic column widths
  const FIXED_W = 22 + 55 + 42 + 38 + 36 + 32; // rank+adm+avg+grade+pts+pos = 225
  const subColW = Math.floor(Math.max(25, Math.min(46, (TW - FIXED_W - 80) / Math.max(subjects.length, 1))));
  const nameW   = Math.max(70, TW - FIXED_W - subColW * subjects.length);

  type Col = { key: string; label: string; w: number };
  const COLS: Col[] = [
    { key: 'rank',  label: '#',            w: 22     },
    { key: 'name',  label: 'Student Name', w: nameW  },
    { key: 'adm',   label: 'Adm No',       w: 55     },
    ...subjects.map(sub => ({
      key: sub.id,
      label: sub.code || sub.name.slice(0, 5).toUpperCase(),
      w: subColW,
    })),
    { key: 'avg',   label: 'Avg %',  w: 42 },
    { key: 'grade', label: 'Grade',  w: 38 },
    { key: 'pts',   label: 'Pts',    w: 36 },
    { key: 'pos',   label: 'Pos',    w: 32 },
  ];

  // ── BANNER ───────────────────────────────────────────────────
  doc.rect(0, 0, W, BANNER_H).fill('#059669');
  doc.circle(L + 18, BANNER_H / 2, 18).fill('#10b981');
  doc.fillColor('#f59e0b').font('Helvetica-Bold').fontSize(8).text('IA', L + 12, BANNER_H / 2 - 5);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17)
    .text('IKONEX ACADEMY', L + 44, 9, { lineBreak: false });
  doc.fillColor('#a7f3d0').font('Helvetica').fontSize(7.5)
    .text('P.O. Box 1234 · Nairobi, Kenya · info@ikonex.ac.ke', L + 44, 29);
  doc.fillColor('#f59e0b').font('Helvetica-Bold').fontSize(10)
    .text('CLASS PERFORMANCE REPORT', 0, 11, { align: 'right', width: W - L });
  doc.fillColor('#d1fae5').font('Helvetica').fontSize(8)
    .text(`${academic_year}${term ? ` | Term ${term}` : ''}`, 0, 26, { align: 'right', width: W - L });
  doc.fillColor('#d1fae5').font('Helvetica').fontSize(7.5)
    .text(`${summaries.length} students · ${subjects.length} subjects`, 0, 39, { align: 'right', width: W - L });
  doc.rect(0, BANNER_H, W, GOLD_H).fill('#f59e0b');

  // ── CLASS INFO STRIP ─────────────────────────────────────────
  let y = BANNER_H + GOLD_H;
  doc.rect(0, y, W, INFO_H).fill('#f0fdf4');
  doc.rect(0, y, 4, INFO_H).fill('#10b981');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12)
    .text(cls.name, L, y + 5, { lineBreak: false });
  const infoLine = [
    cls.class_teacher ? `Teacher: ${cls.class_teacher}` : '',
    `Year: ${academic_year}`,
    term ? `Term: ${term}` : '',
  ].filter(Boolean).join('   ·   ');
  doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
    .text(infoLine, L + 160, y + 7);
  y += INFO_H;

  // ── TABLE HEADER ─────────────────────────────────────────────
  doc.rect(L, y, TW, TH_H).fill('#0f172a');
  let cx = L + 3;
  COLS.forEach(col => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5)
      .text(col.label, cx, y + 5, { width: col.w - 2, lineBreak: false });
    cx += col.w;
  });
  y += TH_H;

  // ── STUDENT ROWS ─────────────────────────────────────────────
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    doc.rect(L, y, TW, ROW_H).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');
    doc.rect(L, y, 3, ROW_H).fill(gradeColor(s.grade));
    const ty = y + Math.max(1.5, (ROW_H - rowFont) / 2);
    cx = L + 3;
    COLS.forEach(col => {
      let val = '', color = '#1e293b', bold = false;
      if      (col.key === 'rank')  { val = String(s.position); color = '#94a3b8'; }
      else if (col.key === 'name')  { val = s.student_name; bold = true; }
      else if (col.key === 'adm')   { val = s.admission_number; color = '#64748b'; }
      else if (col.key === 'avg')   { val = `${s.avgPct.toFixed(1)}%`; bold = true; }
      else if (col.key === 'grade') { val = s.grade; color = gradeColor(s.grade); bold = true; }
      else if (col.key === 'pts')   { val = s.points.toFixed(1); }
      else if (col.key === 'pos')   { val = ordinal(s.position); }
      else {
        const sc = s.subjectScores[col.key];
        if (sc && sc.max > 0) {
          val   = `${sc.pct.toFixed(0)}%`;
          color = sc.pct >= 70 ? '#16a34a' : sc.pct >= 50 ? '#1e293b' : '#dc2626';
        } else { val = '—'; color = '#cbd5e1'; }
      }
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(rowFont)
        .text(val, cx, ty, { width: col.w - 2, lineBreak: false });
      cx += col.w;
    });
    y += ROW_H;
  }

  // ── SUBJECT STATISTICS (3 rows: Highest / Lowest / Mean) ─────
  doc.rect(L, y, TW, STAT_LBL_H).fill('#f0fdf4');
  doc.rect(L, y, 4, STAT_LBL_H).fill('#059669');
  doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7)
    .text('SUBJECT STATISTICS', L + 7, y + 3);
  y += STAT_LBL_H;

  const statDefs = [
    { label: 'Highest', color: '#16a34a', fn: (id: string) => subStats[id]?.count ? `${subStats[id].highest.toFixed(0)}%` : '—' },
    { label: 'Lowest',  color: '#dc2626', fn: (id: string) => subStats[id]?.count ? `${subStats[id].lowest.toFixed(0)}%`  : '—' },
    { label: 'Mean',    color: '#0891b2', fn: (id: string) => subStats[id]?.count ? `${subStats[id].mean.toFixed(0)}%`    : '—' },
  ];
  statDefs.forEach((sd, si) => {
    doc.rect(L, y, TW, STAT_ROW_H).fill(si % 2 === 0 ? '#f8fafc' : '#ffffff');
    cx = L + 3;
    COLS.forEach(col => {
      let val = '', color: string = '#94a3b8', bold = false;
      if (col.key === 'name') { val = sd.label; color = sd.color; bold = true; }
      else if (['rank', 'adm', 'avg', 'grade', 'pts', 'pos'].includes(col.key)) { val = ''; }
      else { val = sd.fn(col.key); color = sd.color; }
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
        .text(val, cx, y + 3, { width: col.w - 2, lineBreak: false });
      cx += col.w;
    });
    y += STAT_ROW_H;
  });

  // ── GRADING SCALE — single horizontal row ────────────────────
  doc.rect(L, y, TW, SCALE_LBL_H).fill('#f0fdf4');
  doc.rect(L, y, 4, SCALE_LBL_H).fill('#059669');
  doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7)
    .text('GRADING SCALE', L + 7, y + 3);
  y += SCALE_LBL_H;

  if (scales.length > 0) {
    const gsW = TW / scales.length;
    scales.forEach((gs: any, gi: number) => {
      const gx = L + gi * gsW;
      doc.rect(gx, y, gsW, SCALE_H)
        .fill(gi % 2 === 0 ? '#f8fafc' : '#ffffff')
        .stroke('#e2e8f0');
      doc.fillColor(gradeColor(gs.grade)).font('Helvetica-Bold').fontSize(8)
        .text(gs.grade, gx + 4, y + 3, { lineBreak: false, width: 16 });
      doc.fillColor('#475569').font('Helvetica').fontSize(6.5)
        .text(`${gs.min_percentage}–${gs.max_percentage}%`, gx + 21, y + 3, { lineBreak: false, width: gsW - 23 });
      if (gs.description) {
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(6)
          .text(gs.description, gx + 4, y + 12, { lineBreak: false, width: gsW - 8 });
      }
    });
  }
  y += SCALE_H;

  // ── FOOTER ───────────────────────────────────────────────────
  const footerY = H - FOOTER_H + 2;
  doc.rect(0, footerY - 2, W, 1).fill('#e2e8f0');
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
    .text('Ikonex Academy — Class Performance Report | Confidential', L, footerY + 4, { lineBreak: false })
    .text(`Generated: ${new Date().toLocaleString('en-KE')}`, 0, footerY + 4, { align: 'right', width: W - L });

  doc.end();
});
