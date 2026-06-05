import { Router } from 'express';
import * as streams from '../controllers/classStreams';
import * as students from '../controllers/students';
import * as subjects from '../controllers/subjects';
import * as scores from '../controllers/scores';
import * as results from '../controllers/results';
import * as reports from '../controllers/reports';
import * as notifications from '../controllers/notifications';

const router = Router();

// ─── Class Streams ────────────────────────────────────────────
router.get('/streams', streams.getAllStreams);
router.get('/streams/:id', streams.getStreamById);
router.post('/streams', streams.createStream);
router.put('/streams/:id', streams.updateStream);
router.delete('/streams/:id', streams.deleteStream);
router.get('/streams/:id/students', streams.getStreamStudents);
router.get('/streams/:id/subjects', streams.getStreamSubjects);
router.post('/streams/:id/subjects', streams.assignSubjectToStream);
router.delete('/streams/:id/subjects/:subjectId', streams.removeSubjectFromStream);

// ─── Students ────────────────────────────────────────────────
router.get('/students', students.getAllStudents);
router.get('/students/:id', students.getStudentById);
router.post('/students', students.createStudent);
router.put('/students/:id', students.updateStudent);
router.delete('/students/:id', students.deleteStudent);
router.get('/students/:id/scores', students.getStudentScores);

// ─── Subjects ────────────────────────────────────────────────
router.get('/subjects', subjects.getAllSubjects);
router.get('/subjects/:id', subjects.getSubjectById);
router.post('/subjects', subjects.createSubject);
router.put('/subjects/:id', subjects.updateSubject);
router.delete('/subjects/:id', subjects.deleteSubject);

// ─── Scores / Assessments ────────────────────────────────────
router.get('/exam-types', scores.getExamTypes);
router.post('/exam-types', scores.createExamType);
router.post('/scores', scores.recordScore);
router.post('/scores/bulk', scores.bulkRecordScores);
router.put('/scores/:id', scores.updateScore);
router.delete('/scores/:id', scores.deleteScore);
router.get('/scores/class/:classId/subject/:subjectId', scores.getClassSubjectScores);

// ─── Results Processing ───────────────────────────────────────
router.get('/results/student/:studentId', results.getStudentResults);
router.get('/results/class/:classId', results.getClassResults);
router.get('/results/class/:classId/subject/:subjectId', results.getSubjectClassPerformance);

// ─── Reports (PDF) ────────────────────────────────────────────
router.get('/reports/student/:studentId/report-card', reports.generateStudentReportCard);
router.get('/reports/class/:classId', reports.generateClassReport);

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications/missing-scores', notifications.getMissingScoresAlerts);

export default router;
