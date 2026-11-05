process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User, Department, Programme, Course, CourseOutcome, Assessment, Question, CourseEnrollment, StudentMarks } = require('../models');

describe('Phase 4 Enrollment & Marks Validation Tests', () => {
  let facultyAToken, facultyBToken, adminToken, studentToken;
  let facultyAId, facultyBId;
  let student1, student2, nonEnrolledStudent;
  let courseA, courseB;
  let coA1;
  let assessmentA1, assessmentB1;
  let q1, q2, qB1;
  let enrollment1;

  beforeAll(async () => {
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

    // 2. Fetch or create test students
    student1 = await User.findOne({ rollNo: '22IT001' });
    student2 = await User.findOne({ rollNo: '22IT002' });
    nonEnrolledStudent = await User.findOne({ rollNo: '22IT003' });

    let programme = await Programme.findOne({ code: 'BTECH-IT' });
    if (!programme) {
      let dept = await Department.findOne({ code: 'IT' });
      if (!dept) {
        dept = await Department.create({ name: 'Information Technology', code: 'IT' });
      }
      programme = await Programme.create({ name: 'B.Tech IT', code: 'BTECH-IT', department: dept._id });
    }

    // 3. Clean up existing test courses
    await Course.deleteMany({ code: { $in: ['MARKS-CS101', 'MARKS-CS202'] } });

    // 4. Create Course A (Faculty A) and Course B (Faculty B)
    courseA = await Course.create({
      code: 'MARKS-CS101',
      name: 'Algorithm Design',
      semester: 5,
      programme: programme._id,
      faculty: facultyAId,
      academicYear: '2025-2026',
    });

    courseB = await Course.create({
      code: 'MARKS-CS202',
      name: 'Operating Systems',
      semester: 5,
      programme: programme._id,
      faculty: facultyBId,
      academicYear: '2025-2026',
    });

    // 5. Create CO on Course A
    coA1 = await CourseOutcome.create({
      course: courseA._id,
      code: 'CO1',
      statement: 'Analyze algorithmic complexity',
      bloomLevel: 'L4: Analyze',
    });

    // 6. Create Assessments
    assessmentA1 = await Assessment.create({
      course: courseA._id,
      name: 'Midterm Test',
      type: 'internal',
      maxMarks: 25,
      weightage: 1.0,
    });

    assessmentB1 = await Assessment.create({
      course: courseB._id,
      name: 'OS Lab Test',
      type: 'lab',
      maxMarks: 20,
    });

    // 7. Create Questions
    q1 = await Question.create({
      assessment: assessmentA1._id,
      course: courseA._id,
      label: 'Q1',
      maxMarks: 10,
      co: coA1._id,
    });

    q2 = await Question.create({
      assessment: assessmentA1._id,
      course: courseA._id,
      label: 'Q2',
      maxMarks: 15,
      co: coA1._id,
    });

    qB1 = await Question.create({
      assessment: assessmentB1._id,
      course: courseB._id,
      label: 'QB1',
      maxMarks: 20,
      co: coA1._id, // placeholder for question belonging to B
    });
  });

  afterAll(async () => {
    if (courseA) {
      await StudentMarks.deleteMany({ course: courseA._id });
      await CourseEnrollment.deleteMany({ course: courseA._id });
      await Question.deleteMany({ course: courseA._id });
      await Assessment.deleteMany({ course: courseA._id });
      await CourseOutcome.deleteMany({ course: courseA._id });
      await Course.findByIdAndDelete(courseA._id);
    }
    if (courseB) {
      await StudentMarks.deleteMany({ course: courseB._id });
      await CourseEnrollment.deleteMany({ course: courseB._id });
      await Question.deleteMany({ course: courseB._id });
      await Assessment.deleteMany({ course: courseB._id });
      await Course.findByIdAndDelete(courseB._id);
    }
  });

  // ─── 1. Enrollment Management & Duplicate Prevention ───────────────────────

  describe('Enrollment Management', () => {
    it('Faculty A can enroll student1 into Course A', async () => {
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ courseId: courseA._id, studentId: student1._id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.rollNo).toBe('22IT001');
      enrollment1 = res.body.data;
    });

    it('PREVENT DUPLICATES: Enrolling student1 again into Course A is rejected (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ courseId: courseA._id, studentId: student1._id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already enrolled/i);
    });

    it('Faculty A can bulk enroll student2 (no duplicates)', async () => {
      const res = await request(app)
        .post('/api/enrollments/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          courseId: courseA._id,
          rollNumbers: ['22IT001', '22IT002'], // 22IT001 is already enrolled
        });

      expect(res.status).toBe(201);
      expect(res.body.data.enrolled.length).toBe(1);
      expect(res.body.data.enrolled[0].rollNo).toBe('22IT002');
      expect(res.body.data.skipped.length).toBe(1);
      expect(res.body.data.skipped[0].rollNo).toBe('22IT001');
    });

    it('Faculty A CANNOT enroll students into Faculty B course (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ courseId: courseB._id, studentId: student1._id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Faculty A can list enrollments for Course A', async () => {
      const res = await request(app)
        .get(`/api/enrollments?courseId=${courseA._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('Faculty A can remove an enrollment from Course A', async () => {
      const res = await request(app)
        .delete(`/api/enrollments/${enrollment1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      // Re-enroll student1 so we have students for marks tests
      await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ courseId: courseA._id, studentId: student1._id });
    });
  });

  // ─── 2. Marks Grid Retrieval ────────────────────────────────────────────────

  describe('Marks Grid Retrieval', () => {
    it('Faculty A can retrieve marks grid for Course A assessment', async () => {
      const res = await request(app)
        .get(`/api/marks?assessmentId=${assessmentA1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions.length).toBe(2);
      expect(res.body.data.students.length).toBe(2);
      expect(res.body.data.marks).toBeDefined();
    });

    it('Faculty A CANNOT access marks grid for Faculty B assessment (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/marks?assessmentId=${assessmentB1._id}`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. Marks Validation Rules (Bulk Save) ──────────────────────────────────

  describe('Marks Validation Rules', () => {
    it('VALIDATION 1: Reject marks if student is NOT enrolled in the course (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            {
              studentId: nonEnrolledStudent._id,
              questionId: q1._id,
              marksObtained: 8,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not enrolled in this course/i);
    });

    it('VALIDATION 2: Reject marks if question does NOT belong to this assessment (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            {
              studentId: student1._id,
              questionId: qB1._id, // Question from assessment B!
              marksObtained: 8,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/does not belong to this assessment/i);
    });

    it('VALIDATION 3: Reject marks if marks > question maxMarks (400 Bad Request)', async () => {
      // q1 maxMarks is 10. Attempting to enter 12.
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            {
              studentId: student1._id,
              questionId: q1._id,
              marksObtained: 12,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/between 0 and 10/i);
    });

    it('VALIDATION 4: Reject marks if marks < 0 (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            {
              studentId: student1._id,
              questionId: q1._id,
              marksObtained: -2,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/between 0 and 10/i);
    });

    it('VALIDATION 5: Empty marks stored as null (not evaluated)', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            {
              studentId: student1._id,
              questionId: q1._id,
              marksObtained: '', // empty = not evaluated
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const record = await StudentMarks.findOne({ student: student1._id, question: q1._id });
      expect(record.marksObtained).toBeNull();
    });

    it('VALIDATION 6: Bulk save valid marks successfully', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          marks: [
            { studentId: student1._id, questionId: q1._id, marksObtained: 9 },
            { studentId: student1._id, questionId: q2._id, marksObtained: 14 },
            { studentId: student2._id, questionId: q1._id, marksObtained: 8 },
            { studentId: student2._id, questionId: q2._id, marksObtained: 12 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const s1q1 = await StudentMarks.findOne({ student: student1._id, question: q1._id });
      expect(s1q1.marksObtained).toBe(9);

      const s1q2 = await StudentMarks.findOne({ student: student1._id, question: q2._id });
      expect(s1q2.marksObtained).toBe(14);
    });

    it('Faculty A CANNOT bulk save marks for Faculty B assessment (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/marks/bulk')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentB1._id,
          marks: [],
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── 4. CSV Import ──────────────────────────────────────────────────────────

  describe('CSV Import for Marks', () => {
    it('Imports marks from raw CSV text and applies valid marks', async () => {
      const csv = `RollNo,Q1,Q2\n22IT001,10,13\n22IT002,7,11`;

      const res = await request(app)
        .post('/api/marks/csv-import')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          csvText: csv,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // imported counts saved marks: 2 students × 2 questions
      expect(res.body.data.studentRows).toBe(2);
      expect(res.body.data.imported).toBe(4);

      const s1q1 = await StudentMarks.findOne({ student: student1._id, question: q1._id });
      expect(s1q1.marksObtained).toBe(10);
      const s1q2 = await StudentMarks.findOne({ student: student1._id, question: q2._id });
      expect(s1q2.marksObtained).toBe(13);
    });

    it('CSV import reports errors for non-enrolled students and invalid marks without crashing', async () => {
      const csv = `RollNo,Q1,Q2\n22IT999,5,10\n22IT001,99,10`; // 22IT999 doesn't exist, 99 exceeds maxMarks

      const res = await request(app)
        .post('/api/marks/csv-import')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          assessmentId: assessmentA1._id,
          csvText: csv,
        });

      expect(res.status).toBe(200);
      const problems = res.body.data.issues.map((i) => i.problem).join(' | ');
      expect(problems).toMatch(/Not enrolled/);
      expect(problems).toMatch(/not a valid mark/);
      // The valid Q2 mark of the enrolled student is still imported
      expect(res.body.data.imported).toBe(1);
    });

    it('CSV import dry run reports without saving anything', async () => {
      const csv = `RollNo,Q1,Q2\n22IT002,AB,12`;
      const before = await StudentMarks.findOne({ student: student2._id, question: q2._id });

      const res = await request(app)
        .post('/api/marks/csv-import')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ assessmentId: assessmentA1._id, csvText: csv, dryRun: true });

      expect(res.status).toBe(200);
      expect(res.body.data.dryRun).toBe(true);
      expect(res.body.data.cellsToImport).toBe(2);
      const after = await StudentMarks.findOne({ student: student2._id, question: q2._id });
      expect(after?.marksObtained ?? null).toBe(before?.marksObtained ?? null);
    });
  });
});
