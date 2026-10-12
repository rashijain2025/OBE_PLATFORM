process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User, Department, Programme, Course, CourseOutcome, Assessment, Question, CourseEnrollment, StudentMarks } = require('../models');

describe('Phase 5 CO Attainment & Faculty Reports Tests', () => {
  let facultyAToken, facultyBToken, adminToken;
  let facultyAId, facultyBId;
  let dbmsCourse, courseB;
  let co1, co2, co3;
  let cieAssessment;
  let q_co1, q_co2, q_co3;
  let riyaStudent;
  const testStudents = [];

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    // 1. Log in
    const [loginAdmin, loginFaculty1, loginFaculty2] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@obe.edu', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'faculty1@obe.edu', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'faculty2@obe.edu', password: 'Password@123' }),
    ]);

    adminToken = loginAdmin.body.data.token;
    facultyAToken = loginFaculty1.body.data.token;
    facultyBToken = loginFaculty2.body.data.token;

    facultyAId = loginFaculty1.body.data.user._id;
    facultyBId = loginFaculty2.body.data.user._id;

    // 2. Setup Programme
    let programme = await Programme.findOne({ code: 'BTECH-IT' });
    if (!programme) {
      let dept = await Department.findOne({ code: 'IT' });
      if (!dept) {
        dept = await Department.create({ name: 'Information Technology', code: 'IT' });
      }
      programme = await Programme.create({ name: 'B.Tech IT', code: 'BTECH-IT', department: dept._id });
    }

    // Clean up test courses
    await Course.deleteMany({ code: { $in: ['DBMS-301', 'OTHER-402'] } });

    // 3. Create DBMS Course for Faculty A
    dbmsCourse = await Course.create({
      code: 'DBMS-301',
      name: 'Database Management Systems',
      semester: 4,
      programme: programme._id,
      faculty: facultyAId,
      academicYear: '2025-2026',
      credits: 4,
    });

    courseB = await Course.create({
      code: 'OTHER-402',
      name: 'Compiler Design',
      semester: 6,
      programme: programme._id,
      faculty: facultyBId,
      academicYear: '2025-2026',
      credits: 4,
    });

    // 4. Create COs: CO1, CO2, CO3 on DBMS course
    co1 = await CourseOutcome.create({
      course: dbmsCourse._id,
      code: 'CO1',
      statement: 'Design relational database schemas using normalization principles',
      bloomLevel: 'L3: Apply',
    });

    co2 = await CourseOutcome.create({
      course: dbmsCourse._id,
      code: 'CO2',
      statement: 'Formulate complex relational algebra and SQL queries',
      bloomLevel: 'L4: Analyze',
    });

    co3 = await CourseOutcome.create({
      course: dbmsCourse._id,
      code: 'CO3',
      statement: 'Analyze transaction concurrency control and recovery protocols',
      bloomLevel: 'L4: Analyze',
    });

    // 5. Create Assessment & Questions
    cieAssessment = await Assessment.create({
      course: dbmsCourse._id,
      name: 'Mid-Semester Exam',
      type: 'internal',
      maxMarks: 30,
      weightage: 1.0,
    });

    q_co1 = await Question.create({
      assessment: cieAssessment._id,
      course: dbmsCourse._id,
      label: 'Q1',
      maxMarks: 10,
      co: co1._id,
    });

    q_co2 = await Question.create({
      assessment: cieAssessment._id,
      course: dbmsCourse._id,
      label: 'Q2',
      maxMarks: 10,
      co: co2._id,
    });

    q_co3 = await Question.create({
      assessment: cieAssessment._id,
      course: dbmsCourse._id,
      label: 'Q3',
      maxMarks: 10,
      co: co3._id,
    });

    // 6. Setup 10 Students (Student 1 is Riya Sharma)
    // First fetch or create Riya
    riyaStudent = await User.findOneAndUpdate(
      { email: 'riya.sharma@student.obe.edu' },
      { name: 'Riya Sharma', email: 'riya.sharma@student.obe.edu', rollNo: '22IT099', role: 'student', isActive: true },
      { upsert: true, new: true }
    );
    testStudents.push(riyaStudent);

    // Fetch existing students from seed to make total 10
    const seedStudents = await User.find({ role: 'student', _id: { $ne: riyaStudent._id } }).limit(9);
    for (const s of seedStudents) {
      testStudents.push(s);
    }

    // 7. Enroll all 10 students into DBMS course
    for (const student of testStudents) {
      await CourseEnrollment.findOneAndUpdate(
        { course: dbmsCourse._id, student: student._id },
        { course: dbmsCourse._id, student: student._id, status: 'active' },
        { upsert: true, new: true }
      );
    }

    // 8. Seed Marks to achieve: CO1 = 70%, CO2 = 70%, CO3 = 40% (Target threshold = 40% by default, or 50%)
    //
    // For 10 students (Target mark = 40% -> 4 marks out of 10):
    // - CO1: 7 students score 8/10 (>= 40% -> attained), 3 students score 2/10 (< 40% -> not attained) => 7/10 = 70%
    // - CO2: 7 students score 7/10 (>= 40% -> attained), 3 students score 3/10 (< 40% -> not attained) => 7/10 = 70%
    // - CO3: 4 students score 8/10 (>= 40% -> attained), 6 students score 2/10 (< 40% -> not attained) => 4/10 = 40%
    // Riya is student index 0, so Riya attains all 3!

    for (let i = 0; i < 10; i++) {
      const student = testStudents[i];

      // Q1 (CO1): 7 students >= 40%, 3 students < 40%
      const markCO1 = i < 7 ? 8 : 2;
      await StudentMarks.findOneAndUpdate(
        { student: student._id, question: q_co1._id },
        { course: dbmsCourse._id, assessment: cieAssessment._id, student: student._id, question: q_co1._id, marksObtained: markCO1 },
        { upsert: true }
      );

      // Q2 (CO2): 7 students >= 40%, 3 students < 40%
      const markCO2 = i < 7 ? 7 : 3;
      await StudentMarks.findOneAndUpdate(
        { student: student._id, question: q_co2._id },
        { course: dbmsCourse._id, assessment: cieAssessment._id, student: student._id, question: q_co2._id, marksObtained: markCO2 },
        { upsert: true }
      );

      // Q3 (CO3): 4 students >= 40%, 6 students < 40%
      const markCO3 = i < 4 ? 8 : 2;
      await StudentMarks.findOneAndUpdate(
        { student: student._id, question: q_co3._id },
        { course: dbmsCourse._id, assessment: cieAssessment._id, student: student._id, question: q_co3._id, marksObtained: markCO3 },
        { upsert: true }
      );
    }
  });

  afterAll(async () => {
    if (dbmsCourse) {
      await StudentMarks.deleteMany({ course: dbmsCourse._id });
      await CourseEnrollment.deleteMany({ course: dbmsCourse._id });
      await Question.deleteMany({ course: dbmsCourse._id });
      await Assessment.deleteMany({ course: dbmsCourse._id });
      await CourseOutcome.deleteMany({ course: dbmsCourse._id });
      await Course.findByIdAndDelete(dbmsCourse._id);
    }
    if (courseB) {
      await Course.findByIdAndDelete(courseB._id);
    }
  });

  // ─── 1. Riya / DBMS Example Verification ───────────────────────────────────

  describe('Riya / DBMS Attainment Test (CO1=70%, CO2=70%, CO3=40%)', () => {
    it('Calculates exact class CO attainment: CO1=70%, CO2=70%, CO3=40%', async () => {
      const res = await request(app)
        .get(`/api/attainment?courseId=${dbmsCourse._id}&target=40`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cos = res.body.data.cos;
      expect(cos.length).toBe(3);

      const co1Res = cos.find((c) => c.code === 'CO1');
      const co2Res = cos.find((c) => c.code === 'CO2');
      const co3Res = cos.find((c) => c.code === 'CO3');

      // Exact values requested: CO1=70, CO2=70, CO3=40
      expect(co1Res.classAttainment).toBe(70);
      expect(co2Res.classAttainment).toBe(70);
      expect(co3Res.classAttainment).toBe(40);

      // Coverage text returns "x of y evaluated"
      expect(co1Res.evaluatedText).toBe('10 of 10 evaluated');
      expect(co2Res.evaluatedText).toBe('10 of 10 evaluated');
      expect(co3Res.evaluatedText).toBe('10 of 10 evaluated');

      // Check Riya student breakdown: attained on CO1 (80%), CO2 (70%), CO3 (80%)
      const riyaCO1 = co1Res.studentsBreakdown.find((s) => String(s.studentId) === String(riyaStudent._id));
      expect(riyaCO1).toBeDefined();
      expect(riyaCO1.marksObtained).toBe(8);
      expect(riyaCO1.percentage).toBe(80);
      expect(riyaCO1.isAttained).toBe(true);
    });

    it('Below-target COs highlighted with gap when target is raised to 50%', async () => {
      // With target=50%:
      // CO1: 70% >= 50% -> Attained
      // CO2: 70% >= 50% -> Attained
      // CO3: 40% < 50% -> Below Target (gap = 10%)
      const res = await request(app)
        .get(`/api/attainment?courseId=${dbmsCourse._id}&target=50`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.targetThreshold).toBe(50);
      expect(data.attainedCOsCount).toBe(2);
      expect(data.belowTargetCOsCount).toBe(1);

      const co3Res = data.cos.find((c) => c.code === 'CO3');
      expect(co3Res.status).toBe('Below Target');
      expect(co3Res.gap).toBe(10);

      expect(data.belowTargetCOs.length).toBe(1);
      expect(data.belowTargetCOs[0].code).toBe('CO3');
      expect(data.belowTargetCOs[0].gap).toBe(10);
    });
  });

  // ─── 2. Missing Marks / Unevaluated Student Case ───────────────────────────

  describe('Missing Marks / Unevaluated Student Case', () => {
    let absentStudent;

    beforeAll(async () => {
      // Create and enroll an 11th student with NO marks (absent / unevaluated)
      absentStudent = await User.findOneAndUpdate(
        { email: 'absent.student@obe.edu' },
        { name: 'Absent Student', email: 'absent.student@obe.edu', rollNo: '22IT999', role: 'student', isActive: true },
        { upsert: true, new: true }
      );

      await CourseEnrollment.create({
        course: dbmsCourse._id,
        student: absentStudent._id,
        status: 'active',
      });
    });

    afterAll(async () => {
      if (absentStudent) {
        await CourseEnrollment.deleteOne({ course: dbmsCourse._id, student: absentStudent._id });
        await User.findByIdAndDelete(absentStudent._id);
      }
    });

    it('Unevaluated student is excluded from class attainment (not zero) and returns "10 of 11 evaluated"', async () => {
      const res = await request(app)
        .get(`/api/attainment?courseId=${dbmsCourse._id}&target=40`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);

      const co1Res = res.body.data.cos.find((c) => c.code === 'CO1');

      // Evaluated text indicates 10 of 11 evaluated
      expect(co1Res.evaluatedText).toBe('10 of 11 evaluated');
      expect(co1Res.studentsEvaluated).toBe(10);

      // Class attainment remains EXACTLY 70% (7 attained out of 10 evaluated), NOT reduced by absent student
      expect(co1Res.classAttainment).toBe(70);

      // Absent student is flagged as isEvaluated = false
      const absentEntry = co1Res.studentsBreakdown.find((s) => String(s.studentId) === String(absentStudent._id));
      expect(absentEntry).toBeDefined();
      expect(absentEntry.isEvaluated).toBe(false);
      expect(absentEntry.marksObtained).toBeNull();
    });
  });

  // ─── 3. Faculty Reports & CSV Export ─────────────────────────────────────────

  describe('Faculty Reports & CSV Export', () => {
    it('Faculty Report endpoint returns course metadata, summary, and below-target review', async () => {
      const res = await request(app)
        .get(`/api/attainment/report?courseId=${dbmsCourse._id}&target=50`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course.code).toBe('DBMS-301');
      expect(res.body.data.course.name).toBe('Database Management Systems');
      expect(res.body.data.averageAttainment).toBe(60); // (70 + 70 + 40) / 3 = 60
      expect(res.body.data.overallStatus).toBe('Attained'); // 60 >= 50
    });

    it('CSV Export endpoint returns proper text/csv headers and formatted data', async () => {
      const res = await request(app)
        .get(`/api/attainment/export?courseId=${dbmsCourse._id}&target=40`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('COURSE ATTAINMENT REPORT');
      expect(res.text).toContain('DBMS-301');
      expect(res.text).toContain('CLASS-WISE COURSE OUTCOMES ATTAINMENT');
      expect(res.text).toContain('CO1');
      expect(res.text).toContain('CO2');
      expect(res.text).toContain('CO3');
      expect(res.text).toContain('STUDENT-WISE CO ATTAINMENT MATRIX');
      expect(res.text).toContain('Riya Sharma');
    });

    it('Faculty A CANNOT access Faculty B course attainment report (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/attainment?courseId=${courseB._id}&target=40`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Missing token returns 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/attainment?courseId=${dbmsCourse._id}`);
      expect(res.status).toBe(401);
    });
  });
});
