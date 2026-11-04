process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User, Department, Programme, Course, CourseOutcome, Assessment, Question } = require('../models');

describe('Phase 3 Faculty Course Setup Tests', () => {
  let facultyAToken, facultyBToken, adminToken, studentToken;
  let facultyAId, facultyBId;
  let courseA, courseB;
  let coA1, coA2, coB1;
  let assessmentA1;

  beforeAll(async () => {
    // Wait for DB connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    // 1. Get tokens
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

    // 2. Find or create programme for test courses
    let programme = await Programme.findOne({ code: 'BTECH-IT' });
    if (!programme) {
      let dept = await Department.findOne({ code: 'IT' });
      if (!dept) {
        dept = await Department.create({ name: 'Information Technology', code: 'IT' });
      }
      programme = await Programme.create({ name: 'B.Tech IT', code: 'BTECH-IT', department: dept._id });
    }

    // 3. Clean up any existing test courses
    await Question.deleteMany({ label: { $in: ['Q1', 'Q2', 'Q3', 'Q_CROSS'] } });
    await Assessment.deleteMany({ name: { $in: ['CIE-1 Test', 'CIE-2 Test'] } });
    await CourseOutcome.deleteMany({ code: { $in: ['CO1', 'CO2', 'CO3', 'CO_B1'] } });
    await Course.deleteMany({ code: { $in: ['TEST-CS101', 'TEST-CS202'] } });

    // 4. Create Course A (assigned to Faculty A) and Course B (assigned to Faculty B)
    courseA = await Course.create({
      code: 'TEST-CS101',
      name: 'Data Structures & Algorithms',
      semester: 3,
      programme: programme._id,
      faculty: facultyAId,
      academicYear: '2025-2026',
      credits: 4,
    });

    courseB = await Course.create({
      code: 'TEST-CS202',
      name: 'Database Management Systems',
      semester: 4,
      programme: programme._id,
      faculty: facultyBId,
      academicYear: '2025-2026',
      credits: 4,
    });

    // 5. Seed CO on Course B
    coB1 = await CourseOutcome.create({
      course: courseB._id,
      code: 'CO_B1',
      statement: 'Understand relational database concepts',
      targetMarksPercentage: 60,
      targetAttainmentPercentage: 70,
      bloomLevel: 'L2: Understand',
    });
  });

  afterAll(async () => {
    // Clean up created resources
    if (courseA) {
      await Question.deleteMany({ course: courseA._id });
      await Assessment.deleteMany({ course: courseA._id });
      await CourseOutcome.deleteMany({ course: courseA._id });
      await Course.findByIdAndDelete(courseA._id);
    }
    if (courseB) {
      await Question.deleteMany({ course: courseB._id });
      await Assessment.deleteMany({ course: courseB._id });
      await CourseOutcome.deleteMany({ course: courseB._id });
      await Course.findByIdAndDelete(courseB._id);
    }
  });

  // ─── 1. Course Access & Ownership Checks ───────────────────────────────────

  describe('Course Access & Scoping', () => {
    it('Faculty A can view their own course', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseA._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(String(courseA._id));
    });

    it('Faculty A CANNOT access Faculty B course (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseB._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not the assigned faculty/i);
    });

    it('Faculty A CANNOT access Faculty B course details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseB._id}/details`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Faculty A can access their own course details', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseA._id}/details`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.course._id).toBe(String(courseA._id));
      expect(Array.isArray(res.body.data.cos)).toBe(true);
      expect(Array.isArray(res.body.data.assessments)).toBe(true);
    });
  });

  // ─── 2. Course Outcomes (CO) CRUD ───────────────────────────────────────────

  describe('Course Outcomes (CO) Management', () => {
    it('Faculty A CANNOT create CO on Faculty B course (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/cos')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseB._id,
          code: 'CO1',
          statement: 'Attempted hack on Course B',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects CO codes beyond CO5 (max 5 COs per course)', async () => {
      const res = await request(app)
        .post('/api/cos')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ courseId: courseA._id, code: 'CO6', statement: 'One CO too many' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at most 5/);
    });

    it('Faculty A can create COs for Course A', async () => {
      const res1 = await request(app)
        .post('/api/cos')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseA._id,
          code: 'CO1',
          statement: 'Understand basic data structures and asymptotic notations',
          bloomLevel: 'L2: Understand',
          targetMarksPercentage: 65,
          targetAttainmentPercentage: 75,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.code).toBe('CO1');
      coA1 = res1.body.data;

      const res2 = await request(app)
        .post('/api/cos')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseA._id,
          code: 'CO2',
          statement: 'Implement non-linear data structures like trees and graphs',
          bloomLevel: 'L3: Apply',
        });

      expect(res2.status).toBe(201);
      coA2 = res2.body.data;
    });

    it('Rejects duplicate CO code in the same course (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/cos')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseA._id,
          code: 'CO1',
          statement: 'Duplicate CO1 attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('Faculty A can list COs for Course A', async () => {
      const res = await request(app)
        .get(`/api/cos?courseId=${courseA._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].code).toBe('CO1');
    });

    it('Faculty A CANNOT list COs for Course B (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/cos?courseId=${courseB._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(403);
    });

    it('Faculty A can update their own CO', async () => {
      const res = await request(app)
        .put(`/api/cos/${coA1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          statement: 'Updated: Master data structures and algorithm analysis',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.statement).toMatch(/Master data structures/);
    });
  });

  // ─── 3. Assessment Management ──────────────────────────────────────────────

  describe('Assessment Management', () => {
    it('Faculty A CANNOT create assessment on Faculty B course (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseB._id,
          name: 'CIE-1 Hack',
          type: 'internal',
          maxMarks: 50,
        });

      expect(res.status).toBe(403);
    });

    it('Faculty A can create assessment on Course A', async () => {
      const res = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseA._id,
          name: 'CIE-1 Test',
          type: 'internal',
          maxMarks: 30,
          weightage: 1.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxMarks).toBe(30);
      expect(res.body.data.warning).toBeNull();
      assessmentA1 = res.body.data;
    });

    it('Faculty A can list assessments for Course A', async () => {
      const res = await request(app)
        .get(`/api/assessments?courseId=${courseA._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('CIE-1 Test');
    });
  });

  // ─── 4. Questions & Question→CO Mapping ─────────────────────────────────────

  describe('Question Creation & Question→CO Mapping', () => {
    it('CROSS-COURSE MAPPING REJECTED: cannot map Course A Question to Course B CO (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          label: 'Q_CROSS',
          maxMarks: 10,
          coId: coB1._id, // CO belonging to Course B!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cross-course mapping rejected: Course Outcome does not belong to this course');
    });

    it('Question creation with marks mismatch creates question with warning', async () => {
      // Assessment maxMarks is 30. We add Q1 with maxMarks: 10. (sum 10 != 30)
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          label: 'Q1',
          maxMarks: 10,
          coId: coA1._id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Q1');
      expect(res.body.totalMarks).toBe(10);
      expect(res.body.maxMarks).toBe(30);
      expect(res.body.warning).toBe('Question marks sum (10) does not match assessment max marks (30)');
    });

    it('Adding more questions until sum == maxMarks clears the warning', async () => {
      // Add Q2 with maxMarks: 20 -> sum is 10 + 20 = 30 == 30
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          label: 'Q2',
          maxMarks: 20,
          coId: coA2._id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.totalMarks).toBe(30);
      expect(res.body.warning).toBeNull();
    });

    it('Faculty A cannot delete a CO mapped to active questions (400 Bad Request)', async () => {
      const res = await request(app)
        .delete(`/api/cos/${coA1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/mapped to it/i);
    });

    it('List questions returns questions populated with mapped CO and warning status', async () => {
      const res = await request(app)
        .get(`/api/questions?assessmentId=${assessmentA1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.totalMarks).toBe(30);
      expect(res.body.warning).toBeNull();
      expect(res.body.data[0].co.code).toBeDefined();
      expect(res.body.data[0].cos.length).toBeGreaterThanOrEqual(1);
    });

    it('A question can be mapped to several COs at once', async () => {
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ assessmentId: assessmentA1._id, label: 'Q_MULTI', maxMarks: 5, coIds: [coA1._id, coA2._id] });

      expect(res.status).toBe(201);
      expect(res.body.data.cos.map((c) => c.code).sort()).toEqual(['CO1', 'CO2']);
      expect(res.body.data.co.code).toBe('CO1');
    });

    it('Saving a paper keeps several ticked COs per question and rejects none ticked', async () => {
      const list = await request(app)
        .get(`/api/questions?assessmentId=${assessmentA1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);
      const rows = list.body.data.map((q) => ({
        _id: q._id,
        label: q.label,
        maxMarks: q.maxMarks,
        coIds: q.label === 'Q_MULTI' ? [coA1._id, coA2._id] : q.cos.map((c) => c._id),
      }));

      const ok = await request(app)
        .put('/api/questions/paper')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ assessmentId: assessmentA1._id, questions: rows });
      expect(ok.status).toBe(200);
      const multi = ok.body.data.questions.find((q) => q.label === 'Q_MULTI');
      expect(multi.cos.map((c) => c.code).sort()).toEqual(['CO1', 'CO2']);

      const bad = await request(app)
        .put('/api/questions/paper')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ assessmentId: assessmentA1._id, questions: rows.map((r) => (r.label === 'Q_MULTI' ? { ...r, coIds: [] } : r)) });
      expect(bad.status).toBe(400);
      expect(bad.body.message).toMatch(/tick at least one CO/);

      // Clean up so later counts in this suite are unchanged
      await Question.deleteOne({ assessment: assessmentA1._id, label: 'Q_MULTI' });
    });
  });

  // ─── 5. Faculty Dashboard ───────────────────────────────────────────────────

  describe('Faculty Dashboard Stats', () => {
    it('Returns real counts for faculty (myCourses, myStudents, myCOs, myAssessments, myQuestions)', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('faculty');
      expect(res.body.data.stats.myCourses).toBeGreaterThanOrEqual(1);
      expect(res.body.data.stats.myCOs).toBeGreaterThanOrEqual(2);
      expect(res.body.data.stats.myAssessments).toBeGreaterThanOrEqual(1);
      expect(res.body.data.stats.myQuestions).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── 6. Role & Auth Guards ──────────────────────────────────────────────────

  describe('Auth Guards', () => {
    it('Returns 401 Unauthorized when missing token', async () => {
      const res = await request(app).get(`/api/courses/${courseA._id}/details`);
      expect(res.status).toBe(401);
    });

    it('Student accounts cannot log in (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'aarav.patel@student.obe.edu',
          password: 'Password@123',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Student accounts cannot log in');
    });
  });
});
