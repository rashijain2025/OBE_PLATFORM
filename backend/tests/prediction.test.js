process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const predictionService = require('../services/predictionService');
const {
  User,
  Department,
  Programme,
  Course,
  CourseOutcome,
  Assessment,
  Question,
  CourseEnrollment,
  StudentMarks,
} = require('../models');

describe('Phase 7 ML Prediction Layer Tests', () => {
  let facultyAToken, facultyBToken, adminToken;
  let facultyAId, facultyBId;
  let testCourseA, testCourseB;
  let co1, co2;
  let quiz1, midExam, endSem;
  let q_quiz1, q_mid1, q_mid2, q_endsem;
  let student1, student2;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    // 1. Log in seeded users
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
    await Course.deleteMany({ code: { $in: ['MLTEST-101', 'MLTEST-102'] } });

    // 3. Create Course A for Faculty A and Course B for Faculty B
    testCourseA = await Course.create({
      code: 'MLTEST-101',
      name: 'Machine Learning Analytics',
      semester: 6,
      programme: programme._id,
      faculty: facultyAId,
      academicYear: '2025-2026',
      credits: 4,
    });

    testCourseB = await Course.create({
      code: 'MLTEST-102',
      name: 'Operating Systems',
      semester: 4,
      programme: programme._id,
      faculty: facultyBId,
      academicYear: '2025-2026',
      credits: 4,
    });

    // 4. Create COs on Course A
    co1 = await CourseOutcome.create({
      course: testCourseA._id,
      code: 'CO1',
      statement: 'Understand regression and classification algorithms',
      targetMarksPercentage: 40,
    });
    co2 = await CourseOutcome.create({
      course: testCourseA._id,
      code: 'CO2',
      statement: 'Evaluate decision trees and model generalization',
      targetMarksPercentage: 40,
    });

    // 5. Create Assessments on Course A:
    // - quiz1 (early, date: Day 1, maxMarks: 10)
    // - midExam (early, date: Day 10, maxMarks: 20)
    // - endSem (final, date: Day 30, maxMarks: 50) -> should be excluded from early features!
    quiz1 = await Assessment.create({
      name: 'Quiz 1',
      type: 'quiz',
      maxMarks: 10,
      course: testCourseA._id,
      date: new Date('2026-02-01'),
    });

    midExam = await Assessment.create({
      name: 'Mid-Term Exam',
      type: 'internal',
      maxMarks: 20,
      course: testCourseA._id,
      date: new Date('2026-03-01'),
    });

    endSem = await Assessment.create({
      name: 'End Semester Examination',
      type: 'end_sem',
      maxMarks: 50,
      course: testCourseA._id,
      date: new Date('2026-05-01'),
    });

    // 6. Create Questions:
    // Quiz 1: Q1 mapped to CO1 (max: 10)
    q_quiz1 = await Question.create({
      assessment: quiz1._id,
      course: testCourseA._id,
      label: 'Q1',
      maxMarks: 10,
      co: co1._id,
    });

    // Mid Exam: Q1 mapped to CO1 (max: 10), Q2 mapped to CO2 (max: 10)
    q_mid1 = await Question.create({
      assessment: midExam._id,
      course: testCourseA._id,
      label: 'Q1',
      maxMarks: 10,
      co: co1._id,
    });

    q_mid2 = await Question.create({
      assessment: midExam._id,
      course: testCourseA._id,
      label: 'Q2',
      maxMarks: 10,
      co: co2._id,
    });

    // End Sem: Q1 mapped to CO1 (max: 50)
    q_endsem = await Question.create({
      assessment: endSem._id,
      course: testCourseA._id,
      label: 'Q1',
      maxMarks: 50,
      co: co1._id,
    });

    // 7. Enroll 2 students
    const students = await User.find({ role: 'student' }).limit(2);
    student1 = students[0];
    student2 = students[1];

    await CourseEnrollment.create([
      { course: testCourseA._id, student: student1._id, status: 'active' },
      { course: testCourseA._id, student: student2._id, status: 'active' },
    ]);

    // 8. Assign deterministic marks for Hand-Checked Example:
    // Student 1:
    //   Quiz 1 (CO1): 4/10 (40.0%)
    //   Mid Exam Q1 (CO1): 8/10 (80.0%)
    //   Mid Exam Q2 (CO2): 6/10 (60.0%)
    //   Mid Exam total score: (8+6)/20 = 70.0%
    //   Quiz 1 total score: 4/10 = 40.0%
    //   Trend for Student 1 = 70.0% - 40.0% = +30.0%
    //   Overall early pct = (4 + 8 + 6) / (10 + 10 + 10) = 18 / 30 = 60.0%
    //   CO1 early score = (4 + 8) / (10 + 10) = 12 / 20 = 60.0%, num_eval_questions = 2
    //   CO2 early score = 6 / 10 = 60.0%, num_eval_questions = 1
    //
    // Student 2:
    //   Quiz 1 (CO1): 2/10 (20.0%)
    //   Mid Exam Q1 (CO1): 1/10 (10.0%)
    //   Mid Exam Q2 (CO2): 2/10 (20.0%)
    //   Mid Exam total score: 3/20 = 15.0%
    //   Trend for Student 2 = 15.0% - 20.0% = -5.0%
    //   Overall early pct = (2 + 1 + 2) / 30 = 5 / 30 = 16.7%
    //   CO1 early score = 3 / 20 = 15.0%, num_eval_questions = 2
    //   CO2 early score = 2 / 10 = 20.0%, num_eval_questions = 1

    await StudentMarks.create([
      // Student 1
      { student: student1._id, course: testCourseA._id, assessment: quiz1._id, question: q_quiz1._id, marksObtained: 4, evaluatedBy: facultyAId },
      { student: student1._id, course: testCourseA._id, assessment: midExam._id, question: q_mid1._id, marksObtained: 8, evaluatedBy: facultyAId },
      { student: student1._id, course: testCourseA._id, assessment: midExam._id, question: q_mid2._id, marksObtained: 6, evaluatedBy: facultyAId },
      // End sem mark (should NOT be used for early features)
      { student: student1._id, course: testCourseA._id, assessment: endSem._id, question: q_endsem._id, marksObtained: 45, evaluatedBy: facultyAId },

      // Student 2
      { student: student2._id, course: testCourseA._id, assessment: quiz1._id, question: q_quiz1._id, marksObtained: 2, evaluatedBy: facultyAId },
      { student: student2._id, course: testCourseA._id, assessment: midExam._id, question: q_mid1._id, marksObtained: 1, evaluatedBy: facultyAId },
      { student: student2._id, course: testCourseA._id, assessment: midExam._id, question: q_mid2._id, marksObtained: 2, evaluatedBy: facultyAId },
    ]);
  });

  afterAll(async () => {
    await Course.deleteMany({ code: { $in: ['MLTEST-101', 'MLTEST-102'] } });
  });

  // TEST 1: Feature Building Hand-Checked Verification
  test('1. Feature building calculates exact hand-checked features per (student, CO)', async () => {
    const features = await predictionService.extractCourseFeatures(testCourseA._id, 40);

    expect(features.instances.length).toBe(4); // 2 students * 2 COs

    // Student 1 on CO1
    const s1_co1 = features.instances.find(
      (i) => i.student_id === String(student1._id) && i.co_code === 'CO1'
    );
    expect(s1_co1).toBeDefined();
    // Hand calculation: (4 + 8) / (10 + 10) = 12/20 = 60.0%
    expect(s1_co1.early_co_pct).toBe(60.0);
    expect(s1_co1.num_eval_questions).toBe(2);
    // Hand calculation: (4 + 8 + 6) / 30 = 18/30 = 60.0%
    expect(s1_co1.overall_early_pct).toBe(60.0);
    // Hand calculation: Mid Exam (70%) - Quiz 1 (40%) = +30.0%
    expect(s1_co1.trend).toBe(30.0);

    // Student 2 on CO1
    const s2_co1 = features.instances.find(
      (i) => i.student_id === String(student2._id) && i.co_code === 'CO1'
    );
    expect(s2_co1).toBeDefined();
    // Hand calculation: (2 + 1) / (10 + 10) = 3/20 = 15.0%
    expect(s2_co1.early_co_pct).toBe(15.0);
    expect(s2_co1.num_eval_questions).toBe(2);
    // Hand calculation: (2 + 1 + 2) / 30 = 5/30 = 16.7%
    expect(s2_co1.overall_early_pct).toBe(16.7);
    // Hand calculation: Mid Exam (15%) - Quiz 1 (20%) = -5.0%
    expect(s2_co1.trend).toBe(-5.0);
  });

  // TEST 2: ML Prediction Service Contract & Risk Categorization
  test('2. ML prediction contract returns attainment probability, risk level, and top features', async () => {
    const res = await request(app)
      .get(`/api/courses/${testCourseA._id}/predictions?target=40`)
      .set('Authorization', `Bearer ${facultyAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.mlServiceOnline).toBe(true);
    expect(data.classSummary.length).toBe(2);

    // Verify prediction contract fields
    const s1_pred = data.allPredictions.find(
      (p) => p.student_id === String(student1._id) && p.co_code === 'CO1'
    );
    expect(s1_pred).toBeDefined();
    expect(typeof s1_pred.attainment_probability).toBe('number');
    expect(['low', 'medium', 'high']).toContain(s1_pred.risk_level);
    expect(Array.isArray(s1_pred.top_features)).toBe(true);
    expect(s1_pred.top_features.length).toBeGreaterThanOrEqual(1);

    // Student 2 with low scores should have lower probability and higher risk than Student 1
    const s2_pred = data.allPredictions.find(
      (p) => p.student_id === String(student2._id) && p.co_code === 'CO1'
    );
    expect(s2_pred).toBeDefined();
    expect(s2_pred.attainment_probability).toBeLessThan(s1_pred.attainment_probability);
    expect(s2_pred.risk_level).toBe('high');

    // Check suggested action is present
    expect(typeof data.suggestedAction).toBe('string');
    expect(data.suggestedAction.length).toBeGreaterThan(10);
  });

  // TEST 3: Course Ownership Isolation
  test('3. Faculty A cannot access predictions for Faculty B course (403 Forbidden)', async () => {
    // Faculty A requesting predictions for Course B (owned by Faculty B)
    const res = await request(app)
      .get(`/api/courses/${testCourseB._id}/predictions`)
      .set('Authorization', `Bearer ${facultyAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  // TEST 4: Admin-Only Model Training Route
  test('4. POST /api/ml/train is restricted to admin (faculty receives 403)', async () => {
    // Faculty trying to train model
    const facultyRes = await request(app)
      .post('/api/ml/train')
      .set('Authorization', `Bearer ${facultyAToken}`);
    expect(facultyRes.status).toBe(403);

    // Admin can access
    const adminRes = await request(app)
      .post('/api/ml/train')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.metrics).toBeDefined();
    expect(adminRes.body.data.metrics.f1).toBeGreaterThan(0.7);
  });

  // TEST 5: GET /api/ml/model-info returns performance metrics and data source
  test('5. GET /api/ml/model-info returns algorithm metrics and data source', async () => {
    const res = await request(app)
      .get('/api/ml/model-info')
      .set('Authorization', `Bearer ${facultyAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.algorithm).toBeDefined();
    expect(res.body.data.metrics.accuracy).toBeGreaterThan(0.7);
    expect(res.body.data.data_source).toMatch(/Synthetic/i);
  });

  // TEST 6: Graceful Degradation when ML Service is Down
  test('6. Graceful behavior when ML service is offline (returns mlServiceOnline: false without crashing)', async () => {
    // Point temporarily to an invalid port
    const originalUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = 'http://localhost:9999';

    try {
      const res = await request(app)
        .get(`/api/courses/${testCourseA._id}/predictions`)
        .set('Authorization', `Bearer ${facultyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mlServiceOnline).toBe(false);
      expect(res.body.data.predictions).toBeNull();
      expect(res.body.data.message).toMatch(/unavailable/i);
    } finally {
      process.env.ML_SERVICE_URL = originalUrl || 'http://localhost:8000';
    }
  });
});
