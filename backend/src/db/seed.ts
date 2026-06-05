import 'dotenv/config';
import { pool, query } from './index';

// ─── Name pools ────────────────────────────────────────────────
const MALE_NAMES   = ['James','John','Peter','David','Michael','Joseph','Daniel','Samuel','George','Robert','Paul','Anthony','Charles','Francis','Kevin','Brian','Dennis','Mark','Eric','Stephen','Alex','Victor','Philip','Geoffrey','Kelvin','Allan','Andrew','Bernard','Douglas','Leonard'];
const FEMALE_NAMES = ['Grace','Faith','Mary','Anne','Sarah','Esther','Alice','Joy','Lydia','Mercy','Eunice','Ruth','Naomi','Judith','Winnie','Janet','Betty','Carol','Rose','Joyce','Wanjiru','Akinyi','Chebet','Amina','Zawadi','Blessing','Gloria','Irene','Pauline','Agnes'];
const LAST_NAMES   = ['Kamau','Wanjiku','Ochieng','Otieno','Kiprotich','Mwangi','Njoroge','Kariuki','Mutua','Gitonga','Ndungu','Karanja','Maina','Kiptoo','Cheruiyot','Kibet','Achieng','Omondi','Were','Simiyu','Barasa','Wafula','Nekesa','Muthoni','Njeru','Wangari','Kimani','Mugo','Onyango','Ogolla','Makori','Magero','Langat','Ruto','Ndirangu'];
const GUARDIAN_FIRST = ['John','Peter','Mary','Sarah','James','Grace','Paul','Jane'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

type Tier = 'A'|'B'|'C'|'D'|'E';
function randomTier(): Tier {
  const r = Math.random();
  if (r < 0.10) return 'A';
  if (r < 0.30) return 'B';
  if (r < 0.62) return 'C';
  if (r < 0.85) return 'D';
  return 'E';
}
function tierBase(t: Tier) {
  return t==='A'?{base:83,spread:7}: t==='B'?{base:71,spread:7}: t==='C'?{base:58,spread:8}: t==='D'?{base:45,spread:7}: {base:33,spread:9};
}
function genScore(base: number, spread: number, maxScore: number): number {
  const raw = base + (Math.random() - 0.5) * 2 * spread;
  return Math.round(clamp(raw * (maxScore / 100), 0, maxScore) * 10) / 10;
}

// ─── Reference data ────────────────────────────────────────────
async function ensureReferenceData() {
  // Grading scales
  const { rows: gs } = await query('SELECT COUNT(*) AS c FROM grading_scales');
  if (parseInt(gs[0].c) === 0) {
    console.log('  → Inserting grading scales…');
    await query(`
      INSERT INTO grading_scales (grade,min_percentage,max_percentage,points,description) VALUES
        ('A',  80,100,  12,'Excellent'),('A-',75,79.99,11,'Very Good'),
        ('B+', 70,74.99,10,'Good'),    ('B', 65,69.99, 9,'Good'),
        ('B-', 60,64.99, 8,'Above Average'),('C+',55,59.99,7,'Average'),
        ('C',  50,54.99, 6,'Average'), ('C-',45,49.99, 5,'Below Average'),
        ('D+', 40,44.99, 4,'Below Average'),('D',35,39.99,3,'Poor'),
        ('D-', 30,34.99, 2,'Poor'),    ('E', 0, 29.99, 1,'Fail')
      ON CONFLICT DO NOTHING`);
  }

  // Class streams
  const { rows: cs } = await query('SELECT COUNT(*) AS c FROM class_streams');
  if (parseInt(cs[0].c) === 0) {
    console.log('  → Inserting class streams…');
    await query(`
      INSERT INTO class_streams (name,form_level,stream_letter,capacity,academic_year) VALUES
        ('Form 1A',1,'A',45,'2025/2026'),('Form 1B',1,'B',45,'2025/2026'),('Form 1C',1,'C',45,'2025/2026'),
        ('Form 2A',2,'A',45,'2025/2026'),('Form 2B',2,'B',45,'2025/2026'),('Form 2C',2,'C',45,'2025/2026'),
        ('Form 3A',3,'A',45,'2025/2026'),('Form 3B',3,'B',45,'2025/2026'),('Form 3C',3,'C',45,'2025/2026'),
        ('Form 4A',4,'A',45,'2025/2026'),('Form 4B',4,'B',45,'2025/2026'),('Form 4C',4,'C',45,'2025/2026')
      ON CONFLICT (name) DO NOTHING`);
  }

  // Subjects
  const { rows: sub } = await query('SELECT COUNT(*) AS c FROM subjects');
  if (parseInt(sub[0].c) === 0) {
    console.log('  → Inserting subjects…');
    await query(`
      INSERT INTO subjects (code,name,is_compulsory,max_score) VALUES
        ('ENG','English Language',true,100),('KIS','Kiswahili',true,100),
        ('MAT','Mathematics',true,100),    ('BIO','Biology',true,100),
        ('PHY','Physics',false,100),       ('CHE','Chemistry',false,100),
        ('HIS','History & Government',false,100),('GEO','Geography',false,100),
        ('CRE','Christian Religious Education',false,100),('BUS','Business Studies',false,100),
        ('ICT','Computer Studies',false,100),('ART','Art & Design',false,100)
      ON CONFLICT (code) DO NOTHING`);
  }

  // Exam types
  const { rows: et } = await query('SELECT COUNT(*) AS c FROM exam_types');
  if (parseInt(et[0].c) === 0) {
    console.log('  → Inserting exam types…');
    await query(`
      INSERT INTO exam_types (name,type,weight,academic_year,term) VALUES
        ('CAT 1','CAT',30,'2025/2026',1),('CAT 2','CAT',30,'2025/2026',1),
        ('End Term 1 Exam','Exam',70,'2025/2026',1),
        ('CAT 3','CAT',30,'2025/2026',2),('CAT 4','CAT',30,'2025/2026',2),
        ('End Term 2 Exam','Exam',70,'2025/2026',2),
        ('CAT 5','CAT',30,'2025/2026',3),('CAT 6','CAT',30,'2025/2026',3),
        ('End Term 3 Exam','Exam',70,'2025/2026',3)
      ON CONFLICT DO NOTHING`);
  }
}

// ─── Main seed ─────────────────────────────────────────────────
async function seed() {
  console.log('🌱  Seeding Ikonex Academy demo data…');

  await ensureReferenceData();

  // Guard: skip student/score seeding if already seeded
  const { rows: chk } = await query<{count:string}>('SELECT COUNT(*) AS count FROM students');
  if (parseInt(chk[0].count) >= 10) {
    console.log(`ℹ️   ${chk[0].count} students already present — skipping student seed.`);
    return;
  }

  const { rows: streams }   = await query('SELECT id, name, form_level FROM class_streams ORDER BY form_level, stream_letter');
  const { rows: subjects }  = await query('SELECT id, code FROM subjects ORDER BY is_compulsory DESC, name');
  const { rows: examTypes } = await query("SELECT id, name, type FROM exam_types WHERE term = 1 ORDER BY name");

  if (!streams.length || !subjects.length || !examTypes.length) {
    console.error('❌  Reference data still missing after ensure — aborting student seed.');
    return;
  }

  const subjectByCode = new Map(subjects.map(s => [s.code as string, s.id as string]));
  const STREAM_SUBJECTS = ['ENG','KIS','MAT','BIO','PHY','CHE','HIS','GEO'];
  const streamSubjectIds = STREAM_SUBJECTS.map(c => subjectByCode.get(c)!).filter(Boolean);

  // Assign subjects to all streams
  console.log('  → Assigning subjects to streams…');
  for (const st of streams) {
    for (const sid of streamSubjectIds) {
      await query(`INSERT INTO class_stream_subjects (class_stream_id,subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [st.id, sid]);
    }
  }

  // Create students
  console.log('  → Creating students…');
  const STUDENTS_PER_STREAM = 7;
  let seq = 1;
  interface StudentEntry { id: string; tier: Tier }
  const roster: StudentEntry[] = [];

  for (const st of streams) {
    const cohortYear = 2026 - st.form_level;
    const birthYear  = 2007 + (4 - st.form_level);
    for (let i = 0; i < STUDENTS_PER_STREAM; i++) {
      const gender    = Math.random() < 0.5 ? 'Male' : 'Female';
      const firstName = gender === 'Male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
      const lastName  = pick(LAST_NAMES);
      const admNo     = `IKA/${cohortYear}/${String(seq).padStart(3,'0')}`;
      const dob       = `${birthYear}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`;
      const admDate   = `${cohortYear}-01-${String(randInt(10,25)).padStart(2,'0')}`;
      const guardianName  = `${pick(GUARDIAN_FIRST)} ${lastName}`;
      const guardianPhone = `07${randInt(10,99)}${randInt(100000,999999)}`;
      const tier = randomTier();

      const { rows } = await query(
        `INSERT INTO students (admission_number,first_name,last_name,date_of_birth,gender,class_stream_id,guardian_name,guardian_phone,admission_date,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')
         ON CONFLICT (admission_number) DO NOTHING RETURNING id`,
        [admNo,firstName,lastName,dob,gender,st.id,guardianName,guardianPhone,admDate]
      );
      if (rows.length) roster.push({ id: rows[0].id, tier });
      seq++;
    }
  }

  // Record scores
  console.log(`  → Recording scores for ${roster.length} students…`);
  let scoreCount = 0;
  for (const student of roster) {
    const { base, spread } = tierBase(student.tier);
    for (const subjectId of streamSubjectIds) {
      const talent = 0.85 + Math.random() * 0.30;
      for (const et of examTypes) {
        const isCAT   = et.type === 'CAT';
        const maxScore = isCAT ? 30 : 100;
        const score   = genScore(base * talent, spread, maxScore);
        await query(
          `INSERT INTO scores (student_id,subject_id,exam_type_id,score,max_score,entered_by)
           VALUES ($1,$2,$3,$4,$5,'System Seed') ON CONFLICT DO NOTHING`,
          [student.id, subjectId, et.id, score, maxScore]
        );
        scoreCount++;
      }
    }
  }
  console.log(`✅  Seed complete — ${roster.length} students, ${scoreCount} scores.`);
}

export async function runSeed(): Promise<void> {
  try {
    await seed();
  } catch (err) {
    console.error('❌  Seed error:', err);
  }
}

if (require.main === module) {
  (async () => { await runSeed(); await pool.end(); process.exit(0); })();
}
