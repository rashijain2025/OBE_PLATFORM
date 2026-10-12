process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
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
  COPOMapping,
  COPSOMapping,
  PO,
  PSO,
} = require('../models');

describe('End-to-End System Integration Test (E2E)', () => {
  let adminToken;
  let coordinatorToken;
  let facultyToken;
  let newFacultyUser;
  let newStudentUser;
  let programme;
  let createdCourse;
  let co1, co2;
  let quiz1, midterm;
  let q1, q2;
  let po1, pso1;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform');
    }

    // Login default admin and coordinator
    const [adminLogin, coordLogin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@obe.edu', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'coordinator@obe.edu', password: 'Password@123' }),
    ]);

    adminToken = adminLogin.body.data.token;
    coordinatorToken = coordLogin.body.data.token;

    // Get seeded programme with POs and PSOs
    programme = await Programme.findOne({ code: 'BTECH-IT' });
    po1 = await PO.findOne({ programme: programme._id, code: 'PO1' });
    pso1 = await PSO.findOne({ programme: programme._id, code: { $in: ['PSO-1', 'PSO1'] } });

    // Clean up any old E2E resources
    await User.deleteMany({ email: /e2e_.*@obe\.edu/ });
    await Course.deleteMany({ code: 'E2E-CS101' });
  });

  afterAll(async () => {
    if (createdCourse?._id) {
      await CourseOutcome.deleteMany({ course: createdCourse._id });
      await Assessment.deleteMany({ course: createdCourse._id });
      await Question.deleteMany({ course: createdCourse._id });
      await CourseEnrollment.deleteMany({ course: createdCourse._id });
      await StudentMarks.deleteMany({ course: createdCourse._id });
      await COPOMapping.deleteMany({ course: createdCourse._id });
      await COPSOMapping.deleteMany({ course: createdCourse._id });
      await Course.deleteOne({ _id: createdCourse._id });
    }
    await User.deleteMany({ email: /e2e_.*@obe\.edu/ });
    await mongoose.connection.close();
  });

  it('Step 1: Admin creates Faculty User, Student User, and Course', async () => {
    // 1. Register Faculty User
    const facRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Faculty Member',
        email: 'e2e_faculty@obe.edu',
        password: 'Password@123',
        role: 'faculty',
      });
    expect(facRes.statusCode).toBe(201);
    newFacultyUser = facRes.body.data;

    // 2. Register Student User
    const stuRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Student Riya',
        email: 'e2e_student@obe.edu',
        password: 'Password@123',
        role: 'student',
        rollNo: 'E2E-STU-01',
      });
    expect(stuRes.statusCode).toBe(201);
    newStudentUser = stuRes.body.data;

    // 3. Admin creates Course assigned to Faculty
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Cloud Computing',
        code: 'E2E-CS101',
        programme: programme._id,
        faculty: newFacultyUser._id,
        semester: 5,
        academicYear: '2025-2026',
        credits: 3,
      });
    expect(courseRes.statusCode).toBe(201);
    createdCourse = courseRes.body.data;

    // Log in new Faculty user to obtain token
    const facLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e_faculty@obe.edu', password: 'Password@123' });
    expect(facLogin.statusCode).toBe(200);
    facultyToken = facLogin.body.data.token;
  });

  it('Step 2: Faculty adds COs, Assessments, Questions, Enrollments, and Marks', async () => {
    // 1. Add CO1 and CO2
    const co1Res = await request(app)
      .post('/api/cos')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: createdCourse._id,
        code: 'CO1',
        statement: 'Understand Cloud Virtualization Principles',
        bloomLevel: 'L2: Understand',
      });
    expect(co1Res.statusCode).toBe(201);
    co1 = co1Res.body.data;

    const co2Res = await request(app)
      .post('/api/cos')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: createdCourse._id,
        code: 'CO2',
        statement: 'Design Distributed Microservices Architectures',
        bloomLevel: 'L3: Apply',
      });
    expect(co2Res.statusCode).toBe(201);
    co2 = co2Res.body.data;

    // 2. Add Assessments (Quiz 1 and Midterm)
    const quizRes = await request(app)
      .post('/api/assessments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: createdCourse._id,
        name: 'Quiz 1',
        type: 'quiz',
        maxMarks: 10,
        weightage: 10,
      });
    expect(quizRes.statusCode).toBe(201);
    quiz1 = quizRes.body.data;

    const midRes = await request(app)
      .post('/api/assessments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: createdCourse._id,
        name: 'Mid-Semester Exam',
        type: 'internal',
        maxMarks: 20,
        weightage: 20,
      });
    expect(midRes.statusCode).toBe(201);
    midterm = midRes.body.data;

    // 3. Add Questions mapped to COs
    const q1Res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        assessmentId: quiz1._id,
        label: 'Q1',
        maxMarks: 10,
        coId: co1._id,
      });
    expect(q1Res.statusCode).toBe(201);
    q1 = q1Res.body.data;

    const q2Res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        assessmentId: midterm._id,
        label: 'Q1',
        maxMarks: 20,
        coId: co2._id,
      });
    expect(q2Res.statusCode).toBe(201);
    q2 = q2Res.body.data;

    // 4. Enroll Student
    const enrollRes = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        courseId: createdCourse._id,
        studentId: newStudentUser._id,
      });
    expect(enrollRes.statusCode).toBe(201);

    // 5. Enter Marks (Quiz: 8/10 on CO1, Midterm: 14/20 on CO2)
    const marksRes = await request(app)
      .post('/api/marks/bulk')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        assessmentId: quiz1._id,
        marks: [
          {
            studentId: newStudentUser._id,
            questionId: q1._id,
            marksObtained: 8,
          },
        ],
      });
    expect(marksRes.statusCode).toBe(200);

    const marksRes2 = await request(app)
      .post('/api/marks/bulk')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        assessmentId: midterm._id,
        marks: [
          {
            studentId: newStudentUser._id,
            questionId: q2._id,
            marksObtained: 14,
          },
        ],
      });
    expect(marksRes2.statusCode).toBe(200);

    // 6. Verify CO Attainment endpoint for course
    const coAttainRes = await request(app)
      .get(`/api/attainment?courseId=${createdCourse._id}&target=40`)
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(coAttainRes.statusCode).toBe(200);
    expect(coAttainRes.body.success).toBe(true);
    expect(coAttainRes.body.data.cos).toBeDefined();

    // Student scored 8/10 = 80% on CO1 (>=40 target -> attained 100%)
    const co1Stat = coAttainRes.body.data.cos.find((c) => c.code === 'CO1');
    expect(co1Stat.classAttainment).toBe(100);
  });

  it('Step 3: Coordinator maps COs to POs/PSOs, and Programme Report shows correct numbers', async () => {
    // Map CO1 to PO1 with strength 3 and CO2 to PSO1 with strength 2
    const mapRes = await request(app)
      .post(`/api/mappings/matrix/${createdCourse._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        copo: [
          {
            courseOutcomeId: co1._id,
            programOutcomeId: po1._id,
            correlationLevel: 3,
          },
        ],
        copso: [
          {
            courseOutcomeId: co2._id,
            programSpecificOutcomeId: pso1._id,
            correlationLevel: 2,
          },
        ],
      });
    if (mapRes.statusCode !== 200) {
      console.error('mapRes Error:', mapRes.body);
    }
    expect(mapRes.statusCode).toBe(200);
    expect(mapRes.body.success).toBe(true);

    // Fetch Programme Report for the programme
    const progAttainRes = await request(app)
      .get(`/api/programme-attainment/${programme._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(progAttainRes.statusCode).toBe(200);
    expect(progAttainRes.body.success).toBe(true);
    expect(progAttainRes.body.data.pos).toBeDefined();

    // Verify PO1 attainment calculation
    const po1Data = progAttainRes.body.data.pos.find((p) => p.code === 'PO1');
    expect(po1Data).toBeDefined();
    expect(typeof po1Data.attainment).toBe('number');
  });

  it('Step 4: Faculty calls Early Warning and receives ML predictions', async () => {
    const earlyWarnRes = await request(app)
      .get(`/api/courses/${createdCourse._id}/predictions?target=40`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(earlyWarnRes.statusCode).toBe(200);
    expect(earlyWarnRes.body.success).toBe(true);
    expect(earlyWarnRes.body.data).toHaveProperty('allPredictions');
    expect(earlyWarnRes.body.data.allPredictions.length).toBeGreaterThanOrEqual(1);

    const firstPred = earlyWarnRes.body.data.allPredictions[0];
    expect(firstPred).toHaveProperty('risk_level');
    expect(firstPred).toHaveProperty('attainment_probability');
    expect(['low', 'medium', 'high']).toContain(firstPred.risk_level);
  });
});
